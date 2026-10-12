// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { WorkspaceHeader } from "../src/components/experience/workspace-header";
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockImplementation(
    () => [new DOMRect(0, 0, 20, 20)] as unknown as DOMRectList,
  );
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});
it("contains menu keyboard focus and closes when a navigation link is selected", async () => {
  await act(async () =>
    root.render(
      <WorkspaceHeader
        mode="worker"
        links={[
          { href: "/discover", label: "Find quests" },
          { href: "/my", label: "My work", active: true },
        ]}
        accountContent={<a href="/settings">Account & profile</a>}
      />,
    ),
  );
  const trigger = host.querySelector<HTMLButtonElement>("header button")!;
  await act(async () => trigger.click());
  const dialog = host.querySelector("dialog")!;
  expect(dialog.open).toBe(true);
  expect(trigger.getAttribute("aria-expanded")).toBe("true");
  const close = dialog.querySelector<HTMLButtonElement>("button")!,
    last = dialog.querySelector<HTMLAnchorElement>('a[href="/settings"]')!;
  last.focus();
  last.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    }),
  );
  expect(document.activeElement).toBe(close);
  close.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    }),
  );
  expect(document.activeElement).toBe(last);
  await act(async () =>
    dialog.querySelector<HTMLAnchorElement>('a[href="/my"]')!.click(),
  );
  expect(dialog.open).toBe(false);
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
});
it("renders a public menu without exposing authenticated mode controls", async () => {
  await act(async () =>
    root.render(
      <WorkspaceHeader
        links={[{ href: "/discover", label: "Discover" }]}
        publicAccountContent={<a href="/account">Sign in</a>}
      />,
    ),
  );
  expect(host.querySelector("select")).toBeNull();
  expect(host.querySelector("header nav")?.getAttribute("aria-label")).toBe(
    "Main navigation",
  );
  await act(async () =>
    host.querySelector<HTMLButtonElement>("header button")!.click(),
  );
  expect(host.querySelector("dialog h2")?.textContent).toBe("Bountini menu");
});
