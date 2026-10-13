"use client";
import { useState } from "react";
import Image from "next/image";
import { Button } from "../ui";
const steps = {
  requester: [
    [
      "Write a clear brief",
      "Name the deliverable and set fixed acceptance criteria. Review everything before funding.",
      "agreement",
    ],
    [
      "Fund the quest",
      "Choose to connect your wallet, verify ownership and review the Devnet request before signing.",
      "wallet",
    ],
    [
      "Review the work",
      "Compare the confirmed delivery with the agreement. Your confirmed approval pays the contributor.",
      "deliverable",
    ],
  ],
  contributor: [
    [
      "Choose work you understand",
      "Read the requirements, requester context and deadlines before claiming as the only contributor.",
      "agreement",
    ],
    [
      "Deliver deliberately",
      "Prepare files, links or a written response. Review the submission summary, then sign before the deadline.",
      "deliverable",
    ],
    [
      "Follow the review",
      "Respond to one requested revision. Payment requires requester approval; work may remain unpaid.",
      "wallet",
    ],
  ],
};
export function RoleWorkflow() {
  const [role, setRole] = useState<"requester" | "contributor">("requester");
  return (
    <section className="pp-band" id="how-it-works">
      <div className="pp-container">
        <div className="pp-section-top">
          <div>
            <p className="eyebrow">A simple agreement</p>
            <h2>Know the next step.</h2>
          </div>
          <div className="pp-role" role="group" aria-label="Workflow audience">
            {(["requester", "contributor"] as const).map((value) => (
              <Button
                key={value}
                variant={role === value ? "primary" : "secondary"}
                aria-pressed={role === value}
                onClick={() => setRole(value)}
              >
                {value === "requester" ? "Requester" : "Contributor"}
              </Button>
            ))}
          </div>
        </div>
        <div className="pp-steps" aria-live="polite">
          {steps[role].map(([title, body, art], i) => (
            <article key={title}>
              <Image
                src={`/brand/illustrations/${art}.webp`}
                width={112}
                height={112}
                alt=""
              />
              <p className="eyebrow">Step 0{i + 1}</p>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
