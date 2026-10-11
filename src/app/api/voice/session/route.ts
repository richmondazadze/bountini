import { walletSession } from "@/server/auth";
import { failure, requireOrigin, HttpError } from "@/server/db";
import { quota } from "@/server/assistance";
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const wallet = await walletSession();
    const key = process.env.ELEVENLABS_API_KEY,
      agent = process.env.ELEVENLABS_AGENT_ID;
    if (!key || !agent)
      throw new HttpError(
        503,
        "Voice assistance is unavailable. Continue by typing.",
      );
    await quota(wallet, "voice");
    const requestSession = () =>
      fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agent)}`,
        { headers: { "xi-api-key": key }, signal: AbortSignal.timeout(10000) },
      );
    let response: Response;
    try {
      response = await requestSession();
      // Signed URL retrieval is idempotent; a transient provider failure should
      // not strand the user or consume another application quota entry.
      if ([429, 502, 503, 504].includes(response.status)) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        response = await requestSession();
      }
    } catch {
      throw new HttpError(
        503,
        "Voice service is unavailable. Continue by typing.",
      );
    }
    if (!response.ok)
      throw new HttpError(
        503,
        "Voice service is unavailable. Continue by typing.",
      );
    const { signed_url } = await response.json();
    if (
      typeof signed_url !== "string" ||
      !signed_url.startsWith("wss://api.elevenlabs.io/")
    )
      throw new HttpError(502, "Invalid voice session");
    return Response.json(
      { signedUrl: signed_url },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
