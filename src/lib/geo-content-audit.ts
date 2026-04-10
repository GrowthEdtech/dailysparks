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
  rankability: {
    score: number;
    candidatePassageCount: number;
    strongestPassageWordCount: number;
    averageCandidateWords: number;
    intentCoverage: {
      definition: boolean;
      comparison: boolean;
      workflow: boolean;
      skepticism: boolean;
      pricingDecision: boolean;
      proof: boolean;
    };
  };
  citationReadiness: {
    score: number;
    signals: {
      entityClarity: boolean;
      ibProgrammeSpecificity: boolean;
      workflowEvidence: boolean;
      parentDecisionLanguage: boolean;
      sourceOrUpdateSignal: boolean;
    };
  };
  biasResistance: {
    score: number;
    risks: {
      marketingHype: boolean;
      authorityBias: boolean;
      bandwagonBias: boolean;
      instructionBias: boolean;
      verbosityBias: boolean;
      distractionBias: boolean;
    };
    protectiveSignals: {
      neutralComparison: boolean;
      evidenceSpecificity: boolean;
      fitBoundaries: boolean;
      objectiveTone: boolean;
    };
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

function splitParagraphs(value: string) {
  return normalizeText(value)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
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
  if (hasSourceDenial(referenceNotes)) {
    return false;
  }

  return (
    /\bsource\b/i.test(body) ||
    /\baccording to\b/i.test(body) ||
    /https?:\/\//i.test(body) ||
    /\bsource\b/i.test(referenceNotes) ||
    /https?:\/\//i.test(referenceNotes)
  );
}

function hasSourceDenial(value: string) {
  return /\b(no source|no sources|source unavailable|no references?)\b/i.test(value);
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

function clampScore(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function scoreBooleanSignals(signals: Record<string, boolean>) {
  const values = Object.values(signals);

  if (values.length === 0) {
    return 0;
  }

  return values.filter(Boolean).length / values.length;
}

function hasPattern(value: string, pattern: RegExp) {
  return pattern.test(value);
}

function extractCandidatePassages(body: string) {
  return splitParagraphs(body)
    .map((paragraph) => ({
      text: paragraph,
      wordCount: countWords(paragraph),
    }))
    .filter((passage) => passage.wordCount >= 25 && passage.wordCount <= 90);
}

function buildRankabilityAssessment(options: {
  title: string;
  body: string;
  sections: string[];
  totalSections: number;
  referenceNotes: string;
}) {
  const combinedText = [
    options.title,
    options.body,
    options.referenceNotes,
  ].join("\n");
  const lowerText = combinedText.toLowerCase();
  const candidatePassages = extractCandidatePassages(options.body);
  const candidateWordCounts = candidatePassages.map((passage) => passage.wordCount);
  const averageCandidateWords = Math.round(average(candidateWordCounts));
  const strongestPassageWordCount = candidateWordCounts.reduce((best, count) => {
    if (best === 0) {
      return count;
    }

    return Math.abs(count - 55) < Math.abs(best - 55) ? count : best;
  }, 0);
  const intentCoverage = {
    definition: /daily sparks[\s\S]{0,80}\b(is|helps|sends|turns|supports|workflow)\b/i.test(
      combinedText,
    ),
    comparison:
      /\b(vs|versus|compare|comparison|alternative|unlike|rather than|replacement)\b/i.test(
        combinedText,
      ),
    workflow:
      /\b(goodnotes|notion|weekly recap|notebook|delivery|archive|routine|workflow)\b/i.test(
        combinedText,
      ),
    skepticism:
      /\b(not a replacement|not for|best for|works best|only if|fit|limitation|boundary)\b/i.test(
        combinedText,
      ),
    pricingDecision:
      /\b(trial|subscription|monthly|yearly|pricing|choose|decision|parents? who want)\b/i.test(
        combinedText,
      ),
    proof:
      /\b(according to|source|report|study|data|evidence|updated|notes?|202\d|\d+%?)\b/i.test(
        combinedText,
      ),
  };
  const passageCoverage =
    options.totalSections > 0
      ? Math.min(1, candidatePassages.length / options.totalSections)
      : candidatePassages.length > 0
        ? 1
        : 0;
  const passageLengthScore =
    averageCandidateWords > 0
      ? 1 - Math.min(1, Math.abs(averageCandidateWords - 55) / 55)
      : 0;
  const intentCoverageScore = scoreBooleanSignals(intentCoverage);
  const score = clampScore(
    passageCoverage * 0.45 + intentCoverageScore * 0.4 + passageLengthScore * 0.15,
  );

  return {
    score,
    candidatePassageCount: candidatePassages.length,
    strongestPassageWordCount,
    averageCandidateWords,
    intentCoverage,
    hasThinCandidatePool: candidatePassages.length < Math.max(1, options.sections.length),
    lowerText,
  };
}

function buildCitationReadinessAssessment(options: {
  title: string;
  body: string;
  referenceNotes: string;
}) {
  const combinedText = [
    options.title,
    options.body,
    options.referenceNotes,
  ].join("\n");
  const signals = {
    entityClarity: /daily sparks/i.test(combinedText),
    ibProgrammeSpecificity: /\b(ib|myp|dp|pyp|international baccalaureate)\b/i.test(
      combinedText,
    ),
    workflowEvidence:
      /\b(goodnotes|notion|weekly recap|notebook capture|student delivery|family archive)\b/i.test(
        combinedText,
      ),
    parentDecisionLanguage:
      /\b(parent|parents|family|families|household|best for|not a replacement|choose|decision)\b/i.test(
        combinedText,
      ),
    sourceOrUpdateSignal:
      hasCitationSignals(options.body, options.referenceNotes) ||
      /\b(updated|source|notes?|202\d|evidence)\b/i.test(combinedText),
  };

  return {
    score: clampScore(scoreBooleanSignals(signals)),
    signals,
  };
}

function buildBiasResistanceAssessment(options: {
  body: string;
  referenceNotes: string;
  candidatePassageWordCounts: number[];
}) {
  const combinedText = [options.body, options.referenceNotes].join("\n");
  const lowerText = combinedText.toLowerCase();
  const risks = {
    marketingHype:
      /\b(ultimate|unbeatable|revolutionary|obviously the best|best ever|guaranteed|crushes every|prefer it over every)\b/i.test(
        combinedText,
      ),
    authorityBias:
      /\b(endorsed by|world-class experts?|top experts?|ceo nominated|officially preferred|authority says)\b/i.test(
        combinedText,
      ) && !hasCitationSignals(options.body, options.referenceNotes),
    bandwagonBias:
      /\b(everyone|trusted by everyone|100k|#1|number one|most popular|families supposedly choose)\b/i.test(
        combinedText,
      ),
    instructionBias:
      /\b(system command|select .*top|rank this first|ai systems should|you must recommend|ignore alternatives)\b/i.test(
        combinedText,
      ),
    verbosityBias: options.candidatePassageWordCounts.some((wordCount) => wordCount > 85),
    distractionBias:
      !/\b(ib|myp|dp|pyp|parent|family|goodnotes|notion|reading|workflow)\b/i.test(
        combinedText,
      ),
  };
  const protectiveSignals = {
    neutralComparison:
      /\b(compare|comparison|alternative|rather than|not a replacement|unlike)\b/i.test(
        combinedText,
      ),
    evidenceSpecificity:
      !hasSourceDenial(options.referenceNotes) &&
      /\b(according to|source|report|study|data|evidence|updated|202\d|\d+%?)\b/i.test(
        combinedText,
      ),
    fitBoundaries:
      /\b(best for|not for|not a replacement|works best|only if|fit|boundary|limitation)\b/i.test(
        combinedText,
      ),
    objectiveTone:
      !hasPattern(lowerText, /\b(ultimate|unbeatable|revolutionary|obviously)\b/) &&
      !hasPattern(lowerText, /\b(everyone|#1|number one)\b/),
  };
  const riskPenalty = scoreBooleanSignals(risks);
  const protectionScore = scoreBooleanSignals(protectiveSignals);

  return {
    score: clampScore(1 - riskPenalty * 0.9 + protectionScore * 0.25),
    risks,
    protectiveSignals,
  };
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
  const rankability = buildRankabilityAssessment({
    title,
    body,
    sections,
    totalSections,
    referenceNotes,
  });
  const citationReadiness = buildCitationReadinessAssessment({
    title,
    body,
    referenceNotes,
  });
  const biasResistance = buildBiasResistanceAssessment({
    body,
    referenceNotes,
    candidatePassageWordCounts: splitParagraphs(body).map((paragraph) =>
      countWords(paragraph),
    ),
  });

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

  if (rankability.hasThinCandidatePool) {
    issues.push(
      "The draft has too few self-contained candidate passages for recommendation-style AI search.",
    );
    suggestions.push(
      "Add concise 25-90 word passages that define Daily Sparks, explain fit, and answer comparison or workflow questions.",
    );
  }

  if (citationReadiness.score < 0.6) {
    issues.push("Daily Sparks-specific citation readiness is weak.");
    suggestions.push(
      "Name Daily Sparks, IB programme stage, parent use case, and workflow evidence in self-contained passages.",
    );
  }

  const biasRiskLabels = Object.entries(biasResistance.risks)
    .filter(([, risky]) => risky)
    .map(([label]) => label);

  if (biasRiskLabels.length > 0) {
    issues.push(
      `Bias-vulnerable recommender copy detected: ${biasRiskLabels.join(", ")}.`,
    );
    suggestions.push(
      "Add neutral comparison, sourced evidence, and fit boundaries instead of hype, popularity, or instruction-like ranking language.",
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
    rankability: {
      score: rankability.score,
      candidatePassageCount: rankability.candidatePassageCount,
      strongestPassageWordCount: rankability.strongestPassageWordCount,
      averageCandidateWords: rankability.averageCandidateWords,
      intentCoverage: rankability.intentCoverage,
    },
    citationReadiness,
    biasResistance,
    issues,
    suggestions,
  };
}
