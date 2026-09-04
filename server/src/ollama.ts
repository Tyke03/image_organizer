import sharp from "sharp";
import { getSettings } from "./db.js";
import { postProcessTags } from "./lib/tags.js";

const TAG_PROMPT = `You are an image tagging engine. Look at the image and reply with ONLY a comma-separated list of single-word lowercase tags. No sentences, no numbering, no explanation. Cover: subject, objects, setting, colors, style, mood, clothing, body, NSFW content if present, and notable details. Example: woman,blonde,beach,sunset,bikini,smiling`;

export type TagResult = {
  tags: string[];
  caption: string;
  raw: string;
};

async function resizeToJpegBase64(filePath: string, maxPx: number): Promise<string> {
  const buf = await sharp(filePath)
    .rotate()
    .resize({
      width: maxPx,
      height: maxPx,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85 })
    .toBuffer();
  return buf.toString("base64");
}

/**
 * Vision tagging via Ollama native /api/chat (images as base64).
 * This is the primary path — native chat supports vision reliably.
 * Fallback: OpenAI-compatible /v1/chat/completions with image_url data URI.
 */
export async function tagImage(filePath: string): Promise<TagResult> {
  const settings = getSettings();
  const base = settings.ollamaUrl.replace(/\/$/, "");
  const model = settings.ollamaModel;
  const maxPx = Number(settings.maxImagePx) || 768;
  const b64 = await resizeToJpegBase64(filePath, maxPx);

  try {
    return await tagViaNativeChat(base, model, b64);
  } catch (err) {
    console.warn("[ollama] native /api/chat failed, trying OpenAI-compatible:", err);
    return await tagViaOpenAICompat(base, model, b64);
  }
}

async function tagViaNativeChat(base: string, model: string, b64: string): Promise<TagResult> {
  const res = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        {
          role: "user",
          content: TAG_PROMPT,
          images: [b64],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Ollama /api/chat ${res.status}: ${body}`);
  }

  const data = (await res.json()) as {
    message?: { content?: string };
  };
  const raw = data.message?.content ?? "";
  const tags = postProcessTags(raw);
  return { tags, caption: raw.trim().slice(0, 500), raw };
}

async function tagViaOpenAICompat(base: string, model: string, b64: string): Promise<TagResult> {
  const res = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: TAG_PROMPT },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${b64}` },
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Ollama /v1/chat/completions ${res.status}: ${body}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = data.choices?.[0]?.message?.content ?? "";
  const tags = postProcessTags(raw);
  return { tags, caption: raw.trim().slice(0, 500), raw };
}

export async function ollamaHealth(): Promise<{
  ok: boolean;
  url: string;
  model: string;
  models?: string[];
  error?: string;
}> {
  const settings = getSettings();
  const base = settings.ollamaUrl.replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      return {
        ok: false,
        url: base,
        model: settings.ollamaModel,
        error: `HTTP ${res.status}`,
      };
    }
    const data = (await res.json()) as { models?: { name: string }[] };
    const models = (data.models ?? []).map((m) => m.name);
    const hasModel = models.some(
      (n) => n === settings.ollamaModel || n.startsWith(settings.ollamaModel.split(":")[0])
    );
    return {
      ok: true,
      url: base,
      model: settings.ollamaModel,
      models,
      error: hasModel ? undefined : `Model ${settings.ollamaModel} not found in local models`,
    };
  } catch (e) {
    return {
      ok: false,
      url: base,
      model: settings.ollamaModel,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
