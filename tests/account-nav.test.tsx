// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  loading: true,
  me: null as null | { user: { name: string } },
}));
vi.mock("../src/components/account-provider", () => ({ useAccount: () => m }));
vi.mock("next/navigation", () => ({ usePathname: () => "/create" }));
import { AccountNav } from "../src/components/account-nav";
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
  m.loading = true;
  m.me = null;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});
it("uses an accessible noninteractive placeholder until the session is known", async () => {
  await act(async () => root.render(<AccountNav />));
  expect(host.querySelector("[role=status]")?.getAttribute("aria-label")).toBe(
    "Checking your account",
  );
  expect(host.querySelector("a")).toBeNull();
  expect(host.textContent).not.toContain("Account…");
  m.loading = false;
  await act(async () => root.render(<AccountNav />));
  expect(host.querySelector("a")?.textContent).toBe("Sign in");
  expect(host.querySelector("a")?.getAttribute("href")).toContain(
    "role=requester",
  );
});
it("shows the authenticated name after the session check", async () => {
  m.loading = false;
  m.me = { user: { name: "Test Requester" } };
  await act(async () => root.render(<AccountNav />));
  expect(host.querySelector("a")?.textContent).toBe("Test");
  expect(host.querySelector("a")?.getAttribute("href")).toBe("/my");
});
