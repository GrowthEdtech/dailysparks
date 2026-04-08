import { getDefaultProgrammeYear, type Programme } from "./mvp-types";

export const PUBLIC_IB_PROGRAMMES = ["MYP", "DP"] as const;
export type PublicProgramme = (typeof PUBLIC_IB_PROGRAMMES)[number];

export const EDITORIAL_ACTIVE_IB_PROGRAMMES = ["MYP", "DP"] as const;
export const LEGACY_RETAINED_IB_PROGRAMMES = ["PYP"] as const;

export const DEFAULT_PUBLIC_PROGRAMME: PublicProgramme = "MYP";

export function getPublicProgrammeOptions(): PublicProgramme[] {
  return [...PUBLIC_IB_PROGRAMMES];
}

export function isPublicProgramme(value: string): value is PublicProgramme {
  return PUBLIC_IB_PROGRAMMES.includes(value as PublicProgramme);
}

export function getPublicProgrammeYear(programme: PublicProgramme) {
  return getDefaultProgrammeYear(programme);
}

export function getEditoriallyActiveProgrammes(): Programme[] {
  return [...EDITORIAL_ACTIVE_IB_PROGRAMMES];
}

export function isProgrammeEditoriallyActive(programme: Programme) {
  return EDITORIAL_ACTIVE_IB_PROGRAMMES.includes(
    programme as (typeof EDITORIAL_ACTIVE_IB_PROGRAMMES)[number],
  );
}

export function isProgrammePubliclyAvailable(programme: Programme) {
  return PUBLIC_IB_PROGRAMMES.includes(programme as PublicProgramme);
}

export function isLegacyProgramme(programme: Programme) {
  return LEGACY_RETAINED_IB_PROGRAMMES.includes(
    programme as (typeof LEGACY_RETAINED_IB_PROGRAMMES)[number],
  );
}

export function getAdminProgrammeOptions(): Programme[] {
  return [
    ...EDITORIAL_ACTIVE_IB_PROGRAMMES,
    ...LEGACY_RETAINED_IB_PROGRAMMES,
  ];
}
