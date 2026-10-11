# Automatic voice drafting — 2026-10-11

## Behavior and boundaries

`prepare_quest_draft` is the only automatic completion signal. The client acknowledges the SDK tool call before asynchronously shutting down, waits for the closing audio to finish (bounded at ten seconds after explicit completion), captures transcript events through shutdown, and retains the tool's verbatim final user answer if its transcript event was delayed. Silence, disconnect, and manual Stop do not generate proposals. Transcript event IDs are scoped to each session and role. Completion is latched once per voice session.

The existing authenticated, wallet-verified `/api/ai/draft` route and its Gemini schema, quotas, and server-only keys are reused. The returned proposal is additionally checked against the existing quest schema without its reward field. A blank brief fills automatically; an existing brief or any intervening form edit is preserved and the generated proposal is offered for explicit review. A monotonic edit revision catches edits even when restored to the original value. Rewards are always retained. Only editable unsaved form fields are changed; device autosave remains local. No bounty API, payment, approval, publishing, or signing operation is triggered by completion.

SDK callbacks and requests are invalidated on account/wallet changes, loss of verified access, authentication events, navigation/unmount, manual cancellation, or replacement sessions. Pending fetches are aborted and late responses ignored. Failures retain the editable transcript with Retry draft, Suggest requirements, and manual editing. Stop voice and mute controls remain available.

## Agent configuration

Inspected the existing live agent and installed `@elevenlabs/client` 1.27.0. The live agent is **Bountini Devnet task assistant**, using **gemini-2.5-flash**, temperature 0.2, max tokens 600, English, Scribe Realtime ASR, `eleven_v4_turbo` voice output, 180-second conversation limit. Gemini drafting uses the existing server model setting (`GEMINI_MODEL`, default **gemini-3.6-flash**).

Versioned configuration: `config/voice-agent.json`. Apply idempotently with `node --env-file=.env.local scripts/configure-voice-agent.mjs`. It preserves the model, voice, existing tools, and unrelated settings. The client tool uses `post_tool_speech`, forced pre-tool speech, no waiting for a result, and a required `final_user_answer`. The instructions require focused questions using provided information, a concrete summary and additions question, then a subsequent explicit confirmation before the exact closing sentence and tool call. `client_tool_call` delivery is enabled. The API readback confirmed the model, prompt, tool attachment and execution mode.

The first live test revealed a skipped readback after early confirmation. The prompt and tool preconditions were strengthened before release. A subsequent real authenticated SDK conversation on the live agent, using text transport, spoke the specific task/deliverable/criteria summary, asked for additions, said “Great, I’ll prepare your quest,” and invoked the named tool once with the final answer verbatim. No wallet or quest was involved in this provider smoke test. Re-run with `node --env-file=.env.local scripts/verify-voice-agent.mjs`.

References: [ElevenLabs client tools](https://elevenlabs.io/docs/eleven-agents/customization/tools/client-tools), [tool creation](https://elevenlabs.io/docs/eleven-agents/api-reference/tools/create), [agent updates](https://elevenlabs.io/docs/eleven-agents/api-reference/agents/update). SDK callback and shutdown ordering were also verified from the installed source. Repository AGENTS.md and installed Next.js client and route handler guides were read before editing.

## Validation and human check

104 regression tests across 21 files passed. TypeScript and the production build passed. Fifteen new voice drafting checks cover completion/final answer, audio/shutdown ordering, duplicate calls, manual stop/disconnect, existing drafts/rewards, concurrent and restored edits, failure/retry, invalid results, typed input, account/wallet/access/unmount changes, authentication events, and replacement sessions. Git-driven release uses one commit/push and Vercel's automatic main deployment; no manual production deployment.

**Real microphone walkthrough remains a human check.** The live SDK smoke test uses text, not human audio. In the deployed Create screen, sign in and verify the wallet, Start voice, describe a task, listen to the summary, add one final requirement, and confirm completion. Check that the closing sentence finishes, voice ends, the final requirement appears in the transcript and draft, and the ready message appears without Stop/Suggest clicks. Also manually Stop a second conversation and confirm no draft is generated. No funding or saving is needed. Browser microphone permission, actual ASR accuracy, and audible playback cannot be certified by the text-transport check.
