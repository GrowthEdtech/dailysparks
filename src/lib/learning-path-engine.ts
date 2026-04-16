import { getProfileStore } from "./profile-store-factory";
import { listDailyBriefHistory } from "./daily-brief-history-store";
import { fetchNotionPageInteractions } from "./notion";
import type { ParentProfile, StudentRecord } from "./mvp-types";

const PROMOTION_THRESHOLD = 0.85; // 85% completion
const DEMOTION_THRESHOLD = 0.30; // 30% completion
const MIN_SAMPLES_FOR_CHANGE = 5; // Need at least 5 briefs in a week to trigger a shift

export type LearningPathAdjustmentResult = {
  previousTier: string;
  newTier: string;
  adjusted: boolean;
  reason: string;
};

export async function evaluateStudentTrajectory(
  profile: ParentProfile,
  daysLookback = 7
): Promise<LearningPathAdjustmentResult> {
  const store = getProfileStore();
  const currentTier = profile.student.academicTier || "core";
  
  // 1. Fetch relevant history and aggregate interaction scores
  const anchorDate = new Date();
  const lookbackDate = new Date(anchorDate.getTime() - daysLookback * 24 * 60 * 60 * 1000);
  
  const allHistory = await listDailyBriefHistory({ status: "published" });
  const studentHistory = allHistory.filter(entry => 
    entry.deliveryReceipts.some(r => r.parentId === profile.parent.id) &&
    new Date(entry.scheduledFor) >= lookbackDate
  );

  if (studentHistory.length < MIN_SAMPLES_FOR_CHANGE) {
    return {
      previousTier: currentTier,
      newTier: currentTier,
      adjusted: false,
      reason: "Insufficient interaction data for this period."
    };
  }

  let completedTasks = 0;
  let totalTasks = 0;

  for (const entry of studentHistory) {
    const receipt = entry.deliveryReceipts.find(r => r.parentId === profile.parent.id);
    if (receipt?.externalId) {
      try {
        const stats = await fetchNotionPageInteractions(profile.parent.id, receipt.externalId);
        completedTasks += stats.completedTasks;
        totalTasks += stats.totalTasks;
      } catch (error) {
        // Silently fail for individual pages
      }
    }
  }

  const engagementScore = totalTasks > 0 ? (completedTasks / totalTasks) : 0;
  
  // 2. Logic for tier adjustment
  let newTier = currentTier;
  let reason = "Engagement remains within standard parameters.";

  if (engagementScore >= PROMOTION_THRESHOLD) {
    if (currentTier === "foundation") {
      newTier = "core";
      reason = `Consistent high engagement (${(engagementScore * 100).toFixed(0)}%) warrants promotion to Core tier.`;
    } else if (currentTier === "core") {
      newTier = "enriched";
      reason = `Consistent high engagement (${(engagementScore * 100).toFixed(0)}%) warrants promotion to Enriched tier for greater academic challenge.`;
    }
  } else if (engagementScore <= DEMOTION_THRESHOLD) {
    if (currentTier === "enriched") {
      newTier = "core";
      reason = `Low engagement (${(engagementScore * 100).toFixed(0)}%) detected; reverting to Core tier for better scaffolding.`;
    } else if (currentTier === "core") {
      newTier = "foundation";
      reason = `Low engagement (${(engagementScore * 100).toFixed(0)}%) detected; moving to Foundation tier for maximum support.`;
    }
  }

  // 3. Update the profile if changed
  const adjusted = newTier !== currentTier;
  if (adjusted) {
    const adaptationHistory = profile.student.adaptationHistory || [];
    adaptationHistory.push({
      date: new Date().toISOString(),
      from: currentTier,
      to: newTier,
      reason
    });

    await store.updateStudentRecord(profile.parent.email, {
      ...profile.student,
      academicTier: newTier,
      engagementStats: {
        last7DaysScore: engagementScore,
        totalTasks,
        completedTasks,
        snapshotDate: new Date().toISOString()
      },
      adaptationHistory
    });
  }

  return {
    previousTier: currentTier,
    newTier,
    adjusted,
    reason
  };
}
