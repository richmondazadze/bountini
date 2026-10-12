// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Bounty } from "@/domain/bounty";
vi.mock("motion/react", () => ({
  useReducedMotion: () => true,
  motion: {
    span: ({ layoutId, transition, ...props }: any) => <span {...props} />,
  },
}));
vi.mock("@/components/ui", () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  Banner: ({ children }: any) => <div>{children}</div>,
  Countdown: () => <span>Deadline</span>,
}));
import {
  ActiveWorkroom,
  readWorkroomSection,
  workroomNextStep,
} from "@/components/active-workroom/active-workroom";
const b = {
  id: "quest",
  title:
    "A long title requiring careful delivery and a confirmed immutable snapshot",
  category: "Writing",
  reward: "0.1",
  status: "in-progress",
  requester: "requester",
  worker: "worker",
  deadline: 1800,
  revisionUsed: false,
} as Bounty;
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
  history.replaceState(null, "", "/");
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});
async function render(participant = true) {
  await act(async () =>
    root.render(
      <ActiveWorkroom
        b={b}
        requester={false}
        worker={participant}
        ready={true}
        now={600}
        serverTime={600000}
        operation={null}
        pending={false}
        statusFresh={true}
        error=""
        onCheck={() => {}}
        onRetry={() => {}}
        onExpire={() => {}}
        sections={{
          overview: <p>Real agreement</p>,
          messages: (
            <textarea aria-label="Draft message" defaultValue="Saved message" />
          ),
          deliverables: (
            <textarea aria-label="Written response" defaultValue="Saved work" />
          ),
          review: <button>Approve & pay</button>,
          activity: <p>Confirmed history</p>,
        }}
        controls={<p>Existing controls</p>}
        confirmation={null}
      />,
    ),
  );
}
it("loads a deep link and retains mounted drafts between sections", async () => {
  history.replaceState(null, "", "/#deliverables");
  await render();
  expect(host.querySelector("a[aria-current]")?.textContent).toBe(
    "Deliverables",
  );
  const field = host.querySelector('[aria-label="Written response"]')!;
  await act(async () =>
    [...host.querySelectorAll("nav a")]
      .find((a) => a.textContent === "Messages")!
      .dispatchEvent(new MouseEvent("click", { bubbles: true })),
  );
  expect(location.hash).toBe("#messages");
  expect(host.querySelector('[aria-label="Written response"]')).toBe(field);
  expect((field as HTMLTextAreaElement).value).toBe("Saved work");
});
it("synchronizes browser history and rejects unknown sections", async () => {
  await render();
  history.replaceState(null, "", "/#review");
  await act(async () => window.dispatchEvent(new PopStateEvent("popstate")));
  expect(host.querySelector("a[aria-current]")?.textContent).toBe("Review");
  expect(readWorkroomSection("#not-real")).toBe("overview");
});
it("does not render private slot content for outsiders", async () => {
  await render(false);
  expect(host.querySelector("textarea")).toBeNull();
  expect(host.textContent).not.toContain("Approve & pay");
});
it("uses participants, exact deadline and operation status for next action", () => {
  const model = (extra: any) =>
    workroomNextStep({
      b,
      requester: false,
      worker: true,
      ready: true,
      now: 600,
      ...extra,
    });
  expect(model({}).action).toBe("deliverables");
  expect(model({ ready: false }).action).toBe("wallet");
  expect(model({ now: 1800 }).action).toBe("activity");
  expect(model({ transaction: "unknown" }).action).toBe("check");
  expect(model({ b: { ...b, status: "in-review" } }).title).toBe(
    "Waiting for requester review",
  );
  expect(model({ b: { ...b, status: "revision-requested" } }).label).toBe(
    "Prepare revision",
  );
  expect(model({ b: { ...b, status: "paid" } }).title).toBe(
    "Payment confirmed",
  );
});
