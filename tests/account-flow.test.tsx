// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { accountHref, safeDestination } from "../src/client/account-flow";
const m = vi.hoisted(() => ({
  me: null as any,
  push: vi.fn(),
  signup: vi.fn(),
  signin: vi.fn(),
  resend: vi.fn(),
  ready: false,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: m.push, refresh: vi.fn() }),
}));
vi.mock("../src/components/account-provider", () => ({
  useAccount: () => ({ me: m.me, loading: false, refresh: vi.fn() }),
}));
vi.mock("../src/components/wallet-access", () => ({
  useWalletAccess: () => m.ready,
}));
vi.mock("@solana/react-hooks", () => ({
  useWalletConnection: () => ({ wallet: null }),
}));
vi.mock("../src/client/account", () => ({
  authClient: {
    signUp: { email: m.signup },
    signIn: { email: m.signin },
    sendVerificationEmail: m.resend,
  },
}));
vi.mock("../src/components/ui", () => ({
  Enter: ({ children }: any) => <div>{children}</div>,
  Banner: ({ children }: any) => <div>{children}</div>,
  Icon: () => null,
  Button: ({ children, pending, variant, size, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));
vi.mock("../src/components/header", () => ({
  api: vi.fn(async () => ({ aiEnabled: true, voiceEnabled: true })),
}));
import { Create } from "../src/components/create";
import { AccountForm } from "../src/components/account-form";
import { DraftAssistant } from "../src/components/assistance";
let root: Root, host: HTMLDivElement;
beforeEach(() => {
  Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
  m.me = null;
  m.ready = false;
  m.push.mockClear();
  m.signup.mockReset().mockResolvedValue({});
  localStorage.clear();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
it("rejects external, encoded, query and protocol-relative return destinations", () => {
  for (const path of [
    "//evil.test",
    "https://evil.test",
    "/%2f%2fevil.test",
    "/create?next=https://evil.test",
    "/create\\evil",
  ])
    expect(safeDestination(path)).toBe("/my");
  expect(safeDestination("/create")).toBe("/create");
});
it("does not render guest private quest fields or assistance", async () => {
  await act(async () => root.render(<Create />));
  expect(host.querySelector("input")).toBeNull();
  expect(host.querySelector("textarea")).toBeNull();
  expect(host.querySelector("a")?.getAttribute("href")).toBe(
    accountHref("/create", "requester"),
  );
});
it("preserves executor destination and intent in signup callback", async () => {
  const destination = "/bounties/4309d098-a658-4b60-baa8-a508204e5101";
  await act(async () =>
    root.render(
      <AccountForm destination={destination} intendedRole="worker" />,
    ),
  );
  await act(async () =>
    Array.from(host.querySelectorAll("button"))
      .find((b) => b.textContent === "Create an account")!
      .click(),
  );
  await act(async () =>
    host
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
  expect(m.signup.mock.calls[0][0].callbackURL).toBe(
    accountHref(destination, "worker"),
  );
});
it("restores requester preference and destination after verified account arrives", async () => {
  const request = vi.fn(async (_path: string, _init?: RequestInit) =>
    Response.json({ saved: true }),
  );
  vi.stubGlobal("fetch", request);
  await act(async () =>
    root.render(<AccountForm destination="/create" intendedRole="requester" />),
  );
  m.me = { user: { id: "verified", name: "QA" } };
  await act(async () =>
    root.render(<AccountForm destination="/create" intendedRole="requester" />),
  );
  expect(JSON.parse(request.mock.calls[0][1]!.body as string)).toEqual({
    activeRole: "requester",
  });
  expect(m.push).toHaveBeenCalledWith("/create");
});
it("blocks configured voice and AI without verified wallet access", async () => {
  await act(async () => root.render(<DraftAssistant onApply={() => {}} />));
  expect(
    Array.from(host.querySelectorAll("button")).find(
      (b) => b.textContent === "Start voice",
    )?.disabled,
  ).toBe(true);
  expect(
    Array.from(host.querySelectorAll("button")).find(
      (b) => b.textContent === "Suggest requirements",
    )?.disabled,
  ).toBe(true);
});
