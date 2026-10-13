// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { it, expect, vi, beforeEach, afterEach } from "vitest";
const m = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/image", () => ({
  default: ({ fetchPriority, ...props }: any) => <img {...props} />,
}));
vi.mock("next/navigation", () => ({ usePathname: () => m.pathname }));
vi.mock("@/components/ui", () => ({
  Button: ({ variant, children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));
import { ProductLanding } from "@/components/public-product/landing";
import { ProductFooter } from "@/components/public-product/footer";
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
  m.pathname = "/";
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});
async function render() {
  await act(async () =>
    root.render(
      <>
        <ProductLanding />
        <ProductFooter />
      </>,
    ),
  );
}
it("connects primary entries and supported categories to real routes without an alternate composer", async () => {
  await render();
  const links = [...host.querySelectorAll("a")];
  expect(
    links
      .find((a) => a.textContent?.startsWith("Post a quest"))
      ?.getAttribute("href"),
  ).toBe("/create");
  expect(
    links
      .find((a) => a.textContent === "Find a contribution")
      ?.getAttribute("href"),
  ).toBe("/discover");
  expect(host.querySelectorAll(".pp-categories a")).toHaveLength(4);
  expect(
    host.querySelector('a[href="/discover?category=Development"]'),
  ).not.toBeNull();
  expect(host.querySelector("form")).toBeNull();
  expect(host.querySelector("input,textarea")).toBeNull();
});
it("switches educational audience without changing workspace mode or requesting media", async () => {
  const media = vi.fn();
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: media },
  });
  await render();
  await act(async () =>
    [...host.querySelectorAll("button")]
      .find((b) => b.textContent === "Contributor")!
      .click(),
  );
  expect(host.textContent).toContain("Choose work you understand");
  expect(media).not.toHaveBeenCalled();
  expect(host.textContent).toContain("No recording");
  expect(host.textContent).toContain("Imagined people, not customers");
});
it("ships only actual footer destinations and states escrow limits without broad-launch placeholders", async () => {
  await render();
  expect(host.querySelectorAll("footer")).toHaveLength(1);
  expect(host.querySelector("footer")?.textContent).toContain(
    "Small quests. Real rewards.",
  );
  for (const a of host.querySelectorAll('a[href^="#"]'))
    expect(host.querySelector(a.getAttribute("href")!)).not.toBeNull();
  expect(host.textContent).not.toMatch(
    /approval needed|content needed|verified customer|guaranteed payment/i,
  );
  expect(host.textContent).toContain(
    "without immediate settlement or a deadline reset",
  );
  expect(host.textContent).toContain("One revision is supported");
});
it("keeps application footer compact on nonmarketing routes", async () => {
  m.pathname = "/bounties/quest/review";
  await act(async () => root.render(<ProductFooter />));
  expect(host.querySelector("nav")).toBeNull();
  expect(host.textContent).toContain("Solana Devnet · Test SOL only");
});
