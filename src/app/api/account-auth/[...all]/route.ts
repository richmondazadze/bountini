import { after } from "next/server";
import { betterAuth } from "better-auth";
import { toNextJsHandler } from "better-auth/next-js";
import { accountOptions } from "@/server/account-config";
import { emailReady } from "@/server/email";
import { failure, HttpError } from "@/server/db";
let handlers: ReturnType<typeof toNextJsHandler> | undefined;
function authHandlers() {
  if (!handlers) {
    const options = accountOptions();
    options.advanced = {
      ...options.advanced,
      backgroundTasks: { handler: (promise) => after(() => promise) },
    };
    handlers = toNextJsHandler(betterAuth(options));
  }
  return handlers;
}
export async function GET(request: Request) {
  try {
    if (/\/verify-email$/.test(new URL(request.url).pathname))
      return Response.json(
        { error: "Email confirmation is not required" },
        { status: 404 },
      );
    return await authHandlers().GET(request);
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    const path = new URL(request.url).pathname;
    if (/\/(send-verification-email|verify-email)$/.test(path))
      return Response.json(
        { error: "Email confirmation is not required" },
        { status: 404 },
      );
    if (!emailReady() && /\/request-password-reset$/.test(path))
      throw new HttpError(
        503,
        "Email delivery is being configured. Please try again shortly.",
      );
    return await authHandlers().POST(request);
  } catch (e) {
    return failure(e);
  }
}
