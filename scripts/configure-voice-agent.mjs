// Run: node --env-file=.env.local scripts/configure-voice-agent.mjs
// Keys remain in the environment. Updates only the drafting prompt and named tool.
import fs from "node:fs/promises";
const config = JSON.parse(
  await fs.readFile(
    new URL("../config/voice-agent.json", import.meta.url),
    "utf8",
  ),
);
const key = process.env.ELEVENLABS_API_KEY;
const agentId = process.env.ELEVENLABS_AGENT_ID;
if (!key || !agentId)
  throw new Error("Configure server-side ElevenLabs credentials first.");
async function api(path, method = "GET", body) {
  const response = await fetch(`https://api.elevenlabs.io/v1/convai/${path}`, {
    method,
    headers: { "xi-api-key": key, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok)
    throw new Error(
      `ElevenLabs ${method} failed (${response.status}): ${await response.text()}`,
    );
  return response.json();
}
const agent = await api(`agents/${agentId}`);
const prompt = agent.conversation_config.agent.prompt;
let tool = prompt.tools.find((t) => t.name === "prepare_quest_draft");
let toolId = tool?.id;
if (!toolId) {
  for (const id of prompt.tool_ids) {
    const candidate = await api(`tools/${id}`);
    if (candidate.tool_config.name === "prepare_quest_draft") {
      toolId = id;
      break;
    }
  }
}
if (toolId)
  await api(`tools/${toolId}`, "PATCH", { tool_config: config.tool_config });
else
  toolId = (await api("tools", "POST", { tool_config: config.tool_config })).id;
await api(`agents/${agentId}`, "PATCH", {
  conversation_config: {
    agent: {
      prompt: {
        prompt: config.prompt,
        tool_ids: [...new Set([...prompt.tool_ids, toolId])],
      },
    },
    conversation: {
      client_events: [
        ...new Set([
          ...agent.conversation_config.conversation.client_events,
          "client_tool_call",
        ]),
      ],
    },
  },
});
const updated = await api(`agents/${agentId}`);
const verified = await api(`tools/${toolId}`);
if (
  updated.conversation_config.agent.prompt.prompt !== config.prompt ||
  !updated.conversation_config.agent.prompt.tool_ids.includes(toolId) ||
  verified.tool_config.name !== config.tool_config.name
)
  throw new Error("Agent readback did not match the configured handoff.");
console.log(
  JSON.stringify({
    agent: updated.name,
    model: updated.conversation_config.agent.prompt.llm,
    tool: verified.tool_config.name,
    executionMode: verified.tool_config.execution_mode,
    clientEvents: updated.conversation_config.conversation.client_events,
  }),
);
