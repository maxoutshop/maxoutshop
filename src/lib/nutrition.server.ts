import type { ParsedFoodItem } from "./nutrition.types";

export type { ParsedFoodItem };

const SYSTEM = `You are a precise nutrition estimator for a fitness app.
Given a description or photo of food, break it into individual food items.
For each item estimate a realistic portion and its macros in grams and calories.
Use US restaurant/grocery portion norms when the user is vague.
Return at most 8 items. Keep names short (max 4 words), quantity short (e.g. "1 cup", "6 oz").
Respond with JSON only, shaped: {"items":[{"name":"","quantity":"","calories":0,"protein":0,"carbs":0,"fat":0}]}`;

type Content =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export async function estimateFood(input: { text?: string; imageDataUrl?: string }): Promise<ParsedFoodItem[]> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured.");

  const content: Content[] = [];
  content.push({
    type: "text",
    text: input.imageDataUrl
      ? `Identify the food in this photo and estimate macros.${input.text ? ` Extra context: ${input.text}` : ""}`
      : `Food eaten: ${input.text ?? ""}`,
  });
  if (input.imageDataUrl) content.push({ type: "image_url", image_url: { url: input.imageDataUrl } });

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: "openai/gpt-5.6-sol",
      reasoning_effort: "none",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content },
      ],
    }),
  });

  if (res.status === 429) throw new Error("Too many requests right now — try again in a moment.");
  if (res.status === 402) throw new Error("AI credits are exhausted. Add credits to keep using AI logging.");
  if (!res.ok) throw new Error(`Couldn't read that meal (${res.status}). Try rewording it.`);

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = json.choices?.[0]?.message?.content ?? "";
  return normalize(raw);
}

function normalize(raw: string): ParsedFoodItem[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return [];
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return [];
    }
  }
  const items = (parsed as { items?: unknown })?.items;
  if (!Array.isArray(items)) return [];
  return items.slice(0, 8).map((i) => {
    const o = (i ?? {}) as Record<string, unknown>;
    return {
      name: String(o["name"] ?? "Food").slice(0, 60),
      quantity: String(o["quantity"] ?? "").slice(0, 30),
      calories: num(o["calories"]),
      protein: num(o["protein"]),
      carbs: num(o["carbs"]),
      fat: num(o["fat"]),
    };
  });
}

function num(v: unknown) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 5000) : 0;
}
