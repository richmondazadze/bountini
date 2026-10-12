import Link from "next/link";
import type { Bounty, BountyStatus } from "@/domain/bounty";
import { StatusPill, ExperienceIcon } from "../experience/primitives";
const statusLabels: Record<BountyStatus, string> = {
  draft: "Draft",
  open: "Open",
  "in-progress": "In progress",
  "in-review": "In review",
  "revision-requested": "Revision requested",
  paid: "Payment confirmed",
  refunded: "Refund confirmed",
};
export function QuestCard({ bounty: b }: { bounty: Bounty }) {
  return (
    <article className="discovery-quest">
      <div className="discovery-quest-body">
        <div className="discovery-meta">
          <StatusPill>{b.category}</StatusPill>
          <StatusPill
            tone={
              b.status === "open" || b.status === "paid"
                ? "success"
                : b.status === "refunded"
                  ? "warning"
                  : "neutral"
            }
          >
            {statusLabels[b.status]}
          </StatusPill>
        </div>
        <h3>
          <Link href={`/bounties/${b.id}`}>{b.title}</Link>
        </h3>
        {b.description && (
          <p className="discovery-description">{b.description}</p>
        )}
        <p className="discovery-terms">
          30-minute delivery · Fixed requirements · One contributor
          {b.requesterName && <span> · Posted by {b.requesterName}</span>}
        </p>
      </div>
      <div className="discovery-quest-action">
        <p className="discovery-reward">
          <strong>{b.reward}</strong> <span>test SOL</span>
        </p>
        <Link
          className="button secondary"
          href={`/bounties/${b.id}`}
          aria-label={`View quest: ${b.title}`}
        >
          View quest <ExperienceIcon name="arrow" />
        </Link>
      </div>
    </article>
  );
}
