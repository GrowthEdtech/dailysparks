import {
  DAILY_SPARKS_ANTI_PLASTIC_WORDS,
  DAILY_SPARKS_REPETITION_POLICY,
  getEditorialProgrammeProfile,
} from "./editorial-policy";
import {
  buildDailyBriefRuntimeContract,
  getDailyBriefProgrammeContentModel,
  getWeekendDeliveryPolicy,
  getTierRuntimeIntentNotes,
  getPersonaRuntimeIntentNotes,
} from "./daily-brief-product-policy";
import { getEditoriallyActiveProgrammes } from "./programme-availability-policy";
import { generateTextWithDefaultAiConnectionPolicy } from "./ai-runtime";
import {
  type DailyBriefEditorialCohort,
} from "./daily-brief-cohorts";
import { listDailyBriefHistory } from "./daily-brief-history-store";
import type { DailyBriefSelectedTopicRecord } from "./daily-brief-candidate-schema";
import type {
  DailyBriefHistoryRecord,
  DailyBriefRepetitionRisk,
} from "./daily-brief-history-schema";
import { hasCompleteDailyBriefRoutingKey } from "./daily-brief-history-schema";
import { selectTopicWithPolicy } from "./daily-brief-selection-policy";
import type { Programme } from "./mvp-types";
import {
  buildResolvedPromptPreview, getActivePromptPolicy,
} from "./prompt-policy-store";
import type { PromptPolicyRecord } from "./prompt-policy-schema";
import {
  hydrateSelectedTopicFromRecord,
  type SelectedDailyTopic,
} from "./brief-selector";
import { normalizeHeadlineForComparison } from "./daily-brief-selection-types";
import {
  ingestEditorialSourceCandidates,
  type EditorialSourceCandidate,
} from "./source-ingestion";

export type GeneratedDailyBriefDraft = Omit<
  DailyBriefHistoryRecord,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "pipelineStage"
  | "candidateSnapshotAt"
  | "generationCompletedAt"
  | "pdfBuiltAt"
  | "deliveryWindowAt"
  | "lastDeliveryAttemptAt"
  | "deliveryAttemptCount"
  | "deliverySuccessCount"
  | "deliveryFailureCount"
  | "deliveryReceipts"
  | "failedDeliveryTargets"
  | "failureReason"
  | "retryEligibleUntil"
> & {
  topicClusterKey: string;
  topicLatestPublishedAt: string | null;
  selectionDecision: DailyBriefHistoryRecord["selectionDecision"];
  selectionOverrideNote: string;
  blockedTopics: DailyBriefHistoryRecord["blockedTopics"];
  resolvedPrompt: string;
  candidateCount: number;
  recommendedStatus: DailyBriefHistoryRecord["status"];
  recommendedPipelineStage: DailyBriefHistoryRecord["pipelineStage"];
  interactionUrl?: string | null;
};

export type DailyBriefGenerationResult = {
  selectedTopic: SelectedDailyTopic | null;
  selectionAudit: {
    decision: DailyBriefHistoryRecord["selectionDecision"] | null;
    overrideNote: string;
    blockedTopics: DailyBriefHistoryRecord["blockedTopics"];
  };
  generatedBriefs: GeneratedDailyBriefDraft[];
  skippedProgrammes: Programme[];
};

export type GenerateDailyBriefDraftsOptions = {
  scheduledFor: string;
  editorialCohort?: DailyBriefEditorialCohort;
  candidates?: EditorialSourceCandidate[];
  historyEntries?: DailyBriefHistoryRecord[];
  recordKind?: DailyBriefHistoryRecord["recordKind"];
  promptPolicy?: PromptPolicyRecord;
  selectedTopicRecord?: DailyBriefSelectedTopicRecord | null;
  fetchImpl?: typeof fetch;
  now?: Date;
};

type GeneratedBriefPayload = {
  headline: string;
  summary: string;
  briefMarkdown: string;
  topicTags: string[];
  retrievalPrompts: Array<{ title: string; prompt: string }>;
};

function normalizeTag(value: string) {
  return value.trim().toLowerCase();
}

function getDaysBetween(left: string, right: string) {
  const leftDate = Date.parse(`${left}T00:00:00.000Z`);
  const rightDate = Date.parse(`${right}T00:00:00.000Z`);

  if (Number.isNaN(leftDate) || Number.isNaN(rightDate)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.abs(leftDate - rightDate) / (1000 * 60 * 60 * 24);
}

function getExistingProgrammeSet(
  historyEntries: DailyBriefHistoryRecord[],
  scheduledFor: string,
  editorialCohort: DailyBriefEditorialCohort,
  recordKind: DailyBriefHistoryRecord["recordKind"],
) {
  return new Set(
    historyEntries
      .filter(
        (entry) =>
          hasCompleteDailyBriefRoutingKey(entry) &&
          entry.scheduledFor === scheduledFor &&
          entry.recordKind === recordKind &&
          entry.editorialCohort === editorialCohort &&
          entry.status !== "failed",
      )
      .map((entry) => entry.programme),
  );
}

function buildGenerationUserPrompt(
  selectedTopic: SelectedDailyTopic,
  programme: Programme,
  scheduledFor: string,
) {
  const contentModel = getDailyBriefProgrammeContentModel(programme);
  const weekendPolicy = getWeekendDeliveryPolicy(programme, scheduledFor);

  return [
    `Scheduled date: ${scheduledFor}`,
    `Programme: ${programme}`,
    `Programme learning model: ${contentModel.tierLabel}`,
    `Required section order: ${contentModel.requiredSectionOrder.join(" -> ")}`,
    `Weekend delivery mode: ${weekendPolicy.label}`,
    `Weekend framing note: ${weekendPolicy.promptNote}`,
    `Topic cluster: ${selectedTopic.clusterKey}`,
    `Primary headline: ${selectedTopic.headline}`,
    `Cluster summary: ${selectedTopic.summary}`,
    "",
    "Source references:",
    ...selectedTopic.sourceReferences.map(
      (reference) =>
        `- ${reference.sourceName} (${reference.sourceDomain}): ${reference.articleTitle} — ${reference.articleUrl}`,
    ),
    "",
    "Return valid JSON only with the keys headline, summary, briefMarkdown, topicTags, and retrievalPrompts.",
    "The retrievalPrompts should be an array of 2-3 socratic questions (title, prompt) that encourage critical thinking and active recall about the content, tailored to the academic level.",
  ].join("\n");
}

function extractJsonObject(value: string) {
  const fencedMatch = value.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");

  if (start >= 0 && end > start) {
    return value.slice(start, end + 1);
  }

  return value.trim();
}

function parseGeneratedBriefPayload(text: string): GeneratedBriefPayload {
  const payload = JSON.parse(extractJsonObject(text)) as {
    headline?: unknown;
    summary?: unknown;
    briefMarkdown?: unknown;
    topicTags?: unknown;
    retrievalPrompts?: unknown;
  };
  const topicTags = Array.isArray(payload.topicTags)
    ? payload.topicTags
        .map((tag) => String(tag).trim())
        .filter(Boolean)
    : String(payload.topicTags ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

  const result = {
    headline: String(payload.headline ?? "").trim(),
    summary: String(payload.summary ?? "").trim(),
    briefMarkdown: String(payload.briefMarkdown ?? "").trim(),
    topicTags,
    retrievalPrompts: Array.isArray(payload.retrievalPrompts)
      ? payload.retrievalPrompts.map((p: any) => ({
          title: String(p?.title ?? "Quick Check").trim(),
          prompt: String(p?.prompt ?? "").trim(),
        })).filter(p => p.prompt)
      : [],
  };

  if (!result.headline) {
    throw new Error("AI output must include a non-empty headline.");
  }

  if (!result.summary) {
    throw new Error("AI output must include a non-empty summary.");
  }

  if (!result.briefMarkdown) {
    throw new Error("AI output must include non-empty briefMarkdown.");
  }

  if (result.topicTags.length === 0) {
    throw new Error("AI output must include at least one topic tag.");
  }

  return result;
}

function buildRepetitionAssessment(
  historyEntries: DailyBriefHistoryRecord[],
  scheduledFor: string,
  selectedTopic: SelectedDailyTopic,
  topicTags: string[],
): {
  repetitionRisk: DailyBriefRepetitionRisk;
  repetitionNotes: string;
} {
  const recentEntries = historyEntries.filter((entry) => {
    if (entry.status !== "published") {
      return false;
    }

    return (
      getDaysBetween(entry.scheduledFor, scheduledFor) <=
      DAILY_SPARKS_REPETITION_POLICY.topicReuse.windowDays
    );
  });

  const selectedSourceIds = new Set(
    selectedTopic.sourceReferences.map((reference) => reference.sourceId),
  );
  const normalizedTags = new Set(topicTags.map(normalizeTag));

  const overlappingEntries = recentEntries.filter((entry) => {
    const sourceOverlap = entry.sourceReferences.some((reference) =>
      selectedSourceIds.has(reference.sourceId),
    );
    const tagOverlap = entry.topicTags.some((tag) =>
      normalizedTags.has(normalizeTag(tag)),
    );

    return sourceOverlap || tagOverlap;
  });

  if (overlappingEntries.length === 0) {
    return {
      repetitionRisk: "low",
      repetitionNotes:
        "No overlapping published topic or source footprint found in the recent editorial memory window.",
    };
  }

  return {
    repetitionRisk: overlappingEntries.length > 1 ? "high" : "medium",
    repetitionNotes: `Recent published overlap detected with ${overlappingEntries.length} brief(s) inside the repetition window.`,
  };
}

export async function generateDailyBriefDrafts(
  options: GenerateDailyBriefDraftsOptions,
): Promise<DailyBriefGenerationResult> {
  const editorialCohort = options.editorialCohort ?? "APAC";
  const editorialProgrammes = getEditoriallyActiveProgrammes();

  const promptPolicy = options.promptPolicy ?? (await getActivePromptPolicy());

  if (!promptPolicy) {
    throw new Error("No active prompt policy is configured.");
  }

  const historyEntries = options.historyEntries ?? (await listDailyBriefHistory());
  const candidates =
    options.candidates ?? (await ingestEditorialSourceCandidates({ now: options.now }));
  const selectionDecision = options.selectedTopicRecord
    ? {
        topic: hydrateSelectedTopicFromRecord({
          record: options.selectedTopicRecord,
          candidates,
          eligibleProgrammes: editorialProgrammes,
        }),
        topicClusterKey: options.selectedTopicRecord.clusterKey,
        normalizedHeadline: options.selectedTopicRecord.normalizedHeadline,
        latestPublishedAt: options.selectedTopicRecord.latestPublishedAt,
        selectionAudit: {
          decision: options.selectedTopicRecord.selectionDecision,
          overrideNote: options.selectedTopicRecord.selectionOverrideNote,
          blockedTopics: [],
        },
      }
    : selectTopicWithPolicy({
        candidates,
        eligibleProgrammes: editorialProgrammes,
        historyEntries,
        scheduledFor: options.scheduledFor,
        editorialCohort,
        recordKind: options.recordKind ?? "production",
        topicReuseWindowDays: DAILY_SPARKS_REPETITION_POLICY.topicReuse.windowDays,
      });
  const selectedTopic = selectionDecision.topic;

  if (!selectedTopic) {
    return {
      selectedTopic: null,
      selectionAudit: selectionDecision.selectionAudit,
      generatedBriefs: [],
      skippedProgrammes: [],
    };
  }

    historyEntries,
    options.scheduledFor,
    editorialCohort,
    options.recordKind ?? "production",
  );
  const generatedBriefs: GeneratedDailyBriefDraft[] = [];
  const skippedProgrammes: Programme[] = [];

  for (const programme of editorialProgrammes) {
    const tiers: Array<"foundation" | "core" | "enriched"> = ["foundation", "core", "enriched"];
    const personas: Array<"analytical" | "reflective"> = ["analytical", "reflective"];
    
    for (const tier of tiers) {
      for (const persona of personas) {
        // Check if this specific programme + tier + persona combination already exists
        const alreadyExists = historyEntries.some(entry => 
          entry.scheduledFor === options.scheduledFor &&
          entry.programme === programme &&
          entry.editorialCohort === editorialCohort &&
          entry.academicTier === tier &&
          entry.learnerPersona === persona &&
          entry.status !== "failed"
        );

      if (alreadyExists) {
        continue;
      }

        const resolvedPrompt = [
          buildResolvedPromptPreview(promptPolicy, programme),
          "",
          buildDailyBriefRuntimeContract(programme, options.scheduledFor),
          "",
          ...getTierRuntimeIntentNotes(tier),
          "",
          ...getPersonaRuntimeIntentNotes(persona),
        ].join("\n");
      const programmeProfile = getEditorialProgrammeProfile(programme);
      
      const MAX_AUTOREWRITE_RETRIES = 3;
      let attempts = 0;
      let generatedPayload: GeneratedBriefPayload | null = null;
      let lastPayload: GeneratedBriefPayload | null = null;
      let aiResult: any;
      let usedPlasticWords: string[] = [];

      while (attempts < MAX_AUTOREWRITE_RETRIES) {
        attempts++;
        const warningPrompt = usedPlasticWords.length > 0 
          ? `\nCRITICAL DO NOT USE THESE WORDS: ${usedPlasticWords.join(", ")}\nREWRITE REQUIRED.`
          : "";

        aiResult = await generateTextWithDefaultAiConnectionPolicy({
          developerPrompt: resolvedPrompt,
          userPrompt: [
            buildGenerationUserPrompt(selectedTopic, programme, options.scheduledFor),
            "",
            `Programme framing note: ${programmeProfile.contentGoal}`,
            `Prompt focus: ${programmeProfile.promptFocus}`,
            warningPrompt
          ].join("\n"),
          fetchImpl: options.fetchImpl,
        });

        const tempPayload = parseGeneratedBriefPayload(aiResult.text);
        lastPayload = tempPayload;
        
        const foundWords = DAILY_SPARKS_ANTI_PLASTIC_WORDS.filter((w) => 
          tempPayload.briefMarkdown.toLowerCase().includes(w.toLowerCase())
        );

        if (foundWords.length > 0) {
          usedPlasticWords = foundWords;
          console.warn(`[Quality Filter] Rejecting brief for ${programme}/${tier} because it used plastic words: ${foundWords.join(", ")}. Retrying...`);
          continue;
        }
        
        generatedPayload = tempPayload;
        break;
      }

      const isApprovedZeroShot = generatedPayload !== null;

      if (!generatedPayload) {
        generatedPayload = lastPayload!;
      }
      const finalAdminNotes = isApprovedZeroShot 
        ? "" 
        : `Auto-Rewrite failed after ${MAX_AUTOREWRITE_RETRIES} attempts. Plastic words detected: ${usedPlasticWords.join(", ")}. Curation required.`;
      
      const repetitionAssessment = buildRepetitionAssessment(
        historyEntries,
        options.scheduledFor,
        selectedTopic,
        generatedPayload.topicTags,
      );

      generatedBriefs.push({
        scheduledFor: options.scheduledFor,
        recordKind: options.recordKind ?? "production",
        headline: generatedPayload.headline,
        normalizedHeadline:
          selectionDecision.normalizedHeadline ??
          normalizeHeadlineForComparison(generatedPayload.headline),
        summary: generatedPayload.summary,
        programme,
        editorialCohort,
        academicTier: tier,
        learnerPersona: persona,
        status: "draft",
        topicClusterKey: selectionDecision.topicClusterKey ?? selectedTopic.clusterKey,
        topicLatestPublishedAt: selectionDecision.latestPublishedAt,
        selectionDecision:
          selectionDecision.selectionAudit.decision ?? "new",
        selectionOverrideNote: selectionDecision.selectionAudit.overrideNote,
        blockedTopics: selectionDecision.selectionAudit.blockedTopics,
        topicTags: generatedPayload.topicTags,
        sourceReferences: selectedTopic.sourceReferences,
        aiConnectionId: aiResult.connectionUsed.id,
        aiConnectionName: aiResult.connectionUsed.name,
        aiModel: aiResult.model,
        promptPolicyId: promptPolicy.id,
        promptVersionLabel: promptPolicy.versionLabel,
        promptVersion: promptPolicy.versionLabel,
        repetitionNotes: repetitionAssessment.repetitionNotes,
        repetitionRisk: repetitionAssessment.repetitionRisk,
        adminNotes: finalAdminNotes,
        briefMarkdown: generatedPayload.briefMarkdown,
        retrievalPrompts: generatedPayload.retrievalPrompts,
        resolvedPrompt,
        candidateCount: selectedTopic.topicCandidates.length,
        recommendedStatus: isApprovedZeroShot ? "approved" : "draft",
        recommendedPipelineStage: isApprovedZeroShot ? "preflight_passed" : "generated",
        interactionUrl: null,
      });
    }
  }
}

  return {
    selectedTopic,
    selectionAudit: selectionDecision.selectionAudit,
    generatedBriefs,
    skippedProgrammes,
  };
}
