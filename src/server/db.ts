import { neon } from "@neondatabase/serverless";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function database() {
  const url = process.env.DATABASE_URL;
  if (!url)
    throw new HttpError(
      503,
      "Database is not configured. Your draft remains on this device.",
    );
  return neon(url);
}
export function failure(error: unknown) {
  const known = error instanceof HttpError;
  return Response.json(
    { error: known ? error.message : "Request failed. Please try again." },
    { status: known ? error.status : 500 },
  );
}
export function requireOrigin(request: Request) {
  const origin = process.env.APP_ORIGIN || "http://localhost:3000";
  if (request.headers.get("origin") !== origin)
    throw new HttpError(403, "Untrusted request origin");
  return origin;
}
export async function jsonBody(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 32000)
    throw new HttpError(413, "Request is too large");
  const text = await request.text();
  if (new TextEncoder().encode(text).length > 32000)
    throw new HttpError(413, "Request is too large");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Invalid JSON");
  }
}
