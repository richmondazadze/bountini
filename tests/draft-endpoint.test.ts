import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  wallet: vi.fn(),
  quota: vi.fn(),
  gemini: vi.fn(),
}));
vi.mock("@/server/auth", () => ({ walletSession: m.wallet }));
vi.mock("@/server/assistance", async (original) => ({
  ...(await original<typeof import("@/server/assistance")>()),
  quota: m.quota,
  gemini: m.gemini,
}));
vi.mock("@/server/db", async (original) => ({
  ...(await original<typeof import("@/server/db")>()),
  requireOrigin: vi.fn(),
}));
import { HttpError } from "../src/server/db";
import { POST } from "../src/app/api/ai/draft/route";
const proposal = {
  result: {
    title: "Translate the announcement",
    description:
      "Translate the supplied announcement into neutral Spanish, preserving dates and the original link.",
    category: "Translation",
    requirements: ["Preserve dates and the link exactly."],
  },
  model: "controlled-model",
};
const request = (
  text = "You: Translate the announcement. Bountini: Anything else? You: Preserve all dates. Confirmed, 0.1 SOL.",
) =>
  new Request("https://bountini.us/api/ai/draft", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });
beforeEach(() => {
  m.wallet.mockReset().mockResolvedValue("verified-wallet");
  m.quota.mockReset().mockResolvedValue(undefined);
  m.gemini.mockReset().mockResolvedValue(proposal);
});
it("returns the crafted description without appending raw conversation or reward negotiation", async () => {
  const response = await POST(request());
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data).toEqual(proposal);
  expect(data.result.description).not.toContain("Original task / transcript:");
  expect(data.result.description).not.toContain("You:");
  expect(m.gemini.mock.calls[0][1]).toContain(
    "skilled professional brief writer",
  );
  expect(m.gemini.mock.calls[0][2].text).toContain("0.1 SOL");
  expect(m.quota).toHaveBeenCalledWith("verified-wallet", "draft");
});
it("keeps wallet authentication ahead of drafting", async () => {
  m.wallet.mockRejectedValueOnce(
    new HttpError(401, "Sign in and verify your wallet"),
  );
  expect((await POST(request())).status).toBe(401);
  expect(m.gemini).not.toHaveBeenCalled();
});
it("keeps short input validation and quota denial", async () => {
  expect((await POST(request("short"))).status).toBe(400);
  expect(m.quota).not.toHaveBeenCalled();
  m.quota.mockRejectedValueOnce(
    new HttpError(429, "Daily assistance limit reached"),
  );
  expect((await POST(request())).status).toBe(429);
  expect(m.gemini).not.toHaveBeenCalled();
});

it("allows essential long source text within the existing quest description limit", async () => {
  const { suggestedDraft } = await import("../src/server/assistance");
  const longDescription =
    "Translate the following source text: " + "source content ".repeat(350);
  expect(
    suggestedDraft.safeParse({
      ...proposal.result,
      description: longDescription,
    }).success,
  ).toBe(true);
  expect(
    suggestedDraft.safeParse({
      ...proposal.result,
      description: "x".repeat(10001),
    }).success,
  ).toBe(false);
});
