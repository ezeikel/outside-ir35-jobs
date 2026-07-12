import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';
import { BLOG_MODEL } from './generate.js';
import type { BlogCategory, BlogTopic } from './topics.js';

/**
 * The "never runs dry" guarantee. The fixed BLOG_TOPICS seed list is finite, so
 * once daily generation exhausts it this asks Claude to PROPOSE a fresh batch of
 * on-brand outside-IR35 / contracting topics that are NOT already covered.
 * Deduped against both the already-covered set (existing posts) and the fixed
 * seed titles, so it never resurfaces a topic. This is what lets the blog post
 * daily forever without repeating itself.
 *
 * Kept in-memory (no Sanity backlog doc needed): we generate candidates on
 * demand, filter, and return the novel ones. The idempotency anchor stays the
 * same `generationMeta.topic` string used everywhere else in the pipeline.
 *
 * Dynamic topics are ALWAYS non-data-backed and NEVER 'market-rates': a
 * day-rate post is gated on live benchmark samples, which a freshly-invented
 * topic has no guarantee of. So the model only ever picks a guidance /
 * contracting / compliance category, and we force `dataBacked: false`.
 */

const DYNAMIC_CATEGORIES: readonly BlogCategory[] = [
  'ir35-guidance',
  'contracting',
  'compliance',
] as const;

const dynamicTopicSchema = z.object({
  topics: z
    .array(
      z.object({
        topic: z
          .string()
          .describe(
            'A specific, human-readable article title (sentence case, 6-12 words, no trailing punctuation). Distinct from every excluded topic.',
          ),
        category: z
          .enum(['ir35-guidance', 'contracting', 'compliance'])
          .describe(
            "The best-fit category. Use 'ir35-guidance' for anything explaining IR35 / off-payroll status.",
          ),
        keywords: z
          .array(z.string())
          .min(2)
          .max(6)
          .describe('2-6 real long-tail search keywords for the post.'),
      }),
    )
    .min(1),
});

const DYNAMIC_SYSTEM = `You are the content strategist for outsideir35jobs.com, a UK job board for limited-company contractors who want outside-IR35 work. Propose fresh, genuinely useful, SEO-relevant blog topics for that audience.

Rules:
- Topics must be EDUCATIONAL, not advice. Explain how IR35 / off-payroll, contracting and compliance work; never tell a reader their own status or give a legal/tax recommendation. IR35 status is fact-specific and only the end client can determine it via a Status Determination Statement.
- Each topic must be DISTINCT from the ones already covered (given below). No near-duplicates, no rephrasings, no synonyms of a covered topic.
- Prefer specific, long-tail, question-shaped angles a UK contractor actually searches ("can my client blanket-assess IR35", "what a Key Information Document must show", "notice periods in a contractor agreement") over broad generic titles.
- Stay strictly on-domain: UK outside-IR35 / off-payroll working, limited-company contracting, day-rate market awareness, and contractor compliance (tax, VAT, insurance, Companies House). No unrelated topics.
- NEVER propose a topic that would require asserting a role is "verified outside IR35" or inventing statistics, day rates, or case law.
- The employment-rights regulator is the Fair Work Agency (FWA); do NOT reference EASI (abolished).
- Human-readable sentence-case titles. Keywords must be real search phrases.`;

/**
 * Ask Claude for a batch of novel topics, filter out anything already covered
 * or in the fixed seed list, and return them as fully-typed BlogTopic[].
 * `covered` is the set of existing `generationMeta.topic` strings; `seedSlugs`
 * is the fixed BLOG_TOPICS titles (see topics.ts `seedTopicSlugs`).
 */
export const generateDynamicTopics = async (
  covered: Set<string>,
  seedSlugs: Set<string>,
  count = 8,
): Promise<BlogTopic[]> => {
  const excluded = [...new Set([...covered, ...seedSlugs])];
  const excludedList =
    excluded.length > 0
      ? excluded.map((t) => `- ${t}`).join('\n')
      : '(none yet)';

  const { object } = await generateObject({
    model: anthropic(BLOG_MODEL),
    schema: dynamicTopicSchema,
    system: DYNAMIC_SYSTEM,
    prompt:
      `Already-covered topics (DO NOT repeat, rephrase, or invert these):\n${excludedList}\n\n` +
      `Propose ${count} NEW, distinct outsideir35jobs.com blog topics.`,
  });

  // Belt-and-braces: filter again in code in case the model repeated one, and
  // dedup case-insensitively on the title (the pipeline dedups on this string).
  const seenLower = new Set(excluded.map((t) => t.toLowerCase()));
  const fresh: BlogTopic[] = [];
  for (const t of object.topics) {
    const topic = t.topic.trim();
    const key = topic.toLowerCase();
    if (!topic || seenLower.has(key)) continue;
    if (!DYNAMIC_CATEGORIES.includes(t.category)) continue;
    seenLower.add(key);
    fresh.push({
      topic,
      category: t.category,
      keywords: t.keywords,
      // Dynamic topics are never gated on day-rate data.
      dataBacked: false,
    });
  }
  return fresh;
};
