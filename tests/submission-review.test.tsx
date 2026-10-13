// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { vi, it, expect, beforeEach, afterEach } from "vitest";
import type { Bounty, Action } from "@/domain/bounty";
const m = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("@/components/header", () => ({ api: m.api }));
vi.mock("@/components/assistance", () => ({
  AdvisoryReview: () => <p>Optional Gemini evidence</p>,
}));
vi.mock("@/components/ui", () => ({
  Banner: ({ children }: any) => <div>{children}</div>,
  Button: ({ children, pending, variant, ...props }: any) => (
    <button {...props} disabled={pending || props.disabled}>
      {children}
    </button>
  ),
}));
import {
  ReviewPanel,
  SettlementSummary,
} from "@/components/submission-review/review-panel";
const b = {
  id: "quest",
  title: "Translate announcement",
  description: "Immutable funded brief",
  requirements: ["Preserve date", "Preserve links"],
  requirementsHash: "agreement-hash",
  reward: "0.1",
  status: "in-review",
  requester: "requester",
  worker: "worker",
  deadline: 1800,
  revisionUsed: false,
} as Bounty;
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
  m.api.mockReset().mockResolvedValue({
    submissions: [
      { body: "Original confirmed response", revision: 0 },
      { body: "Revised confirmed response", revision: 1 },
    ],
  });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});
async function render(overrides: any = {}) {
  await act(async () =>
    root.render(
      <ReviewPanel
        b={b}
        requester
        worker={false}
        ready
        advisoryReady
        blocked={false}
        allowed={() => true}
        feedback="Correct the date"
        setFeedback={() => {}}
        onAction={() => {}}
        activity={[]}
        feedbackHistory={<p>Confirmed requester feedback</p>}
        {...overrides}
      />,
    ),
  );
}
function button(text: string) {
  return [...host.querySelectorAll<HTMLButtonElement>("button")].find(
    (b) => b.textContent === text,
  )!;
}
it("shows latest confirmed revision and allows comparison with immutable original", async () => {
  await render();
  expect(
    host.querySelector(".confirmed-version:not([hidden])")?.textContent,
  ).toContain("Revised confirmed response");
  await act(async () => button("Original submission").click());
  expect(
    host.querySelector(".confirmed-version:not([hidden])")?.textContent,
  ).toContain("Original confirmed response");
  expect(host.textContent).toContain("Preserve date");
  expect(host.textContent).toContain("Immutable funded brief");
});
it("keeps requester choices gated by permissions, confirmation state and confirmed data", async () => {
  await render({ allowed: (a: Action) => a !== "revise" });
  expect(button("Approve & pay").disabled).toBe(false);
  expect(button("Request one revision").disabled).toBe(true);
  await render({ blocked: true });
  expect(button("Approve & pay").disabled).toBe(true);
  await render({ blocked: false, feedback: "" });
  expect(button("Record rejection").disabled).toBe(true);
  m.api.mockRejectedValue(new Error("Unable to load delivery"));
  await act(async () => root.unmount());
  root = createRoot(host);
  await render();
  expect(button("Approve & pay").disabled).toBe(true);
  expect(host.textContent).toContain("Retry confirmed delivery");
});
it("renders contributor feedback and withdrawal without requester controls", async () => {
  await render({ requester: false, worker: true });
  expect(host.textContent).toContain("Confirmed requester feedback");
  expect(host.textContent).not.toContain("Approve & pay");
  expect(button("Withdraw & refund requester")).toBeDefined();
});
it("denies private content to outsiders", async () => {
  await render({ requester: false, worker: false });
  expect(m.api).not.toHaveBeenCalled();
  expect(host.textContent).not.toContain("Original confirmed response");
  expect(host.textContent).toContain("Only quest participants");
});
it("does not turn a passed deadline or unrelated transaction into a settlement receipt", async () => {
  await act(async () =>
    root.render(
      <SettlementSummary
        b={{ ...b, deadline: 1 }}
        activity={[
          {
            action: "submit",
            signature: "delivery-sig",
            updated_at: "2026-10-12T00:00:00Z",
          },
        ]}
      />,
    ),
  );
  expect(host.textContent).toContain("reward remains in escrow");
  expect(host.querySelector("a")).toBeNull();
  await act(async () =>
    root.render(
      <SettlementSummary
        b={{ ...b, status: "paid" }}
        activity={[
          {
            action: "approve",
            signature: "payment-sig",
            updated_at: "2026-10-12T00:00:00Z",
          },
        ]}
      />,
    ),
  );
  expect(host.querySelector("a")?.href).toContain("payment-sig");
});
it("terminal quests offer receipt history without settlement decisions", async () => {
  await render({ b: { ...b, status: "refunded" } });
  expect(host.textContent).not.toContain("Approve & pay");
  expect(host.textContent).not.toContain("Record rejection");
  expect(host.textContent).toContain("return to the requester is confirmed");
});
