import { z } from "zod";
export const NETWORK = "devnet" as const;
export const WINDOWS = {
  delivery: 1800,
  review: 600,
  revision: 600,
  finalReview: 600,
} as const;
export const statuses = [
  "draft",
  "open",
  "in-progress",
  "in-review",
  "revision-requested",
  "paid",
  "refunded",
] as const;
export type BountyStatus = (typeof statuses)[number];
export type TransactionStatus =
  | "waiting-wallet"
  | "submitting"
  | "confirming"
  | "confirmed"
  | "rejected"
  | "failed"
  | "unknown";
export const draftSchema = z.object({
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(20).max(10000),
  category: z.enum(["Translation", "Writing", "Community", "Development"]),
  requirements: z.array(z.string().trim().min(3).max(1000)).min(1).max(12),
  reward: z.string().refine((v) => {
    try {
      return parseSOL(v) > 0n;
    } catch {
      return false;
    }
  }, "Enter a positive SOL amount with at most 9 decimal places"),
});
export type Draft = z.infer<typeof draftSchema>;
export interface Bounty extends Draft {
  id: string;
  requester: string;
  worker: string | null;
  status: BountyStatus;
  requirementsHash: string;
  deadline: number | null;
  revisionUsed: boolean;
  createdAt: string;
  chainAddress: string | null;
  signature: string | null;
  submission?: string;
}
export function parseSOL(value: string): bigint {
  if (!/^(0|[1-9]\d*)(\.\d{1,9})?$/.test(value))
    throw new Error("Use a decimal SOL amount, up to 9 decimal places");
  const [whole, decimals = ""] = value.split(".");
  const amount =
    BigInt(whole) * 1_000_000_000n + BigInt(decimals.padEnd(9, "0"));
  if (amount > 18_446_744_073_709_551_615n)
    throw new Error("Amount exceeds chain limits");
  return amount;
}
export function formatSOL(amount: bigint): string {
  return (
    `${amount / 1_000_000_000n}.${(amount % 1_000_000_000n).toString().padStart(9, "0")}`.replace(
      /\.?0+$/,
      "",
    ) || "0"
  );
}
export function canonicalAgreement(draft: Draft): string {
  const d = draftSchema.parse(draft);
  return JSON.stringify({
    version: 1,
    title: d.title.normalize("NFC"),
    description: d.description.replace(/\r\n?/g, "\n").normalize("NFC"),
    category: d.category,
    requirements: d.requirements.map((r) => r.normalize("NFC")),
    rewardLamports: parseSOL(d.reward).toString(),
    network: NETWORK,
    windows: WINDOWS,
  });
}
export type Action =
  | "claim"
  | "submit"
  | "revise"
  | "approve"
  | "cancel"
  | "expire"
  | "reject"
  | "withdraw";
export function canAct(
  b: Pick<
    Bounty,
    "status" | "requester" | "worker" | "deadline" | "revisionUsed"
  >,
  action: Action,
  actor: string,
  now: number,
): boolean {
  const before = b.deadline !== null && now < b.deadline;
  switch (action) {
    case "claim":
      return b.status === "open" && actor !== b.requester && b.worker === null;
    case "submit":
      return (
        actor === b.worker &&
        before &&
        ["in-progress", "revision-requested"].includes(b.status)
      );
    case "revise":
      return (
        actor === b.requester &&
        b.status === "in-review" &&
        !b.revisionUsed &&
        before
      );
    case "approve":
      return actor === b.requester && b.status === "in-review" && before;
    case "reject":
      return actor === b.requester && b.status === "in-review" && before;
    case "withdraw":
      return (
        actor === b.worker &&
        ["in-progress", "in-review", "revision-requested"].includes(b.status)
      );
    case "cancel":
      return actor === b.requester && b.status === "open";
    case "expire":
      return (
        actor === b.requester &&
        b.deadline !== null &&
        now >= b.deadline &&
        ["in-progress", "in-review", "revision-requested"].includes(b.status)
      );
  }
}
// Rejection records feedback without changing escrow state or the current deadline.
