/** Stopwords stripped during tag post-processing */
export const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "of", "in", "on", "at", "to", "for",
  "with", "from", "by", "is", "are", "was", "were", "be", "been",
  "this", "that", "these", "those", "it", "its", "as", "into", "over",
  "under", "between", "image", "photo", "picture", "pic", "shot",
  "showing", "shows", "featuring", "contains", "depicts", "depiction",
  "very", "really", "just", "also", "some", "any", "all", "no", "not",
  "null", "none", "n/a", "na", "unknown", "other", "misc",
]);

/**
 * Force atomic single-word lowercase tags: split, strip punctuation,
 * drop stopwords/short tokens, dedupe while preserving first-seen order.
 */
export function postProcessTags(raw: string | string[]): string[] {
  const text = Array.isArray(raw) ? raw.join(" ") : String(raw ?? "");
  const seen = new Set<string>();
  const out: string[] = [];

  for (const part of text.split(/[\s,;|/]+/)) {
    let t = part
      .toLowerCase()
      .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "")
      .replace(/[^a-z0-9_-]/g, "");

    if (!t || t.length < 2) continue;
    if (STOPWORDS.has(t)) continue;
    if (/^\d+$/.test(t)) continue;
    if (seen.has(t)) continue;

    seen.add(t);
    out.push(t);
  }

  return out;
}
