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
  previousPersona: string;
  newPersona: string;
  adjusted: boolean;
  reason: string;
};

const PERSONA_TAG_MAP: Record<string, "analytical" | "reflective"> = {
  // Analytical (Systems/STEM)
  "science": "analytical",
  "technology": "analytical",
  "math": "analytical",
  "artificial-intelligence": "analytical",
  "space": "analytical",
  "environment": "analytical",
  "economics": "analytical",
  "coding": "analytical",
  "engineering": "analytical",
  "data": "analytical",
  
  // Reflective (Impact/Humanities)
  "history": "reflective",
  "ethics": "reflective",
  "philosophy": "reflective",
  "art": "reflective",
  "culture": "reflective",
  "sociology": "reflective",
  "social-justice": "reflective",
  "literature": "reflective",
  "politics": "reflective",
  "psychology": "reflective"
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
  
  // 2. Identify thematic affinity
  const tagCounts: Record<string, number> = {};
  for (const entry of studentHistory) {
    const receipt = entry.deliveryReceipts.find(r => r.parentId === profile.parent.id);
    if (!receipt?.externalId) continue;
    
    // We assume if they engaged, they liked the topic tags
    for (const tag of entry.topicTags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }

  let analyticalWeight = 0;
  let reflectiveWeight = 0;

  for (const [tag, count] of Object.entries(tagCounts)) {
    const persona = PERSONA_TAG_MAP[tag];
    if (persona === "analytical") analyticalWeight += count;
    if (persona === "reflective") reflectiveWeight += count;
  }

  const currentPersona = profile.student.learnerPersona || "general";
  let newPersona = currentPersona;

  // Pivot logic: if one persona is significantly dominant (>60% of typed interactions)
  const totalTypedWeight = analyticalWeight + reflectiveWeight;
  if (totalTypedWeight >= 3) { // Minimum 3 tagged interactions to pivot
    const analyticalRatio = analyticalWeight / totalTypedWeight;
    if (analyticalRatio >= 0.65) {
      newPersona = "analytical";
    } else if (analyticalRatio <= 0.35) {
      newPersona = "reflective";
    } else {
      newPersona = "general";
    }
  }

  // 3. Logic for tier adjustment
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

  // 4. Update the profile if changed
  const adjusted = newTier !== currentTier || newPersona !== currentPersona;
  if (adjusted) {
    const adaptationHistory = profile.student.adaptationHistory || [];
    let adjustmentReason = reason;
    if (newPersona !== currentPersona) {
      const personaReason = `Interest pivot detected: learner shows strong affinity for ${newPersona === "analytical" ? "Systems/STEM" : "Impact/Humanities"} content.`;
      adjustmentReason = reason === "Engagement remains within standard parameters." ? personaReason : `${reason} ${personaReason}`;
    }

    adaptationHistory.push({
      date: new Date().toISOString(),
      from: `${currentTier}/${currentPersona}`,
      to: `${newTier}/${newPersona}`,
      reason: adjustmentReason
    });

    await store.updateStudentRecord(profile.parent.email, {
      ...profile.student,
      academicTier: newTier,
      learnerPersona: newPersona,
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
    previousPersona: currentPersona,
    newPersona,
    adjusted,
    reason
  };
}
