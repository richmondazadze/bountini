import { betterAuth, type BetterAuthOptions } from "better-auth";
import { Pool } from "pg";
import { sendAccountEmail } from "./email";
let pool: Pool | undefined;
export function accountOptions(): BetterAuthOptions {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET)
    throw new Error("Account authentication is not configured");
  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  });
  return {
    appName: "Bountini",
    baseURL: process.env.APP_ORIGIN || "http://localhost:3000",
    basePath: "/api/account-auth",
    secret: process.env.BETTER_AUTH_SECRET,
    database: pool,
    trustedOrigins: [
      process.env.APP_ORIGIN || "http://localhost:3000",
      ...(process.env.APP_ALLOWED_ORIGINS || "").split(",").filter(Boolean),
    ],
    user: { modelName: "auth_users" },
    session: {
      modelName: "auth_sessions",
      expiresIn: 604800,
      updateAge: 86400,
      freshAge: 3600,
      cookieCache: { enabled: false },
    },
    account: { modelName: "auth_accounts", accountLinking: { enabled: false } },
    verification: { modelName: "auth_verifications" },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      autoSignIn: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      resetPasswordTokenExpiresIn: 900,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) =>
        sendAccountEmail(user.email, url, "reset"),
    },
    advanced: {
      database: { generateId: "uuid" },
      ipAddress: {
        ipAddressHeaders: ["x-vercel-forwarded-for", "x-forwarded-for"],
      },
      cookiePrefix: "bountini_account",
      useSecureCookies: process.env.NODE_ENV === "production",
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: "auth_rate_limits",
      window: 60,
      max: 60,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 3 },
        "/request-password-reset": { window: 60, max: 3 },
      },
    },
  };
}
let instance: ReturnType<typeof betterAuth> | undefined;
export function accountAuth() {
  return (instance ??= betterAuth(accountOptions()));
}
