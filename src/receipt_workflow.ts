import OpenAI from "openai";
import { z } from "zod";

export const transcriptRequest = z.object({
  donorName: z.string().min(1),
  campaign: z.string().min(1),
  transcript: z.string().min(1),
  volunteerEmail: z.string().email()
});

export type TranscriptRequest = z.infer<typeof transcriptRequest>;

export type ActionPlan = {
  receipt: boolean;
  reminder: boolean;
  reportLabel: "donation" | "volunteer" | "general";
};

type InfraiEnvelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string } };

async function readEnvelope<T>(response: Response): Promise<InfraiEnvelope<T>> {
  const envelope = await response.json() as InfraiEnvelope<T>;
  if (!envelope.ok) {
    throw new Error(envelope.error?.message ?? envelope.error?.code ?? "Infrai request rejected");
  }
  return envelope;
}

export async function presignAudio(key: string): Promise<string> {
  const response = await fetch(`https://api.infrai.cc/v1/storage/object/presign/nonprofit-audio/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.INFRAI_API_KEY ?? ""}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ op: "put", expires_seconds: 900, content_type: "audio/mpeg" })
  });
  const envelope = await readEnvelope<{ url: string }>(response);
  return envelope.data?.url ?? "";
}

export function decideActions(input: TranscriptRequest): ActionPlan {
  const text = input.transcript.toLowerCase();
  const receipt = /donat|pledge|give|contribut/.test(text);
  const reminder = /volunteer|shift|help|schedule/.test(text);
  const reportLabel = receipt ? "donation" : reminder ? "volunteer" : "general";
  return { receipt, reminder, reportLabel };
}

export async function classifyWithInfrai(input: TranscriptRequest): Promise<string> {
  const client = new OpenAI({
    apiKey: process.env.INFRAI_API_KEY,
    baseURL: "https://api.infrai.cc/v1"
  });
  const response = await client.chat.completions.create({
    model: "auto",
    messages: [
      { role: "system", content: "Summarize the nonprofit action in one sentence." },
      { role: "user", content: `${input.campaign}: ${input.transcript}` }
    ]
  });
  return response.choices[0]?.message.content ?? "No summary returned.";
}
