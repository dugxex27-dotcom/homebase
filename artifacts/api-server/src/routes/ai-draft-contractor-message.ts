import OpenAI from "openai";
import { z } from "zod";

export const draftContractorMessageBodySchema = z.object({
  issueDescription: z.string().min(1).max(500),
  tone: z.enum(["Urgent", "Friendly", "Formal"]).default("Friendly"),
  houseId: z.string().optional(),
  taskContext: z.string().optional(),
});

export const MESSAGE_TONE_GUIDANCE = {
  Urgent: "Use a direct, time-sensitive tone. Clearly communicate that prompt attention is needed without sounding alarmist or rude.",
  Friendly: "Use a warm, approachable, conversational tone while remaining clear and professional.",
  Formal: "Use a polished, businesslike tone with precise wording and an emphasis on written scope, expectations, and next steps.",
} as const;

export function buildDraftContractorMessagePrompt(
  parsed: z.infer<typeof draftContractorMessageBodySchema>,
  houseContext = "",
) {
  const contextParts: string[] = [];
  if (parsed.taskContext) contextParts.push(`Maintenance task: ${parsed.taskContext}`);
  if (houseContext) contextParts.push(houseContext);
  contextParts.push(`Issue described by homeowner: ${parsed.issueDescription}`);

  return `You are helping a homeowner write a professional message to a contractor.

Context:
${contextParts.join("\n")}

Selected tone: ${parsed.tone}
Tone guidance: ${MESSAGE_TONE_GUIDANCE[parsed.tone]}

Write a clear and specific message that the homeowner would send to a contractor. The message should:
- Be 3-5 sentences
- Describe the issue clearly using the homeowner's words
- Mention relevant home details (age, system type) when available
- Close with a request for an estimate or appointment
- Follow the selected tone guidance consistently
- Sound like a real homeowner
- Be under 150 words

Also suggest 2-3 short, useful follow-up questions the homeowner could ask this contractor to get a clearer quote or plan. Tailor them to the issue when possible and do not repeat a question already answered by the draft.

Respond as JSON with exactly this shape:
{
  "message": "the drafted message, with no subject line or extra commentary",
  "followUpQuestions": ["question one?", "question two?"]
}`;
}

export function createDraftContractorMessageHandler(storage: {
  getHouse(id: string): Promise<any>;
}) {
  return async (req: any, res: any) => {
    try {
      const parsedResult = draftContractorMessageBodySchema.safeParse(req.body);
      if (!parsedResult.success) {
        return res.status(400).json({ message: "Invalid request body" });
      }
      const parsed = parsedResult.data;
      let houseContext = "";
      if (parsed.houseId) {
        const house = await storage.getHouse(parsed.houseId);
        if (house && house.homeownerId === req.session.user.id) {
          const parts: string[] = [];
          if (house.yearBuilt) parts.push(`built in ${house.yearBuilt}`);
          if (house.address) parts.push(`located at ${house.address}`);
          const systems = (Array.isArray(house.homeSystems) ? house.homeSystems as string[] : []).slice(0, 5);
          if (systems.length > 0) parts.push(`home systems include: ${systems.join(", ")}`);
          if (parts.length > 0) houseContext = `Home details: ${parts.join("; ")}.`;
        }
      }

      const openai = new OpenAI({
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: buildDraftContractorMessagePrompt(parsed, houseContext) }],
        temperature: 0.6,
        max_tokens: 450,
        response_format: { type: "json_object" },
      });
      const responseSchema = z.object({
        message: z.string().trim().min(1),
        followUpQuestions: z.array(z.string().trim().min(1)).min(2).max(3),
      });
      const raw = completion.choices[0]?.message?.content ?? "{}";
      return res.json(responseSchema.parse(JSON.parse(raw)));
    } catch (error) {
      console.error("[AI DRAFT MESSAGE] Error:", error);
      return res.status(500).json({ message: "Failed to generate message draft" });
    }
  };
}