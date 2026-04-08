import type { Programme } from "./mvp-types";
import {
  DEFAULT_PUBLIC_PROGRAMME,
  getPublicProgrammeOptions,
  getPublicProgrammeYear,
  isPublicProgramme,
  type PublicProgramme,
} from "./programme-availability-policy";

const PROGRAMME_INTEREST_TAXONOMY: Record<Programme, readonly string[]> = {
  PYP: [],
  MYP: [
    "Tech & Innovation",
    "Earth & Environment",
    "Society & Culture",
    "History & Individuals",
  ],
  DP: [
    "Economics",
    "Global Politics",
    "Psychology",
    "Science & Technology",
    "History",
    "Philosophy",
    "Law",
    "TOK",
  ],
};

function normalizeInterestTag(value: string) {
  return value.trim().toLowerCase();
}

export {
  DEFAULT_PUBLIC_PROGRAMME,
  getPublicProgrammeOptions,
  getPublicProgrammeYear,
  isPublicProgramme,
  type PublicProgramme,
};

export function getInterestTaxonomyForProgramme(programme: Programme) {
  return [...PROGRAMME_INTEREST_TAXONOMY[programme]];
}

export function sanitizeInterestTagsForProgramme(
  programme: Programme,
  input: string[],
) {
  const allowedOptions = getInterestTaxonomyForProgramme(programme);
  const allowedMap = new Map(
    allowedOptions.map((option) => [normalizeInterestTag(option), option]),
  );
  const seen = new Set<string>();
  const sanitized: string[] = [];

  for (const rawValue of input) {
    const normalized = normalizeInterestTag(rawValue);

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    const allowedValue = allowedMap.get(normalized);

    if (!allowedValue) {
      continue;
    }

    seen.add(normalized);
    sanitized.push(allowedValue);
  }

  return sanitized;
}

export function hasOnlyValidInterestTagsForProgramme(
  programme: Programme,
  input: string[],
) {
  return sanitizeInterestTagsForProgramme(programme, input).length === input.length;
}
