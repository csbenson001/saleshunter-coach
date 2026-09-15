import { z } from "zod";
import { JSON_MODE_INSTRUCTION } from "./provider";
import { generateObjectResilient } from "./generate";
import { outputLanguageInstruction, profileContext } from "./profile";
import { transcriptWithTimestamps } from "../store";
import { recordLlmUsage } from "../usage/log";
import type { Settings } from "../types";
import type {
  ExecutiveDealMemoDraft,
  ExecutiveDealMemoInput,
} from "../sales/executiveDealMemo";

const schema = z.object({
  agreedProblem: z.string().describe("The business problem the prospect agreed to address, stated plainly."),
  proposedSolution: z.string().describe("The solution explicitly proposed in the call, without new claims."),
  timeline: z.string().describe("The agreed timeline or evaluation timing, or 'No timeline agreed'."),
  mutualActionPlan: z.array(
    z.object({
      owner: z.enum(["seller", "prospect", "mutual"]),
      action: z.string().describe("One concrete commitment made during the call."),
      dueDate: z.string().nullable().describe("The agreed due date, or null when none was stated."),
    }),
  ),
});

const SYSTEM = `You draft a prospect-ready post-call deal memo. Use only commitments explicitly grounded in the final transcript. Do not invent a feature, pricing promise, URL, trial, or next step. The recap is for the prospect, so include only the agreed problem, proposed solution, timeline, and mutual action plan. Keep each action concrete and identify whether the seller, prospect, or both own it. If no due date was agreed, return null. Never turn a suggestion into a commitment.`;

export async function generateExecutiveDealMemoDraft(opts: {
  settings: Settings;
  input: ExecutiveDealMemoInput;
}): Promise<ExecutiveDealMemoDraft> {
  const { settings, input } = opts;
  const transcript = transcriptWithTimestamps(input.segments);
  const { object, usage } = await generateObjectResilient({
    settings,
    workload: "deep",
    schema,
    system: profileContext(settings) + SYSTEM + JSON_MODE_INSTRUCTION + outputLanguageInstruction(settings),
    prompt: `Call: ${input.callTitle}\nProspect: ${input.prospectName ?? "unknown"}\n\nFinal transcript:\n${transcript}`,
  });
  void recordLlmUsage(settings, "deep", "executive-deal-memo", usage);
  return {
    agreedProblem: object.agreedProblem,
    proposedSolution: object.proposedSolution,
    timeline: object.timeline,
    mutualActionPlan: object.mutualActionPlan.map((action) => ({
      owner: action.owner,
      action: action.action,
      ...(action.dueDate ? { dueDate: action.dueDate } : {}),
    })),
  };
}
