import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { walletSession } from "@/server/auth";
import {
  database,
  requireOrigin,
  jsonBody,
  failure,
  HttpError,
} from "@/server/db";
import { bountyFromRow } from "@/server/bounties";
import { address } from "@solana/kit";
import { canAct, parseSOL, formatSOL } from "@/domain/bounty";
import { devnetRpc } from "@/chain/network";
import { escrowInstruction, bytesHex } from "@/chain/escrow";
const schema = z.object({
  action: z.enum([
    "fund",
    "claim",
    "submit",
    "revise",
    "reject",
    "approve",
    "cancel",
    "expire",
    "withdraw",
  ]),
  content: z.string().trim().max(20000).optional(),
});
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    requireOrigin(request);
    const actor = await walletSession();
    const { id } = await params;
    if (!z.uuid().safeParse(id).success)
      throw new HttpError(404, "Quest not found");
    const parsed = schema.safeParse(await jsonBody(request));
    if (!parsed.success) throw new HttpError(400, "Invalid action");
    const { action, content } = parsed.data;
    const program = process.env.NEXT_PUBLIC_ESCROW_PROGRAM_ID;
    if (!program)
      throw new HttpError(
        503,
        "Escrow program is not deployed yet. No funds will be moved.",
      );
    const sql = database();
    const rows = await sql`SELECT * FROM bounties WHERE id=${id}`;
    if (!rows[0]) throw new HttpError(404, "Quest not found");
    const b = bountyFromRow(rows[0]);
    if (
      action === "fund"
        ? b.status !== "draft" || b.requester !== actor
        : !canAct(b, action, actor, Math.floor(Date.now() / 1000))
    )
      throw new HttpError(
        403,
        "Action is unavailable for this wallet, state or deadline",
      );
    if (action === "claim") {
      const sameAccount =
        await sql`SELECT 1 FROM wallet_links requester JOIN wallet_links actor ON actor.user_id=requester.user_id WHERE requester.wallet=${b.requester} AND actor.wallet=${actor}`;
      if (sameAccount[0])
        throw new HttpError(
          403,
          "You cannot claim your own quest from another linked wallet",
        );
    }
    const pending =
      await sql`SELECT id FROM operations WHERE bounty_id=${id} AND actor=${actor} AND status IN ('waiting-wallet','submitting','confirming','unknown') ORDER BY created_at DESC LIMIT 1`;
    if (pending[0])
      throw new HttpError(
        409,
        `Check existing operation ${pending[0].id} before retrying`,
      );
    let hash: string | undefined;
    if (["submit", "revise", "reject"].includes(action)) {
      if (!content)
        throw new HttpError(400, "Add submission text or specific feedback");
      hash = createHash("sha256")
        .update(content.normalize("NFC").replace(/\r\n?/g, "\n"))
        .digest("hex");
    }
    const rpc = await devnetRpc(
      process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
    );
    if (action === "fund") {
      const [balance, rent] = await Promise.all([
        rpc.getBalance(address(actor), { commitment: "confirmed" }).send(),
        rpc.getMinimumBalanceForRentExemption(203n).send(),
      ]);
      const minimum = parseSOL(b.reward) + rent + 5000n;
      if (balance.value < minimum)
        throw new HttpError(
          400,
          `Your connected wallet has ${formatSOL(balance.value)} test SOL on Devnet. Funding needs at least ${formatSOL(minimum)} test SOL for the reward, escrow rent and network fee. Request Devnet SOL for ${actor} at faucet.solana.com.`,
        );
    }
    const { value: lifetime } = await rpc
      .getLatestBlockhash({ commitment: "finalized" })
      .send();
    const operationId = randomUUID();
    const instruction = await escrowInstruction(
      b,
      action,
      actor,
      hash,
      program,
    );
    const statements = [
      sql`INSERT INTO operations(id,bounty_id,actor,action,expected_data,expected_account,expected_blockhash,last_valid_block_height) VALUES(${operationId},${id},${actor},${action},${bytesHex(Uint8Array.from(instruction.data!))},${instruction.accounts![0].address},${lifetime.blockhash},${lifetime.lastValidBlockHeight.toString()})`,
    ];
    if (action === "submit")
      statements.push(
        sql`INSERT INTO submissions(id,bounty_id,worker,body,content_hash,revision) VALUES(${randomUUID()},${id},${actor},${content!},${hash!},${b.revisionUsed ? 1 : 0}) ON CONFLICT(bounty_id,revision) DO UPDATE SET body=EXCLUDED.body,content_hash=EXCLUDED.content_hash WHERE submissions.confirmed=false`,
      );
    if (action === "reject" || action === "revise")
      statements.push(
        sql`INSERT INTO reviews(id,bounty_id,requester,action,feedback,operation_id) VALUES(${randomUUID()},${id},${actor},${action},${content!},${operationId})`,
      );
    await sql.transaction(statements);
    return Response.json({
      operationId,
      lifetime: {
        blockhash: lifetime.blockhash,
        lastValidBlockHeight: lifetime.lastValidBlockHeight.toString(),
      },
      instruction: { ...instruction, data: Array.from(instruction.data!) },
    });
  } catch (e) {
    return failure(e);
  }
}
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await walletSession();
    const { id } = await params;
    if (!z.uuid().safeParse(id).success)
      throw new HttpError(404, "Quest not found");
    const operations =
      await database()`SELECT id,action,status,signature,created_at FROM operations WHERE bounty_id=${id} AND actor=${actor} ORDER BY created_at DESC LIMIT 20`;
    return Response.json({ operations });
  } catch (e) {
    return failure(e);
  }
}
