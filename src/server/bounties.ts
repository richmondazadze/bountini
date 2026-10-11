import { formatSOL, type Bounty } from "@/domain/bounty";
export function bountyFromRow(r: Record<string, unknown>): Bounty {
  return {
    id: String(r.id),
    title: String(r.title),
    description: String(r.description),
    category: r.category as Bounty["category"],
    requirements: r.requirements as string[],
    reward: formatSOL(BigInt(String(r.reward_lamports))),
    requester: String(r.requester),
    requesterName: r.requester_name ? String(r.requester_name) : undefined,
    workerName: r.worker_name ? String(r.worker_name) : undefined,
    requesterProfileId: r.requester_user_id
      ? String(r.requester_user_id)
      : undefined,
    workerProfileId: r.worker_user_id ? String(r.worker_user_id) : undefined,
    worker: r.worker ? String(r.worker) : null,
    status: r.status as Bounty["status"],
    requirementsHash: String(r.requirements_hash),
    deadline: r.deadline ? Number(r.deadline) : null,
    revisionUsed: Boolean(r.revision_used),
    createdAt: String(r.created_at),
    chainAddress: r.chain_address ? String(r.chain_address) : null,
    signature: r.signature ? String(r.signature) : null,
  };
}
