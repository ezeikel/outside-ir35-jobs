import { getDayRateBenchmarks, totalBenchmarkSample } from './benchmarks.js';
import { generateDynamicTopics } from './dynamic-topics.js';
import { BLOG_MODEL, generateContent, generateMeta } from './generate.js';
import { generateBlogFeaturedImage } from './image.js';
import { markdownToPortableText } from './portable-text.js';
import { researchTopic } from './research.js';
import {
  createPost,
  getCoveredTopics,
  isTopicCovered,
  lookupOrCreateAuthor,
  sanityConfigured,
} from './sanity.js';
import {
  BLOG_TOPICS,
  type BlogTopic,
  isIr35GuidanceCategory,
  seedTopicSlugs,
} from './topics.js';
import { validatePost } from './validator.js';

// The blog's AI author personas (each a real Sanity author doc, for the
// byline/bio). One is picked at random per post. Bios are honest about scope:
// these are editorial explainers for UK contractors, not personalised advice,
// and the platform never determines IR35 status.
type BlogAuthor = { name: string; title: string; bio: string };

const AUTHORS: BlogAuthor[] = [
  {
    name: 'The outsideir35jobs.com Team',
    title: 'Editorial',
    bio: 'Practical guidance for UK limited-company contractors who want outside-IR35 work. We surface what clients state and what is objectively checkable, and we never determine IR35 status.',
  },
  {
    name: 'Priya Nair',
    title: 'Contracting Editor',
    bio: 'Priya writes plain-English explainers on off-payroll working, contract chains and day-rate markets for UK limited-company contractors. Educational only, not tax or legal advice.',
  },
  {
    name: 'James Okafor',
    title: 'Compliance Writer',
    bio: 'James covers the paperwork side of contracting: VAT, Companies House filings, expenses and record-keeping. He explains how the rules work; your own accountant applies them to you.',
  },
  {
    name: 'Sarah Whitfield',
    title: 'IR35 Explainers',
    bio: 'Sarah breaks down IR35 and employment-status concepts (substitution, control, the SDS, the Fair Work Agency) from primary gov.uk and HMRC sources. Status is fact-specific; consult a specialist.',
  },
];

// Random author per post. Math.random is fine in the worker runtime (Node/tsx).
const pickAuthor = (): BlogAuthor =>
  AUTHORS[Math.floor(Math.random() * AUTHORS.length)];

const pickTopic = (
  covered: Set<string>,
  override?: string,
): BlogTopic | null => {
  if (override) {
    const exact = BLOG_TOPICS.find((t) => t.topic === override);
    if (exact) return exact;
    const sub = BLOG_TOPICS.find((t) =>
      t.topic.toLowerCase().includes(override.toLowerCase()),
    );
    return sub ?? null;
  }
  const uncovered = BLOG_TOPICS.filter((t) => !covered.has(t.topic));
  if (uncovered.length === 0) return null;
  // Deterministic rotation by covered count (stable across a run; no RNG needed here).
  return uncovered[covered.size % uncovered.length];
};

export type BlogCronResult = {
  status: 'written' | 'dryRun' | 'skipped' | 'rejected';
  topic?: string;
  postId?: string;
  reason?: string;
};

/**
 * One blog generation run: pick an uncovered topic → research (Perplexity) →
 * generate (Claude) → validate (honesty backstop) → write to Sanity. A
 * data-backed topic is aborted unless the day-rate benchmark clears MIN_SAMPLE.
 * A post failing the validator is REJECTED, never written.
 */
export const runBlogCron = async (opts?: {
  topicOverride?: string;
  dryRun?: boolean;
  todayIso?: string;
}): Promise<BlogCronResult> => {
  const dryRun = opts?.dryRun ?? false;
  const todayIso = opts?.todayIso ?? new Date().toISOString();

  if (!sanityConfigured && !dryRun) {
    console.warn('[blog-cron] Sanity not configured — skipping');
    return { status: 'skipped', reason: 'sanity_not_configured' };
  }

  const coveredList =
    dryRun && opts?.topicOverride ? [] : await getCoveredTopics();
  const covered = new Set(coveredList);
  let topic = pickTopic(covered, opts?.topicOverride);

  // Never-dry fallback: the fixed seed list is finite, so once every seed topic
  // is covered `pickTopic` returns null. Rather than skip the run, ask Claude
  // for a fresh batch of on-brand, deduped topics and take the first novel one.
  // Only skipped when a specific topic was pinned (an override that matched
  // nothing is a caller error, not exhaustion).
  if (!topic && !opts?.topicOverride) {
    try {
      const dynamic = await generateDynamicTopics(covered, seedTopicSlugs());
      topic = dynamic[0] ?? null;
      if (topic) {
        console.info(
          `[blog-cron] seed list exhausted; generated dynamic topic "${topic.topic}"`,
        );
      }
    } catch (err) {
      console.error('[blog-cron] dynamic topic generation failed:', err);
    }
  }

  if (!topic) {
    console.info(
      '[blog-cron] no topic available (seed + dynamic): nothing to do',
    );
    return { status: 'skipped', reason: 'no_uncovered_topic' };
  }

  // Race-guard: re-check (unless overriding/dry-running a specific topic).
  if (!opts?.topicOverride && (await isTopicCovered(topic.topic))) {
    return { status: 'skipped', topic: topic.topic, reason: 'already_covered' };
  }

  const isIr35Guidance = isIr35GuidanceCategory(topic.category);

  // Data-backed gate: a day-rate post only proceeds if the benchmark clears the
  // sample-size gate. Otherwise abort honestly (no thin-data stats post).
  const benchmarks = topic.dataBacked ? await getDayRateBenchmarks() : [];
  const benchmarkSample = totalBenchmarkSample(benchmarks);
  if (topic.dataBacked && benchmarkSample < 5) {
    console.info(
      `[blog-cron] data-backed topic "${topic.topic}" aborted: only ${benchmarkSample} samples`,
    );
    return {
      status: 'skipped',
      topic: topic.topic,
      reason: 'insufficient_data',
    };
  }

  const research = await researchTopic(topic, todayIso);
  const meta = await generateMeta(topic);
  const content = await generateContent({
    topic,
    research,
    benchmarks,
    isIr35Guidance,
  });

  // Honesty backstop — reject (do NOT write) if it fails.
  const verdict = validatePost({
    markdown: content.markdown,
    isIr35Guidance,
    dataBacked: topic.dataBacked,
    benchmarkSampleCount: benchmarkSample,
  });
  if (!verdict.ok) {
    console.error(
      `[blog-cron] REJECTED "${topic.topic}" — honesty violations:`,
      JSON.stringify(verdict.violations),
    );
    // Surface to Sentry via a thrown error in the caller; here we return rejected.
    return {
      status: 'rejected',
      topic: topic.topic,
      reason: verdict.violations.map((v) => v.kind).join(','),
    };
  }

  const body = markdownToPortableText(content.markdown);

  if (dryRun) {
    console.info('[blog-cron] DRY RUN — would write post:', {
      topic: topic.topic,
      title: meta.title,
      slug: meta.slug,
      wordCount: content.wordCount,
      blocks: body.length,
      dataBacked: topic.dataBacked,
      benchmarkSample,
      researched: Boolean(research),
    });
    return { status: 'dryRun', topic: topic.topic };
  }

  // Featured image (non-blocking): Pexels high-match -> gpt-image-2 fallback ->
  // Sanity asset. Returns undefined on any failure; the post still publishes.
  const featuredImage = await generateBlogFeaturedImage(
    meta.title,
    meta.excerpt,
  );

  const authorId = await lookupOrCreateAuthor(pickAuthor());
  const postId = await createPost({
    title: meta.title,
    slug: meta.slug,
    excerpt: meta.excerpt,
    body,
    featuredImage,
    authorId,
    publishedAt: todayIso,
    seo: {
      metaTitle: meta.title,
      metaDescription: meta.metaDescription,
      keywords: meta.keywords,
    },
    generationMeta: {
      topic: topic.topic,
      generatedAt: todayIso,
      model: BLOG_MODEL,
      sourcesCheckedAt: research?.sourcesCheckedAt ?? null,
      dataBacked: topic.dataBacked,
    },
  });

  console.info(`[blog-cron] published "${meta.title}" (${postId})`);
  return { status: 'written', topic: topic.topic, postId };
};
