export type GeoContentAuditInput = {
  title: string;
  headings: string;
  body: string;
  referenceNotes: string;
};

export type GeoContentAuditResult = {
  score: number;
  summary: string;
  atomicAnswerCoverage: {
    coveredSections: number;
    totalSections: number;
    ratio: number;
  };
  csqaf: {
    citations: boolean;
    statistics: boolean;
    quotations: boolean;
    authoritativeness: boolean;
    fluency: boolean;
  };
  issues: string[];
  suggestions: string[];
};

function normalizeText(value: string) {
  return value.trim();
}

function countWords(value: string) {
  const matches = value.match(/[A-Za-z0-9%'-]+/g);
  return matches ? matches.length : 0;
}

function splitSections(body: string) {
  const normalizedBody = normalizeText(body);

  if (!normalizedBody) {
    return [] as string[];
  }

  const sections = normalizedBody
    .split(/\n(?=##\s|###\s)/)
    .map((section) => section.trim())
    .filter(Boolean);

  return sections.length > 0 ? sections : [normalizedBody];
}

function getSectionLeadParagraph(section: string) {
  const withoutHeading = section.replace(/^(##|###)\s+.*$/m, "").trim();
  const paragraphs = withoutHeading
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return paragraphs[0] ?? "";
}

function hasCitationSignals(body: string, referenceNotes: string) {
  return (
    /\bsource\b/i.test(body) ||
    /\baccording to\b/i.test(body) ||
    /https?:\/\//i.test(body) ||
    /\bsource\b/i.test(referenceNotes) ||
    /https?:\/\//i.test(referenceNotes)
  );
}

function hasStatisticSignals(body: string) {
  return /\b\d+(\.\d+)?%?\b/.test(body);
}

function hasQuotationSignals(body: string) {
  return /["“”'‘’]/.test(body);
}

function hasAuthoritativenessSignals(referenceNotes: string, body: string) {
  return (
    /\bexpert\b/i.test(referenceNotes) ||
    /\bresearch\b/i.test(referenceNotes) ||
    /\breport\b/i.test(referenceNotes) ||
    /\bstudy\b/i.test(body) ||
    /\bdata\b/i.test(body)
  );
}

function hasFluencySignals(body: string) {
  const sentences = body
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length === 0) {
    return false;
  }

  const averageWords =
    sentences.reduce((total, sentence) => total + countWords(sentence), 0) /
    sentences.length;

  return averageWords >= 8 && averageWords <= 24;
}

function buildSummary(score: number, issues: string[]) {
  if (score >= 0.85) {
    return "This draft already reads like a strong GEO-ready answer page.";
  }

  if (score >= 0.6) {
    return issues.length > 0
      ? "This draft is on the right track, but a few GEO extraction gaps remain."
      : "This draft has a workable GEO structure with room for stronger evidence.";
  }

  return "This draft still needs stronger direct answers and evidence before it is GEO-ready.";
}

export function auditGeoContent(
  input: GeoContentAuditInput,
): GeoContentAuditResult {
  const title = normalizeText(input.title);
  const headings = normalizeText(input.headings);
  const body = normalizeText(input.body);
  const referenceNotes = normalizeText(input.referenceNotes);
  const sections = splitSections(body);
  const totalSections = Math.max(
    sections.length,
    headings
      .split("\n")
      .map((heading) => heading.trim())
      .filter(Boolean).length,
  );
  const coveredSections = sections.filter((section) => {
    const leadParagraph = getSectionLeadParagraph(section);
    const leadWordCount = countWords(leadParagraph);
    return leadWordCount >= 40 && leadWordCount <= 60;
  }).length;
  const ratio = totalSections > 0 ? coveredSections / totalSections : 0;
  const csqaf = {
    citations: hasCitationSignals(body, referenceNotes),
    statistics: hasStatisticSignals(body),
    quotations: hasQuotationSignals(body),
    authoritativeness: hasAuthoritativenessSignals(referenceNotes, body),
    fluency: hasFluencySignals(body),
  };

  const issues: string[] = [];
  const suggestions: string[] = [];

  if (!title) {
    issues.push("Add a clear title so the page has a focused entity and topic.");
  }

  if (totalSections > 0 && ratio < 1) {
    issues.push(
      `Only ${coveredSections} of ${totalSections} sections start with a 40-60 word direct answer.`,
    );
    suggestions.push(
      "Under each H2/H3, lead with one direct answer paragraph before adding context.",
    );
  }

  if (!csqaf.citations) {
    issues.push("The draft lacks explicit source or citation signals.");
    suggestions.push(
      "Add named sources, linked references, or attribution phrases like 'According to...'.",
    );
  }

  if (!csqaf.statistics) {
    issues.push("The draft does not surface quantitative evidence yet.");
    suggestions.push(
      "Add at least one concrete number, percentage, or measured comparison.",
    );
  }

  if (!csqaf.quotations) {
    suggestions.push(
      "Add a short expert quotation or quoted phrasing if a source provides one.",
    );
  }

  if (!csqaf.authoritativeness) {
    issues.push("Authority cues are currently weak.");
    suggestions.push(
      "Reference a report, study, expert, or official data source to strengthen trust.",
    );
  }

  if (!csqaf.fluency) {
    issues.push("Sentence rhythm looks harder to extract cleanly.");
    suggestions.push(
      "Shorten dense paragraphs and keep sentence length more even for easier model extraction.",
    );
  }

  const score = Math.min(
    1,
    Math.max(
      0,
      ratio * 0.4 +
        (csqaf.citations ? 0.15 : 0) +
        (csqaf.statistics ? 0.15 : 0) +
        (csqaf.quotations ? 0.1 : 0) +
        (csqaf.authoritativeness ? 0.1 : 0) +
        (csqaf.fluency ? 0.1 : 0),
    ),
  );

  return {
    score,
    summary: buildSummary(score, issues),
    atomicAnswerCoverage: {
      coveredSections,
      totalSections,
      ratio,
    },
    csqaf,
    issues,
    suggestions,
  };
}
