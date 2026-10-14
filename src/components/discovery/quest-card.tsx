"use client";
import Link from "next/link";
import { WINDOWS, type Bounty, type BountyStatus } from "@/domain/bounty";
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
export function RequesterIdentity({ bounty: b }: { bounty: Bounty }) {
  const name = b.requesterName?.trim();
  const parts = name?.split(/\s+/).filter(Boolean);
  const initials = parts?.length
    ? [parts[0], ...(parts.length > 1 ? [parts.at(-1)!] : [])]
        .map((p) => Array.from(p)[0])
        .join("")
        .toLocaleUpperCase()
    : null;
  return (
    <div className="discovery-identity" data-component="RequesterIdentity">
      <span className="discovery-initials" aria-hidden="true">
        {initials || <ExperienceIcon name="user" size={18} />}
      </span>
      <div>
        <strong>
          {name ||
            (b.requester
              ? `${b.requester.slice(0, 4)}…${b.requester.slice(-4)}`
              : "Requester")}
        </strong>
        <span>Requester</span>
      </div>
    </div>
  );
}
export function QuestCard({ bounty: b }: { bounty: Bounty }) {
  const deadline =
    b.deadline && !["open", "paid", "refunded", "draft"].includes(b.status)
      ? new Date(b.deadline * 1000)
      : null;
  return (
    <article className="discovery-quest" data-component="QuestCard">
      <div className="discovery-card-top">
        <RequesterIdentity bounty={b} />
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
      <dl className="discovery-metadata" data-component="MetadataGrid">
        <div>
          <dt>
            <ExperienceIcon name="wallet" size={16} />
            Test SOL reward
          </dt>
          <dd>
            <strong>{b.reward}</strong> <span>test SOL</span>
          </dd>
        </div>
        <div>
          <dt>
            <ExperienceIcon name="clock" size={16} />
            {deadline
              ? b.status === "in-review"
                ? "Review due"
                : "Delivery due"
              : "Delivery window"}
          </dt>
          <dd>
            {deadline ? (
              <time dateTime={deadline.toISOString()}>
                {new Intl.DateTimeFormat(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(deadline)}
              </time>
            ) : (
              `${WINDOWS.delivery / 60} minutes`
            )}
          </dd>
        </div>
        <div>
          <dt>
            <ExperienceIcon name="quest" size={16} />
            Category
          </dt>
          <dd>{b.category}</dd>
        </div>
      </dl>
      <div className="discovery-card-footer">
        <span>One contributor · Fixed requirements</span>
        <Link
          className="discovery-card-link"
          href={`/bounties/${b.id}`}
          aria-label={`View quest: ${b.title}`}
        >
          View quest <ExperienceIcon name="arrow" />
        </Link>
      </div>
    </article>
  );
}
