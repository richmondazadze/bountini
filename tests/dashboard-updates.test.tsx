// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("../src/components/header", () => ({ api: m.api }));
vi.mock("../src/components/account-provider", () => ({
  useAccount: () => ({
    loading: false,
    refresh: vi.fn(),
    me: {
      user: {
        id: "owner",
        name: "Owner",
        email: "owner@example.test",
        emailVerified: false,
      },
      wallets: [],
      profile: {
        activeRole: "requester",
        bio: "",
        skills: [],
        portfolioUrl: "",
      },
    },
  }),
}));
vi.mock("../src/client/account", () => ({ authClient: {} }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../src/components/market", () => ({ Market: () => null }));
vi.mock("../src/components/ui", () => ({
  Banner: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Button: ({
    children,
    onClick,
    disabled,
  }: React.PropsWithChildren<{ onClick: () => void; disabled: boolean }>) => (
    <button disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}));
import { Dashboard } from "../src/components/dashboard";
import { Profile } from "../src/components/profile";
let root: Root, host: HTMLDivElement;
beforeEach(() => {
  vi.useFakeTimers();
  m.api.mockReset();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, React });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.useRealTimers();
});
it("marks the eight visible IDs and leaves unseen updates unread", async () => {
  m.api
    .mockResolvedValueOnce({
      notifications: Array.from({ length: 12 }, (_, i) => ({
        id: String(12 - i),
        body: "Update " + i,
        read_at: null,
        bounty_id: null,
        created_at: new Date().toISOString(),
      })),
      unread: 12,
    })
    .mockResolvedValueOnce({ saved: true, unread: 4 });
  await act(async () => root.render(<Dashboard />));
  await act(async () =>
    [...host.querySelectorAll("button")]
      .find((b) => b.textContent === "Mark displayed updates read")!
      .click(),
  );
  expect(JSON.parse(m.api.mock.calls[1][1].body)).toEqual({
    ids: ["12", "11", "10", "9", "8", "7", "6", "5"],
  });
  expect(host.querySelector("section")!.textContent).toContain("4 unread");
  expect(host.querySelector("section")!.textContent).not.toContain("●");
  expect(host.textContent).not.toContain("Mark displayed updates read");
});
it("shows an unconfirmed account's email without claiming verification", async () => {
  await act(async () => root.render(<Profile />));
  expect(host.textContent).toContain("owner@example.test");
  expect(host.textContent).not.toContain("Verified email");
});
