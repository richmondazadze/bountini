// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ api: vi.fn(), user: "owner" }));
vi.mock("../src/components/header", () => ({ api: m.api }));
vi.mock("../src/components/account-provider", () => ({
  useAccount: () => ({
    me: { user: { id: m.user }, wallets: [{ wallet: "requester" }] },
  }),
}));
vi.mock("../src/components/ui", () => ({
  Banner: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Button: ({ children, pending, ...props }: any) => (
    <button {...props} disabled={pending || props.disabled}>
      {children}
    </button>
  ),
}));
import { Workroom } from "../src/components/workroom";
let root: Root, host: HTMLDivElement;
const message = (n: number) => ({
  id: String(n),
  seq: String(n),
  body: "Message " + n,
  sender_id: "owner",
  sender_name: "Owner",
  created_at: new Date().toISOString(),
});
beforeEach(() => {
  vi.useFakeTimers();
  m.api.mockReset();
  m.user = "owner";
  Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
  Element.prototype.scrollIntoView = vi.fn();
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: "visible",
  });
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value: true,
  });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.useRealTimers();
});
async function render() {
  await act(async () =>
    root.render(<Workroom id="quest" requester="requester" worker="worker" />),
  );
}
async function older() {
  await act(async () =>
    [...host.querySelectorAll("button")]
      .find((b) => b.textContent === "Load earlier messages")!
      .click(),
  );
}
it("keeps exhausted history exhausted after latest-message polling", async () => {
  m.api
    .mockResolvedValueOnce({ messages: [message(51)], hasMore: true })
    .mockResolvedValueOnce({ messages: [message(1)], hasMore: false })
    .mockResolvedValue({ messages: [message(51), message(52)], hasMore: true });
  await render();
  await older();
  await act(async () => vi.advanceTimersByTimeAsync(5000));
  expect(host.textContent).not.toContain("Load earlier messages");
  expect(host.querySelectorAll("article")).toHaveLength(3);
});
it("discards history loaded for a previous account", async () => {
  let finish!: (value: unknown) => void;
  m.api
    .mockResolvedValueOnce({ messages: [message(51)], hasMore: true })
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValueOnce({ messages: [message(100)], hasMore: false });
  await render();
  await older();
  m.user = "other";
  await render();
  await act(async () => finish({ messages: [message(1)], hasMore: true }));
  expect(
    [...host.querySelectorAll("article p")].map((p) => p.textContent),
  ).toEqual(["Message 100"]);
  expect(host.textContent).toContain("Message 100");
  expect(host.textContent).not.toContain("Load earlier messages");
});
