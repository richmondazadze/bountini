export const maxDuration = 60;
import { z } from "zod";
import { walletSession } from "@/server/auth";
import { failure, requireOrigin, jsonBody, HttpError } from "@/server/db";
import { gemini, quota, suggestedDraft } from "@/server/assistance";
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const wallet = await walletSession();
    const p = z
      .object({ text: z.string().trim().min(20).max(6000) })
      .safeParse(await jsonBody(request));
    if (!p.success)
      throw new HttpError(
        400,
        "Add at least 20 characters describing the task.",
      );
    await quota(wallet, "draft");
    const proposal = await gemini(
      suggestedDraft,
      "Act as a skilled professional brief writer. Turn the supplied task or conversation into a polished, cohesive, self-contained quest description addressed to the contributor. Clearly explain the objective, relevant context, scope and deliverable in natural prose; provide precise acceptance criteria separately. Preserve essential source content verbatim when needed to perform the task, and preserve exact dates, URLs and stated requirements. Remove conversational filler, speaker labels, confirmation exchanges and reward negotiation from the description. Do not append or reproduce the conversation transcript, include an Original task / transcript section, or invent facts or reward amounts. Return an editable proposal, never a final agreement.",
      p.data,
    );
    return Response.json(proposal);
  } catch (e) {
    return failure(e);
  }
}
