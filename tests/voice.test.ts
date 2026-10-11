import { afterEach, beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ wallet: vi.fn(), quota: vi.fn() }));
vi.mock("@/server/auth", () => ({ walletSession: m.wallet }));
vi.mock("@/server/assistance", () => ({ quota: m.quota }));
vi.mock("@/server/db", async (original) => ({
  ...(await original<typeof import("@/server/db")>()),
  requireOrigin: vi.fn(),
}));
import { POST } from "../src/app/api/voice/session/route";
const request = () =>
  new Request("https://bountini.us/api/voice/session", { method: "POST" });
beforeEach(() => {
  vi.stubEnv("ELEVENLABS_API_KEY", "controlled-key");
  vi.stubEnv("ELEVENLABS_AGENT_ID", "controlled-agent");
  m.wallet.mockReset().mockResolvedValue("wallet");
  m.quota.mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
it("recovers from a transient upstream failure while charging application quota once", async () => {
  vi.useFakeTimers();
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response("", { status: 503 }))
    .mockResolvedValueOnce(
      Response.json({ signed_url: "wss://api.elevenlabs.io/session" }),
    );
  vi.stubGlobal("fetch", fetcher);
  const result = POST(request());
  await vi.advanceTimersByTimeAsync(500);
  const response = await result;
  expect(response.status).toBe(200);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(m.quota).toHaveBeenCalledTimes(1);
  expect(response.headers.get("cache-control")).toBe("no-store");
});
it("returns the typed fallback after a network timeout", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new DOMException("timeout", "TimeoutError")),
  );
  const response = await POST(request());
  expect(response.status).toBe(503);
  expect((await response.json()).error).toContain("Continue by typing");
});
it("does not retry invalid provider credentials", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response("", { status: 401 }));
  vi.stubGlobal("fetch", fetcher);
  expect((await POST(request())).status).toBe(503);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("rejects a signed URL outside ElevenLabs", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json({ signed_url: "wss://attacker.example/session" }),
      ),
  );
  expect((await POST(request())).status).toBe(502);
});
