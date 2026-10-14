// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import type { Bounty } from "../src/domain/bounty";
import { QuestCard } from "../src/components/discovery/quest-card";
let root: Root, host: HTMLDivElement;
const bounty = {
  id: "real-record",
  requester: "ABCDEFGH12345678",
  requesterName: "Ada Lovelace",
  title:
    "Translate a long community invitation with access and travel information "
      .repeat(2)
      .slice(0, 120),
  description: "Preserve the supplied dates, location and contact details.",
  category: "Translation",
  reward: "0.123456789",
  status: "open",
  deadline: null,
} as Bounty;
beforeEach(() => {
  Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});
it("uses provided identity and values, keeps the full title and adds no unsupported trust claims", async () => {
  await act(async () => root.render(<QuestCard bounty={bounty} />));
  expect(host.querySelector("h3")?.textContent).toBe(bounty.title);
  expect(host.querySelector(".discovery-initials")?.textContent).toBe("AL");
  expect(host.textContent).toContain("0.123456789");
  expect(host.textContent).toContain("CategoryTranslation");
  expect(host.textContent).toContain("30 minutes");
  expect(host.textContent).not.toMatch(
    /Stored category|Verified|rating|example|demo/i,
  );
  expect(host.querySelector("a")?.getAttribute("href")).toBe(
    "/bounties/real-record",
  );
  expect(host.querySelector("article")?.style.opacity).not.toBe("0");
});
it("uses an address fallback without inventing a name and displays the actual active deadline", async () => {
  const deadline = 1900000000;
  await act(async () =>
    root.render(
      <QuestCard
        bounty={{
          ...bounty,
          requesterName: undefined,
          status: "in-review",
          deadline,
        }}
      />,
    ),
  );
  expect(host.querySelector(".discovery-identity strong")?.textContent).toBe(
    "ABCD…5678",
  );
  expect(host.textContent).toContain("Review due");
  expect(host.querySelector("time")?.dateTime).toBe(
    new Date(deadline * 1000).toISOString(),
  );
});
it("renders readable content without JavaScript-driven hover or hidden entrance styles", async () => {
  await act(async () => root.render(<QuestCard bounty={bounty} />));
  expect(host.querySelector("article")?.style.transform).toBe("");
  expect(host.querySelector("article")?.style.opacity).not.toBe("0");
  expect(host.querySelector("h3")?.textContent).toBe(bounty.title);
});
