import { cookies } from "next/headers";
import { walletSession, COOKIE, tokenHash } from "@/server/auth";
import { database, failure, requireOrigin } from "@/server/db";
export async function GET() {
  try {
    return Response.json(
      { wallet: await walletSession() },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(request: Request) {
  try {
    requireOrigin(request);
    const store = await cookies();
    const token = store.get(COOKIE)?.value;
    if (token)
      await database()`DELETE FROM sessions WHERE token_hash=${tokenHash(token)}`;
    store.delete(COOKIE);
    return Response.json({ signedOut: true });
  } catch (e) {
    return failure(e);
  }
}
