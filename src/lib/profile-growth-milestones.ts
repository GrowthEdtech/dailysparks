import { hasDispatchableDeliveryChannel } from "./delivery-readiness";
import type {
  ParentProfile,
  ParentRecord,
  StudentRecord,
  UpdateParentGrowthMilestonesInput,
} from "./mvp-types";

function hasMeaningfulStudentName(studentName: string) {
  const normalizedStudentName = studentName.trim().toLowerCase();

  return normalizedStudentName.length > 0 && normalizedStudentName !== "student";
}

function buildProfile(parent: ParentRecord, student: StudentRecord): ParentProfile {
  return { parent, student };
}

export function applySetOnceGrowthMilestones(
  parent: ParentRecord,
  input: UpdateParentGrowthMilestonesInput,
) {
  let nextParent = parent;

  const milestoneEntries: Array<
    [
      keyof Pick<
        ParentRecord,
        | "childProfileCompletedAt"
        | "firstDispatchableChannelAt"
        | "firstBriefDeliveredAt"
        | "firstPaidAt"
      >,
      string | null | undefined,
    ]
  > = [
    ["childProfileCompletedAt", input.childProfileCompletedAt],
    ["firstDispatchableChannelAt", input.firstDispatchableChannelAt],
    ["firstBriefDeliveredAt", input.firstBriefDeliveredAt],
    ["firstPaidAt", input.firstPaidAt],
  ];

  for (const [key, value] of milestoneEntries) {
    if (!value || nextParent[key]) {
      continue;
    }

    nextParent = {
      ...nextParent,
      [key]: value,
    };
  }

  return {
    parent: nextParent,
    changed: nextParent !== parent,
  };
}

function deriveFirstPaidAt(parent: ParentRecord) {
  if (parent.firstPaidAt) {
    return parent.firstPaidAt;
  }

  if (parent.subscriptionStatus !== "active") {
    return null;
  }

  return parent.subscriptionActivatedAt ?? parent.latestInvoicePaidAt ?? null;
}

export function applyAutomaticGrowthMilestones(input: {
  parent: ParentRecord;
  student: StudentRecord;
  now: string;
}) {
  const { parent, student, now } = input;
  let nextParent = parent;

  if (!nextParent.childProfileCompletedAt && hasMeaningfulStudentName(student.studentName)) {
    nextParent = {
      ...nextParent,
      childProfileCompletedAt: now,
    };
  }

  if (
    !nextParent.firstDispatchableChannelAt &&
    hasDispatchableDeliveryChannel(buildProfile(nextParent, student))
  ) {
    nextParent = {
      ...nextParent,
      firstDispatchableChannelAt: now,
    };
  }

  const firstPaidAt = deriveFirstPaidAt(nextParent);

  if (!nextParent.firstPaidAt && firstPaidAt) {
    nextParent = {
      ...nextParent,
      firstPaidAt,
    };
  }

  return {
    parent: nextParent,
    changed: nextParent !== parent,
  };
}
