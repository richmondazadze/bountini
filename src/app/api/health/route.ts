export async function GET() {
  return Response.json({
    service: "bountini",
    network: "devnet",
    accountsEnabled:
      !!process.env.BETTER_AUTH_SECRET && !!process.env.DATABASE_URL,
    emailEnabled: !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM,
    databaseConfigured: !!process.env.DATABASE_URL,
    escrowConfigured: !!process.env.NEXT_PUBLIC_ESCROW_PROGRAM_ID,
    aiEnabled: !!process.env.GEMINI_API_KEY,
    voiceEnabled:
      !!process.env.ELEVENLABS_API_KEY && !!process.env.ELEVENLABS_AGENT_ID,
    serverTime: Date.now(),
  });
}
