import "server-only";
import { randomUUID } from "node:crypto";
import { attributeLabels, buildKnowledgeContext, getKnowledgeOptions } from "@/lib/ai-blog/knowledge-context";
import { callStructured, type LlmResult } from "@/lib/ai-blog/openai";
import {
  BLOG_OUTPUT_SCHEMA,
  REWRITE_OUTPUT_SCHEMA,
  REWRITE_SYSTEM_PROMPT,
  buildBlogSystemPrompt,
  buildBlogUserPrompt,
  buildRewriteUserPrompt,
  type PromptPair,
} from "@/lib/ai-blog/prompts";
import { stripBannedPhrases, toPlainText } from "@/lib/ai-blog/sanitize";
import type { ProjectBundle } from "@/lib/ai-blog/server";
import type { BlogMode, BusinessProfile, ContentBlock, ContentVariant, MediaPair } from "@/lib/ai-blog/types";

type RawDraft = {
  titles: string[];
  blocks: { kind: "heading" | "paragraph" | "pair"; text: string; pair_no: number }[];
};

export type GeneratedDraft = {
  title: string;
  titleCandidates: string[];
  blocks: ContentBlock[];
  llm: Omit<LlmResult<unknown>, "data">;
};

function usablePairs(pairs: MediaPair[]): MediaPair[] {
  return pairs.filter((p) => p.before_media_id || p.after_media_id);
}

function pairBlocks(pair: MediaPair): ContentBlock[] {
  const out: ContentBlock[] = [];
  if (pair.before_media_id) {
    out.push({ id: randomUUID(), type: "image", media_id: pair.before_media_id, role: "BEFORE", pair_id: pair.id });
  }
  if (pair.after_media_id) {
    out.push({ id: randomUUID(), type: "image", media_id: pair.after_media_id, role: "AFTER", pair_id: pair.id });
  }
  return out;
}

function cleanParagraph(text: string, banned: string[]): string {
  return toPlainText(stripBannedPhrases(text, banned));
}

/** AI 출력 → 블록. 모든 짝이 정확히 한 번, 지정 순서로 들어가도록 보정 */
function toBlocks(raw: RawDraft, pairs: MediaPair[], banned: string[]): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const used = new Set<number>();
  let nextExpected = 1;

  for (const b of raw.blocks ?? []) {
    if (b.kind === "heading") {
      const text = cleanParagraph(b.text ?? "", banned)
        .replace(/\s*\n\s*/g, " ")
        .replace(/[.。]+$/, "")
        .slice(0, 40)
        .trim();
      if (!text) continue;
      const last = blocks[blocks.length - 1];
      if (last?.type === "heading") last.text = text;
      else blocks.push({ id: randomUUID(), type: "heading", text });
      continue;
    }
    if (b.kind === "paragraph") {
      const text = cleanParagraph(b.text ?? "", banned);
      if (text) blocks.push({ id: randomUUID(), type: "paragraph", text });
      continue;
    }
    const no = b.pair_no;
    if (!Number.isInteger(no) || no < 1 || no > pairs.length || used.has(no)) continue;
    // 순서를 건너뛴 짝은 이 위치 앞에 먼저 넣어 순서를 지킨다
    while (nextExpected < no) {
      if (!used.has(nextExpected)) {
        blocks.push(...pairBlocks(pairs[nextExpected - 1]));
        used.add(nextExpected);
      }
      nextExpected++;
    }
    blocks.push(...pairBlocks(pairs[no - 1]));
    used.add(no);
    nextExpected = no + 1;
  }

  while (blocks.length && blocks[blocks.length - 1].type === "heading") blocks.pop();

  const missing = pairs.map((_, i) => i + 1).filter((no) => !used.has(no));
  if (missing.length) {
    const lastParagraph = blocks.map((b) => b.type).lastIndexOf("paragraph");
    let insertAt = lastParagraph > 0 ? lastParagraph : blocks.length;
    if (insertAt > 0 && blocks[insertAt - 1]?.type === "heading") insertAt--;
    blocks.splice(insertAt, 0, ...missing.flatMap((no) => pairBlocks(pairs[no - 1])));
  }
  return blocks;
}

function cleanTitles(titles: string[], keyword: string, banned: string[]): string[] {
  const out = Array.from(
    new Set(
      (titles ?? [])
        .map((t) => cleanParagraph(t, banned).replace(/\n/g, " ").slice(0, 60).trim())
        .filter(Boolean),
    ),
  ).slice(0, 3);
  if (!out.length) out.push(`${keyword} 현장 후기`);
  return out;
}

export async function generateBlogDraft(args: {
  bundle: ProjectBundle;
  profile: BusinessProfile;
  keyword: string;
  secondaryKeywords: string[];
  extraRequest: string;
  mode: BlogMode;
  variant: ContentVariant;
}): Promise<GeneratedDraft> {
  const { bundle, profile } = args;
  const [options, knowledge] = await Promise.all([getKnowledgeOptions(), buildKnowledgeContext(bundle.attributes)]);
  const pairs = usablePairs(bundle.pairs);
  const promptPairs: PromptPair[] = pairs.map((p, i) => ({
    no: i + 1,
    label: p.label,
    memo: p.memo,
    hasBefore: Boolean(p.before_media_id),
    hasAfter: Boolean(p.after_media_id),
  }));

  const result = await callStructured<RawDraft>({
    system: buildBlogSystemPrompt(args.mode, args.variant),
    user: buildBlogUserPrompt({
      profile,
      project: bundle.project,
      labels: attributeLabels(bundle.attributes, options),
      pairs: promptPairs,
      knowledgeText: knowledge.promptText,
      keyword: args.keyword,
      secondaryKeywords: args.secondaryKeywords,
      extraRequest: args.extraRequest,
      mode: args.mode,
      variant: args.variant,
    }),
    format: BLOG_OUTPUT_SCHEMA as unknown as { name: string; strict: boolean; schema: Record<string, unknown> },
    temperature: 0.8,
  });

  const { data, ...llm } = result;
  const titleCandidates = cleanTitles(data.titles, args.keyword, profile.banned_phrases);
  return {
    title: titleCandidates[0],
    titleCandidates,
    blocks: toBlocks(data, pairs, profile.banned_phrases),
    llm,
  };
}

export async function rewriteParagraph(args: {
  title: string;
  keyword: string;
  previous: string | null;
  target: string;
  next: string | null;
  hint: string;
  banned: string[];
}): Promise<{ text: string; llm: Omit<LlmResult<unknown>, "data"> }> {
  const result = await callStructured<{ text: string }>({
    system: REWRITE_SYSTEM_PROMPT,
    user: buildRewriteUserPrompt(args),
    format: REWRITE_OUTPUT_SCHEMA as unknown as { name: string; strict: boolean; schema: Record<string, unknown> },
    temperature: 0.9,
    maxOutputTokens: 800,
  });
  const { data, ...llm } = result;
  return { text: cleanParagraph(data.text ?? "", args.banned), llm };
}
