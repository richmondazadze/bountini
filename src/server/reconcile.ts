import {
  createSolanaRpc,
  address,
  signature,
  getBase58Encoder,
} from "@solana/kit";
import {
  bountyAddress,
  decodeBounty,
  discriminator,
  instructionNames,
  bytesHex,
} from "@/chain/escrow";
import { parseSOL } from "@/domain/bounty";
import { devnetRpc } from "@/chain/network";
import { database, HttpError } from "./db";
import { bountyFromRow } from "./bounties";
export async function reconcileOperation(id: string) {
  const sql = database();
  const ops =
    await sql`SELECT o.*, b.requester FROM operations o JOIN bounties b ON b.id=o.bounty_id WHERE o.id=${id}`;
  const op = ops[0];
  if (!op) throw new HttpError(404, "Operation not found");
  if (["confirmed", "failed", "rejected"].includes(op.status)) return op;
  const rows = await sql`SELECT * FROM bounties WHERE id=${op.bounty_id}`;
  const b = bountyFromRow(rows[0]);
  const program = process.env.NEXT_PUBLIC_ESCROW_PROGRAM_ID;
  if (!program) throw new HttpError(503, "Escrow is not deployed");
  const rpc = await devnetRpc(
    process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
  );
  if (!op.signature) {
    if (
      op.last_valid_block_height &&
      (await rpc.getBlockHeight({ commitment: "finalized" }).send()) >
        BigInt(op.last_valid_block_height)
    ) {
      await sql`UPDATE operations SET status='failed',error_code='BLOCKHASH_EXPIRED',updated_at=now() WHERE id=${id}`;
      return { ...op, status: "failed" };
    }
    return op;
  }
  const statuses = await rpc
    .getSignatureStatuses([signature(op.signature)], {
      searchTransactionHistory: true,
    })
    .send();
  const status = statuses.value[0];
  if (!status) {
    if (
      op.last_valid_block_height &&
      (await rpc.getBlockHeight({ commitment: "finalized" }).send()) >
        BigInt(op.last_valid_block_height)
    ) {
      await sql`UPDATE operations SET status='failed',error_code='BLOCKHASH_EXPIRED',updated_at=now() WHERE id=${id}`;
      return { ...op, status: "failed" };
    }
    await sql`UPDATE operations SET status='unknown',attempts=attempts+1,updated_at=now() WHERE id=${id}`;
    return { ...op, status: "unknown" };
  }
  if (status.err) {
    await sql`UPDATE operations SET status='failed',error_code='CHAIN_FAILURE',updated_at=now() WHERE id=${id}`;
    return { ...op, status: "failed" };
  }
  if (status.confirmationStatus !== "finalized")
    return { ...op, status: "confirming" };
  const pda = await bountyAddress(b, program);
  const tx = await rpc
    .getTransaction(signature(op.signature), {
      encoding: "json",
      commitment: "finalized",
      maxSupportedTransactionVersion: 0,
    })
    .send();
  if (!tx || tx.meta?.err)
    throw new HttpError(409, "Transaction is not finalized");
  const keys = tx.transaction.message.accountKeys;
  const actorIndex = keys.findIndex((k) => k === op.actor);
  const disc = await discriminator(
    "global",
    instructionNames[op.action as keyof typeof instructionNames],
  );
  const match = tx.transaction.message.instructions.some(
    (ix) =>
      keys[ix.programIdIndex] === program &&
      keys[ix.accounts[0]] === pda &&
      op.expected_account === pda &&
      bytesHex(Uint8Array.from(getBase58Encoder().encode(ix.data))) ===
        op.expected_data &&
      bytesHex(
        Uint8Array.from(getBase58Encoder().encode(ix.data)).slice(0, 8),
      ) === bytesHex(disc),
  );
  if (
    tx.transaction.message.recentBlockhash !== op.expected_blockhash ||
    actorIndex < 0 ||
    actorIndex >= tx.transaction.message.header.numRequiredSignatures ||
    !match
  )
    throw new HttpError(409, "Transaction does not match this operation");
  const account = await rpc
    .getAccountInfo(address(pda), {
      encoding: "base64",
      commitment: "finalized",
      minContextSlot: status.slot,
    })
    .send();
  if (!account.value || account.value.owner !== program)
    throw new HttpError(409, "Escrow account could not be verified");
  const chain = await decodeBounty(
    Buffer.from(account.value.data[0], "base64"),
  );
  if (
    chain.requester !== b.requester ||
    chain.id !== b.id.replaceAll("-", "") ||
    chain.requirementsHash !== b.requirementsHash ||
    chain.reward !== parseSOL(b.reward)
  )
    throw new HttpError(
      409,
      "Escrow agreement does not match the saved requirements",
    );
  await sql.transaction([
    sql`UPDATE bounties SET worker=${chain.worker},status=${chain.status},chain_address=${pda},deadline=${chain.deadline},revision_used=${chain.revisionUsed},signature=${op.signature},chain_slot=${account.context.slot.toString()},updated_at=now() WHERE id=${b.id} AND (chain_slot IS NULL OR chain_slot<=${account.context.slot.toString()}::numeric)`,
    sql`UPDATE operations SET status='confirmed',updated_at=now() WHERE id=${id}`,
    sql`UPDATE submissions SET confirmed=true WHERE bounty_id=${b.id} AND content_hash=${chain.submissionHash}`,
  ]);
  return { ...op, status: "confirmed" };
}
