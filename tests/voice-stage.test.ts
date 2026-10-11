import { expect, it } from "vitest";
import { transcriptMessages } from "../src/components/voice-stage";
it("preserves multiline content and speaker order in the editable transcript", () => {
  expect(
    transcriptMessages(
      "A typed brief\nwith detail\nBountini: Who is it for?\nYou: Students\nKeep these dates:\nOctober 12",
    ),
  ).toEqual([
    { role: "user", content: "A typed brief\nwith detail" },
    { role: "agent", content: "Who is it for?" },
    { role: "user", content: "Students\nKeep these dates:\nOctober 12" },
  ]);
  expect(transcriptMessages("")).toEqual([]);
});
