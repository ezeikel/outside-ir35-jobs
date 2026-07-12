/**
 * The blog topic catalogue. The cron picks a random UNCOVERED topic each run
 * (dedup via Sanity generationMeta.topic). Hand-seeded — a long runway of
 * outside-IR35 / contracting topics.
 *
 * `category` drives the post's honesty handling:
 *   - 'ir35-guidance' → the post MUST carry the never-assert disclaimer
 *     (validator enforces) and cite primary gov.uk/HMRC sources.
 *   - 'market-rates'  → `dataBacked: true`; the post is gated on real day-rate
 *     samples (MIN_SAMPLE) and writes off our live benchmark numbers only.
 *   - 'contracting' / 'compliance' → general guidance.
 */

export type BlogCategory =
  | 'ir35-guidance'
  | 'market-rates'
  | 'contracting'
  | 'compliance';

export type BlogTopic = {
  topic: string;
  category: BlogCategory;
  keywords: string[];
  // True for day-rate / market posts that must clear the MIN_SAMPLE gate.
  dataBacked: boolean;
};

// Whether a category requires the IR35 never-assert disclaimer.
export const isIr35GuidanceCategory = (c: BlogCategory): boolean =>
  c === 'ir35-guidance';

export const BLOG_TOPICS: BlogTopic[] = [
  // --- IR35 guidance (disclaimer required, primary sources) ---
  {
    topic: 'What outside IR35 means for limited company contractors',
    category: 'ir35-guidance',
    keywords: ['outside IR35', 'limited company', 'contractor', 'off-payroll'],
    dataBacked: false,
  },
  {
    topic: 'How a Status Determination Statement (SDS) works',
    category: 'ir35-guidance',
    keywords: ['SDS', 'status determination statement', 'IR35', 'end client'],
    dataBacked: false,
  },
  {
    topic: 'CEST tool: what it is and why it is not determinative',
    category: 'ir35-guidance',
    keywords: ['CEST', 'HMRC', 'IR35 status', 'employment status'],
    dataBacked: false,
  },
  {
    topic: 'Mutuality of obligation after the PGMOL ruling',
    category: 'ir35-guidance',
    keywords: ['mutuality of obligation', 'PGMOL', 'IR35', 'employment status'],
    dataBacked: false,
  },
  {
    topic: 'The right of substitution and why it matters for IR35',
    category: 'ir35-guidance',
    keywords: ['substitution', 'IR35', 'personal service', 'contractor'],
    dataBacked: false,
  },
  {
    topic: 'Inside vs outside IR35: what changes for your take-home pay',
    category: 'ir35-guidance',
    keywords: ['inside IR35', 'outside IR35', 'take-home pay', 'umbrella'],
    dataBacked: false,
  },
  {
    topic: 'Who is responsible for IR35 status under the off-payroll rules',
    category: 'ir35-guidance',
    keywords: ['off-payroll', 'IR35 responsibility', 'fee-payer', 'end client'],
    dataBacked: false,
  },
  {
    topic: 'Small company exemption from the off-payroll rules',
    category: 'ir35-guidance',
    keywords: [
      'small company exemption',
      'IR35',
      'off-payroll',
      'Companies Act',
    ],
    dataBacked: false,
  },
  {
    topic: 'What a contract review checks for IR35 purposes',
    category: 'ir35-guidance',
    keywords: ['contract review', 'IR35', 'working practices', 'contractor'],
    dataBacked: false,
  },
  {
    topic: 'IR35 insurance: what it covers and whether you need it',
    category: 'ir35-guidance',
    keywords: ['IR35 insurance', 'tax investigation', 'contractor', 'cover'],
    dataBacked: false,
  },

  // --- Market rates (data-backed, gated on MIN_SAMPLE) ---
  {
    topic: 'UK contractor day rates by skill: what the market is paying',
    category: 'market-rates',
    keywords: ['contractor day rates', 'UK', 'day rate', 'market rates'],
    dataBacked: true,
  },
  {
    topic: 'How day rates differ between inside and outside IR35 contracts',
    category: 'market-rates',
    keywords: ['day rate', 'inside IR35', 'outside IR35', 'rate difference'],
    dataBacked: true,
  },
  {
    topic: 'Day rate benchmarks for cloud and DevOps contractors',
    category: 'market-rates',
    keywords: ['DevOps day rate', 'cloud contractor', 'AWS', 'day rate'],
    dataBacked: true,
  },

  // --- Contracting (general) ---
  {
    topic: 'Setting your day rate as a new limited company contractor',
    category: 'contracting',
    keywords: ['day rate', 'limited company', 'pricing', 'contractor'],
    dataBacked: false,
  },
  {
    topic: 'Limited company vs umbrella: choosing how to contract',
    category: 'contracting',
    keywords: ['limited company', 'umbrella company', 'contractor', 'IR35'],
    dataBacked: false,
  },
  {
    topic: 'How to find your first outside-IR35 contract',
    category: 'contracting',
    keywords: ['first contract', 'outside IR35', 'contractor', 'job search'],
    dataBacked: false,
  },
  {
    topic: 'Building a contractor CV that wins outside-IR35 roles',
    category: 'contracting',
    keywords: ['contractor CV', 'outside IR35', 'job application', 'skills'],
    dataBacked: false,
  },
  {
    topic: 'Negotiating contract extensions and rate rises',
    category: 'contracting',
    keywords: ['contract extension', 'rate rise', 'negotiation', 'contractor'],
    dataBacked: false,
  },

  // --- Compliance (general) ---
  {
    topic: 'VAT registration for limited company contractors',
    category: 'compliance',
    keywords: [
      'VAT registration',
      'limited company',
      'flat rate scheme',
      'contractor',
    ],
    dataBacked: false,
  },
  {
    topic: 'The professional indemnity insurance contractors need',
    category: 'compliance',
    keywords: ['professional indemnity', 'insurance', 'contractor', 'cover'],
    dataBacked: false,
  },
  {
    topic: 'Right to work checks for UK contractors',
    category: 'compliance',
    keywords: ['right to work', 'compliance', 'contractor', 'UK'],
    dataBacked: false,
  },
  {
    topic: 'Keeping good records as a limited company contractor',
    category: 'compliance',
    keywords: ['record keeping', 'limited company', 'accounts', 'HMRC'],
    dataBacked: false,
  },

  // --- Seed top-up (extends the runway for daily generation; the
  //     dynamic-topics engine takes over once even these are exhausted) ---

  // IR35 guidance (disclaimer required, primary sources)
  {
    topic:
      'How the off-payroll rules changed in April 2021 for the private sector',
    category: 'ir35-guidance',
    keywords: ['off-payroll', 'April 2021', 'private sector', 'IR35 reform'],
    dataBacked: false,
  },
  {
    topic:
      'What happens if a client disagrees with your IR35 status determination',
    category: 'ir35-guidance',
    keywords: [
      'status disagreement',
      'client-led disagreement process',
      'SDS',
      'IR35',
    ],
    dataBacked: false,
  },
  {
    topic: 'The client-led disagreement process explained for contractors',
    category: 'ir35-guidance',
    keywords: [
      'disagreement process',
      'SDS challenge',
      'end client',
      'off-payroll',
    ],
    dataBacked: false,
  },
  {
    topic: 'Reasonable care: what an end client must do when assessing IR35',
    category: 'ir35-guidance',
    keywords: ['reasonable care', 'end client', 'blanket assessment', 'IR35'],
    dataBacked: false,
  },
  {
    topic: 'Blanket IR35 determinations and why they carry risk for clients',
    category: 'ir35-guidance',
    keywords: [
      'blanket determination',
      'role-based',
      'reasonable care',
      'IR35',
    ],
    dataBacked: false,
  },
  {
    topic: 'Control as an IR35 factor: what, how, when and where you work',
    category: 'ir35-guidance',
    keywords: ['control', 'IR35 factors', 'employment status', 'supervision'],
    dataBacked: false,
  },
  {
    topic: 'Part and parcel of the organisation as an employment-status factor',
    category: 'ir35-guidance',
    keywords: [
      'part and parcel',
      'employment status',
      'IR35 factors',
      'integration',
    ],
    dataBacked: false,
  },
  {
    topic: 'Financial risk and being in business on your own account for IR35',
    category: 'ir35-guidance',
    keywords: [
      'financial risk',
      'in business on your own account',
      'IR35',
      'contractor',
    ],
    dataBacked: false,
  },
  {
    topic: 'What a deemed employment payment is under the off-payroll rules',
    category: 'ir35-guidance',
    keywords: ['deemed employment payment', 'off-payroll', 'fee-payer', 'PAYE'],
    dataBacked: false,
  },
  {
    topic: 'How the fee-payer handles tax and NIC on an inside-IR35 contract',
    category: 'ir35-guidance',
    keywords: ['fee-payer', 'PAYE', 'National Insurance', 'inside IR35'],
    dataBacked: false,
  },
  {
    topic: 'Overseas clients and the off-payroll rules: who determines status',
    category: 'ir35-guidance',
    keywords: ['overseas client', 'off-payroll', 'UK establishment', 'IR35'],
    dataBacked: false,
  },
  {
    topic: 'The Fair Work Agency and what it means for contractor rights',
    category: 'ir35-guidance',
    keywords: [
      'Fair Work Agency',
      'employment rights',
      'contractor',
      'enforcement',
    ],
    dataBacked: false,
  },

  // Contracting (general)
  {
    topic: 'How umbrella company take-home pay is calculated',
    category: 'contracting',
    keywords: [
      'umbrella company',
      'take-home pay',
      'assignment rate',
      'deductions',
    ],
    dataBacked: false,
  },
  {
    topic:
      'Reading a Key Information Document before you sign with an umbrella',
    category: 'contracting',
    keywords: [
      'Key Information Document',
      'umbrella company',
      'assignment rate',
      'contractor',
    ],
    dataBacked: false,
  },
  {
    topic: 'Spotting a non-compliant umbrella or disguised remuneration scheme',
    category: 'contracting',
    keywords: [
      'non-compliant umbrella',
      'disguised remuneration',
      'tax avoidance',
      'contractor',
    ],
    dataBacked: false,
  },
  {
    topic: 'Working through a recruitment agency as an outside-IR35 contractor',
    category: 'contracting',
    keywords: ['recruitment agency', 'outside IR35', 'contract chain', 'PSC'],
    dataBacked: false,
  },
  {
    topic: 'Understanding the contract chain: end client, agency and your PSC',
    category: 'contracting',
    keywords: ['contract chain', 'PSC', 'agency', 'fee-payer'],
    dataBacked: false,
  },
  {
    topic: 'Notice periods and termination clauses in contractor agreements',
    category: 'contracting',
    keywords: ['notice period', 'termination clause', 'contract', 'contractor'],
    dataBacked: false,
  },
  {
    topic: 'How to handle a gap between outside-IR35 contracts',
    category: 'contracting',
    keywords: ['contract gap', 'between contracts', 'contractor', 'cash flow'],
    dataBacked: false,
  },
  {
    topic: 'Writing an outside-IR35-friendly working practices summary',
    category: 'contracting',
    keywords: [
      'working practices',
      'outside IR35',
      'contract review',
      'evidence',
    ],
    dataBacked: false,
  },

  // Compliance (general)
  {
    topic: 'Corporation tax basics for a limited company contractor',
    category: 'compliance',
    keywords: [
      'corporation tax',
      'limited company',
      'contractor',
      'accounting',
    ],
    dataBacked: false,
  },
  {
    topic: 'Dividends vs salary: how contractors typically pay themselves',
    category: 'compliance',
    keywords: ['dividends', 'salary', 'director', 'limited company'],
    dataBacked: false,
  },
  {
    topic: 'Allowable business expenses for outside-IR35 contractors',
    category: 'compliance',
    keywords: [
      'business expenses',
      'allowable expenses',
      'limited company',
      'HMRC',
    ],
    dataBacked: false,
  },
  {
    topic: 'The Flat Rate VAT Scheme and whether it suits contractors',
    category: 'compliance',
    keywords: ['Flat Rate Scheme', 'VAT', 'limited company', 'contractor'],
    dataBacked: false,
  },
  {
    topic: 'Making Tax Digital: what it means for contractor bookkeeping',
    category: 'compliance',
    keywords: ['Making Tax Digital', 'MTD', 'bookkeeping', 'limited company'],
    dataBacked: false,
  },
  {
    topic: 'Confirmation statements and annual filings at Companies House',
    category: 'compliance',
    keywords: [
      'confirmation statement',
      'Companies House',
      'annual filing',
      'limited company',
    ],
    dataBacked: false,
  },
  {
    topic: 'Choosing an accountant who understands contracting and IR35',
    category: 'compliance',
    keywords: ['contractor accountant', 'IR35', 'limited company', 'advice'],
    dataBacked: false,
  },
];

/**
 * The fixed seed-topic slugs (the `topic` string is the dedup + idempotency key
 * across the whole pipeline and in Sanity `generationMeta.topic`). The dynamic
 * never-dry engine excludes these so it never re-proposes a hand-seeded topic.
 */
export const seedTopicSlugs = (): Set<string> =>
  new Set(BLOG_TOPICS.map((t) => t.topic));
