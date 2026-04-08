import {
  DAILY_BRIEF_EDITORIAL_COHORTS,
  buildEditorialCohortEvaluationDate,
  filterProfilesByEditorialCohort,
  type DailyBriefEditorialCohort,
} from "./daily-brief-cohorts";
import type {
  DailyBriefHistoryRecord,
  DailyBriefStatus,
} from "./daily-brief-history-schema";
import { hasDispatchableDeliveryChannel } from "./delivery-readiness";
import { getDerivedAccessState } from "./access-state";
import type { ParentProfile, Programme } from "./mvp-types";
import { getEditoriallyActiveProgrammes } from "./programme-availability-policy";

export const DAILY_BRIEF_PROGRAMME_COVERAGE_STATUSES = [
  "generated",
  "no_active_families",
  "no_healthy_delivery_channel",
  "awaiting_generation",
] as const;

export type DailyBriefProgrammeCoverageStatus =
  (typeof DAILY_BRIEF_PROGRAMME_COVERAGE_STATUSES)[number];

export type DailyBriefProgrammeCoverageRow = {
  editorialCohort: DailyBriefEditorialCohort;
  programme: Programme;
  activeFamilyCount: number;
  dispatchableFamilyCount: number;
  generatedBriefCount: number;
  latestGeneratedStatus: DailyBriefStatus | null;
  status: DailyBriefProgrammeCoverageStatus;
  statusLabel: string;
};

function isActiveAudienceProfile(profile: ParentProfile, evaluationDate: Date) {
  const accessState = getDerivedAccessState(profile.parent, evaluationDate);

  return accessState === "active" || accessState === "trial_active";
}

function getStatusLabel(status: DailyBriefProgrammeCoverageStatus) {
  switch (status) {
    case "generated":
      return "Generated";
    case "no_active_families":
      return "No active families";
    case "no_healthy_delivery_channel":
      return "No healthy delivery channel";
    case "awaiting_generation":
      return "Awaiting generation";
  }
}

export function getProgrammesWithActiveAudience(input: {
  profiles: ParentProfile[];
  editorialCohort: DailyBriefEditorialCohort;
  scheduledFor: string;
}) {
  const evaluationDate = buildEditorialCohortEvaluationDate(input.scheduledFor);
  const activeCohortProfiles = filterProfilesByEditorialCohort(
    input.profiles.filter((profile) =>
      isActiveAudienceProfile(profile, evaluationDate),
    ),
    input.editorialCohort,
    evaluationDate,
  );

  return getEditoriallyActiveProgrammes().filter((programme) =>
    activeCohortProfiles.some(
      (profile) => profile.student.programme === programme,
    ),
  );
}

export function buildDailyBriefProgrammeCoverage(input: {
  profiles: ParentProfile[];
  history: DailyBriefHistoryRecord[];
  scheduledFor: string;
  editorialCohort?: DailyBriefEditorialCohort;
}) {
  const evaluationDate = buildEditorialCohortEvaluationDate(input.scheduledFor);
  const activeProfiles = input.profiles.filter((profile) =>
    isActiveAudienceProfile(profile, evaluationDate),
  );
  const cohorts = input.editorialCohort
    ? [input.editorialCohort]
    : DAILY_BRIEF_EDITORIAL_COHORTS;

  return cohorts.flatMap((cohort) => {
    const cohortProfiles = filterProfilesByEditorialCohort(
      activeProfiles,
      cohort,
      evaluationDate,
    );

    return getEditoriallyActiveProgrammes().map((programme) => {
      const programmeProfiles = cohortProfiles.filter(
        (profile) => profile.student.programme === programme,
      );
      const dispatchableProfiles = programmeProfiles.filter((profile) =>
        hasDispatchableDeliveryChannel(profile),
      );
      const generatedBriefs = input.history.filter(
        (entry) =>
          entry.recordKind === "production" &&
          entry.scheduledFor === input.scheduledFor &&
          entry.editorialCohort === cohort &&
          entry.programme === programme,
      );
      const latestGenerated = [...generatedBriefs].sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt),
      )[0];
      const status: DailyBriefProgrammeCoverageStatus =
        generatedBriefs.length > 0
          ? "generated"
          : programmeProfiles.length === 0
            ? "no_active_families"
            : dispatchableProfiles.length === 0
              ? "no_healthy_delivery_channel"
              : "awaiting_generation";

      return {
        editorialCohort: cohort,
        programme,
        activeFamilyCount: programmeProfiles.length,
        dispatchableFamilyCount: dispatchableProfiles.length,
        generatedBriefCount: generatedBriefs.length,
        latestGeneratedStatus: latestGenerated?.status ?? null,
        status,
        statusLabel: getStatusLabel(status),
      } satisfies DailyBriefProgrammeCoverageRow;
    });
  });
}
