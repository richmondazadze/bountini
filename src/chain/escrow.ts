import {
  address,
  AccountRole,
  getAddressEncoder,
  getAddressDecoder,
  getProgramDerivedAddress,
  type Instruction,
} from "@solana/kit";
import type { Bounty, BountyStatus } from "@/domain/bounty";
export const PROGRAM_ADDRESS = "DYf6RhzG8RLw3zhoa2C9RDXWkBJ2Qgss9Mnmarbk7fce";
export const instructionNames = {
  fund: "fund",
  claim: "claim",
  submit: "submit",
  revise: "request_revision",
  reject: "reject",
  approve: "approve",
  cancel: "cancel",
  expire: "expire",
  withdraw: "withdraw",
} as const;
export type ChainAction = keyof typeof instructionNames;
export function uuidBytes(id: string) {
  return Uint8Array.from(
    id
      .replaceAll("-", "")
      .match(/.{2}/g)!
      .map((v) => parseInt(v, 16)),
  );
}
export function hexBytes(hex: string) {
  if (!/^[0-9a-f]{64}$/.test(hex)) throw new Error("Invalid hash");
  return Uint8Array.from(hex.match(/.{2}/g)!.map((v) => parseInt(v, 16)));
}
export function bytesHex(bytes: Uint8Array) {
  return Array.from(bytes, (v) => v.toString(16).padStart(2, "0")).join("");
}
export async function discriminator(namespace: string, name: string) {
  return new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`${namespace}:${name}`),
    ),
  ).slice(0, 8);
}
export async function bountyAddress(
  b: Pick<Bounty, "id" | "requester">,
  program = PROGRAM_ADDRESS,
) {
  const [pda] = await getProgramDerivedAddress({
    programAddress: address(program),
    seeds: [
      new TextEncoder().encode("bounty"),
      getAddressEncoder().encode(address(b.requester)),
      uuidBytes(b.id),
    ],
  });
  return pda;
}
export async function escrowInstruction(
  b: Bounty,
  action: ChainAction,
  actor: string,
  hash?: string,
  program = PROGRAM_ADDRESS,
): Promise<Instruction> {
  const pda = await bountyAddress(b, program);
  const disc = await discriminator("global", instructionNames[action]);
  const payload =
    action === "fund"
      ? new Uint8Array(56)
      : ["submit", "revise", "reject"].includes(action)
        ? hexBytes(hash!)
        : new Uint8Array();
  if (action === "fund") {
    payload.set(uuidBytes(b.id));
    payload.set(hexBytes(b.requirementsHash), 16);
    const { parseSOL } = await import("@/domain/bounty");
    new DataView(payload.buffer).setBigUint64(48, parseSOL(b.reward), true);
  }
  const accounts = [
    { address: pda, role: AccountRole.WRITABLE },
    {
      address: address(actor),
      role: ["fund", "cancel", "expire", "revise", "reject"].includes(action)
        ? AccountRole.WRITABLE_SIGNER
        : AccountRole.READONLY_SIGNER,
    },
  ];
  if (action === "fund")
    accounts.push({
      address: address("11111111111111111111111111111111"),
      role: AccountRole.READONLY,
    });
  if (action === "approve")
    accounts.push({ address: address(b.worker!), role: AccountRole.WRITABLE });
  if (action === "withdraw")
    accounts.push({
      address: address(b.requester),
      role: AccountRole.WRITABLE,
    });
  return {
    programAddress: address(program),
    accounts,
    data: new Uint8Array([...disc, ...payload]),
  };
}
export interface ChainBounty {
  id: string;
  requester: string;
  worker: string | null;
  requirementsHash: string;
  reward: bigint;
  status: BountyStatus;
  deadline: number | null;
  revisionUsed: boolean;
  submissionHash: string;
  feedbackHash: string;
}
export async function decodeBounty(data: Uint8Array): Promise<ChainBounty> {
  if (data.length !== 203) throw new Error("Invalid escrow account size");
  const disc = await discriminator("account", "Bounty");
  if (!disc.every((v, i) => v === data[i]))
    throw new Error("Wrong account discriminator");
  const decoder = getAddressDecoder();
  const worker = data.slice(56, 88);
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const state = data[128];
  const map: BountyStatus[] = [
    "open",
    "in-progress",
    "in-review",
    "revision-requested",
    "paid",
    "refunded",
  ];
  if (!map[state]) throw new Error("Invalid escrow state");
  return {
    id: bytesHex(data.slice(8, 24)),
    requester: decoder.decode(data.slice(24, 56)),
    worker: worker.every((v) => v === 0) ? null : decoder.decode(worker),
    requirementsHash: bytesHex(data.slice(88, 120)),
    reward: view.getBigUint64(120, true),
    status: map[state],
    deadline:
      view.getBigInt64(129, true) === 0n
        ? null
        : Number(view.getBigInt64(129, true)),
    revisionUsed: data[137] === 1,
    submissionHash: bytesHex(data.slice(138, 170)),
    feedbackHash: bytesHex(data.slice(170, 202)),
  };
}
