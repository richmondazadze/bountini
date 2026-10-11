import { randomUUID } from "node:crypto";
export function emailReady() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}
export async function sendAccountEmail(
  to: string,
  url: string,
  kind: "verify" | "reset",
) {
  if (!emailReady()) throw new Error("Email delivery is not configured");
  const subject =
    kind === "verify"
      ? "Verify your Bountini email"
      : "Reset your Bountini password";
  const text = `${subject}\n\n${kind === "verify" ? "Verify your email to start using Bountini." : "Use this link to choose a new password. It expires in 15 minutes."}\n\n${url}\n\nIf you did not request this, ignore this email. Bountini currently uses Solana Devnet test SOL only.`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": randomUUID(),
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [to],
      subject,
      text,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(`Email delivery failed (${response.status})`);
}
