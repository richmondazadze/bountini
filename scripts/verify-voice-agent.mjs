// Live SDK handoff smoke test (text transport). This does not test a microphone,
// call Gemini, create a quest, or access a wallet. Requires server-side env keys.
import assert from "node:assert/strict";
import { Conversation } from "@elevenlabs/client";
const response = await fetch(
  `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(process.env.ELEVENLABS_AGENT_ID || "")}`,
  {
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY || "" },
    signal: AbortSignal.timeout(15000),
  },
);
assert(response.ok, "Signed-session creation failed");
const { signed_url: signedUrl } = await response.json();
let active,
  turns = 0,
  calls = 0,
  messages = [],
  finish;
const done = new Promise((resolve, reject) => {
  finish = { resolve, reject };
});
const lastAnswer =
  "I want to pay 0.125 test SOL. Yes, the brief is complete. Also preserve the link https://bountini.us exactly. Nothing else to add.";
const timer = setTimeout(
  () =>
    finish.reject(
      new Error("Explicit completion tool was not received within 60 seconds"),
    ),
  60000,
);
try {
  active = await Conversation.startSession({
    signedUrl,
    connectionType: "websocket",
    textOnly: true,
    onConversationCreated: (conversation) => {
      active = conversation;
    },
    clientTools: {
      prepare_quest_draft: ({ final_user_answer, reward_sol }) => {
        calls++;
        assert(
          messages.some(
            (m) =>
              /Spanish/i.test(m) &&
              /anything else|add anything|else.*add/i.test(m),
          ),
          "Agent must summarize the specific task and ask for additions before completion",
        );
        assert.equal(final_user_answer, lastAnswer);
        assert.equal(reward_sol, "0.125");
        assert(
          messages.some((m) =>
            /how much|what.*reward|what.*amount|what.*budget/i.test(m),
          ),
          "Agent must ask for the missing reward",
        );
        finish.resolve();
        return "Unsaved draft handoff received by SDK test.";
      },
    },
    onMessage: ({ role, message }) => {
      if (role !== "agent") return;
      console.log("Agent:", message);
      messages.push(message);
      turns++;
      const reply =
        turns === 1
          ? "Translate this announcement into neutral Spanish: The community meeting starts Saturday at 10 AM. Read more at https://bountini.us. Deliver the complete translation as text. Acceptance criteria: accurate neutral Spanish, complete text, preserve Saturday, 10 AM and the URL exactly. That is all the task information."
          : lastAnswer;
      if (turns > 5) {
        finish.reject(
          new Error("Agent repeated questions despite the supplied brief"),
        );
        return;
      }
      setTimeout(() => active.sendUserMessage(reply), 0);
    },
    onError: (message) => finish.reject(new Error(message)),
  });
  await done;
  assert.equal(calls, 1);
  console.log(
    "PASS: live ElevenLabs agent invoked prepare_quest_draft once with the final answer and confirmed reward through @elevenlabs/client 1.27.0 (text transport; microphone untested).",
  );
} finally {
  clearTimeout(timer);
  await active?.endSession();
}
