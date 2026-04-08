import { firestoreDailyBriefNotebookWeeklyRecapStore } from "./firestore-daily-brief-notebook-weekly-recap-store";
import { localDailyBriefNotebookWeeklyRecapStore } from "./local-daily-brief-notebook-weekly-recap-store";
import type {
  DailyBriefNotebookWeeklyRecap,
  DailyBriefNotebookWeeklyRecapRetrievalPrompt,
} from "./daily-brief-notebook-weekly-recap";
import type {
  DailyBriefNotebookWeeklyRecapFilters,
  DailyBriefNotebookWeeklyRecapStore,
} from "./daily-brief-notebook-weekly-recap-store-types";
import type {
  DailyBriefNotebookWeeklyRecapRecord,
  DailyBriefNotebookWeeklyRecapEmailStatus,
  DailyBriefNotebookWeeklyRecapGenerationSource,
  DailyBriefNotebookWeeklyRecapResponseRecord,
} from "./daily-brief-notebook-weekly-recap-store-schema";
import type { Programme } from "./mvp-types";
import {
  getProfileStoreBackend,
  validateProfileStoreConfig,
} from "./profile-store-config";

type SaveDailyBriefNotebookWeeklyRecapInput = {
  parentId: string;
  parentEmail: string;
  studentId: string;
  programme: Programme;
  recap: DailyBriefNotebookWeeklyRecap;
  generationSource?: DailyBriefNotebookWeeklyRecapGenerationSource;
};

type SaveDailyBriefNotebookWeeklyRecapResult = {
  record: DailyBriefNotebookWeeklyRecapRecord;
  wasUpdate: boolean;
};

type SaveDailyBriefNotebookWeeklyRecapResponseInput = {
  parentId: string;
  programme: Programme;
  weekKey: string;
  promptEntryId: string;
  response: string;
};

type SaveDailyBriefNotebookWeeklyRecapResponseResult = {
  record: DailyBriefNotebookWeeklyRecapRecord;
  response: {
    record: DailyBriefNotebookWeeklyRecapResponseRecord;
    wasUpdate: boolean;
  };
};

export type {
  DailyBriefNotebookWeeklyRecapRecord,
  DailyBriefNotebookWeeklyRecapResponseRecord,
} from "./daily-brief-notebook-weekly-recap-store-schema";

function getDailyBriefNotebookWeeklyRecapStore(): DailyBriefNotebookWeeklyRecapStore {
  validateProfileStoreConfig();

  return getProfileStoreBackend() === "firestore"
    ? firestoreDailyBriefNotebookWeeklyRecapStore
    : localDailyBriefNotebookWeeklyRecapStore;
}

function normalizeString(value: string) {
  return value.trim();
}

function buildWeeklyRecapId(
  parentId: string,
  programme: Programme,
  weekKey: string,
) {
  return `weekly-recap::${normalizeString(parentId)}::${programme}::${normalizeString(weekKey)}`;
}

function sortResponsesInPromptOrder(
  responses: DailyBriefNotebookWeeklyRecapResponseRecord[],
  prompts: DailyBriefNotebookWeeklyRecapRetrievalPrompt[],
) {
  const order = new Map(prompts.map((prompt, index) => [prompt.entryId, index]));

  return [...responses].sort((left, right) => {
    const orderDelta =
      (order.get(left.promptEntryId) ?? Number.MAX_SAFE_INTEGER) -
      (order.get(right.promptEntryId) ?? Number.MAX_SAFE_INTEGER);

    if (orderDelta !== 0) {
      return orderDelta;
    }

    return right.updatedAt.localeCompare(left.updatedAt);
  });
}

export async function listDailyBriefNotebookWeeklyRecaps(
  filters: DailyBriefNotebookWeeklyRecapFilters = {},
) {
  return getDailyBriefNotebookWeeklyRecapStore().listRecaps(filters);
}

export async function getDailyBriefNotebookWeeklyRecap(
  filters: Pick<DailyBriefNotebookWeeklyRecapFilters, "parentId" | "programme" | "weekKey">,
) {
  const [record] = await listDailyBriefNotebookWeeklyRecaps({
    ...filters,
    limit: 1,
  });

  return record ?? null;
}

export async function saveDailyBriefNotebookWeeklyRecap(
  input: SaveDailyBriefNotebookWeeklyRecapInput,
): Promise<SaveDailyBriefNotebookWeeklyRecapResult> {
  const store = getDailyBriefNotebookWeeklyRecapStore();
  const existingRecord = await getDailyBriefNotebookWeeklyRecap({
    parentId: input.parentId,
    programme: input.programme,
    weekKey: input.recap.weekKey,
  });
  const timestamp = new Date().toISOString();
  const nextRecord: DailyBriefNotebookWeeklyRecapRecord = {
    ...input.recap,
    id:
      existingRecord?.id ??
      buildWeeklyRecapId(input.parentId, input.programme, input.recap.weekKey),
    parentId: normalizeString(input.parentId),
    parentEmail: normalizeString(input.parentEmail).toLowerCase(),
    studentId: normalizeString(input.studentId),
    generationSource: input.generationSource ?? existingRecord?.generationSource ?? "manual",
    retrievalResponses: sortResponsesInPromptOrder(
      existingRecord?.retrievalResponses ?? [],
      input.recap.retrievalPrompts,
    ),
    notionLastSyncedAt: existingRecord?.notionLastSyncedAt ?? null,
    notionLastSyncPageId: existingRecord?.notionLastSyncPageId ?? null,
    notionLastSyncPageUrl: existingRecord?.notionLastSyncPageUrl ?? null,
    emailLastSentAt: existingRecord?.emailLastSentAt ?? null,
    emailLastStatus: existingRecord?.emailLastStatus ?? null,
    emailLastMessageId: existingRecord?.emailLastMessageId ?? null,
    emailLastErrorMessage: existingRecord?.emailLastErrorMessage ?? null,
    createdAt: existingRecord?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  const record = await store.upsertRecap(nextRecord);

  return {
    record,
    wasUpdate: Boolean(existingRecord),
  };
}

export async function saveDailyBriefNotebookWeeklyRecapResponse(
  input: SaveDailyBriefNotebookWeeklyRecapResponseInput,
): Promise<SaveDailyBriefNotebookWeeklyRecapResponseResult> {
  const store = getDailyBriefNotebookWeeklyRecapStore();
  const existingRecord = await getDailyBriefNotebookWeeklyRecap({
    parentId: input.parentId,
    programme: input.programme,
    weekKey: input.weekKey,
  });

  if (!existingRecord) {
    throw new Error("Please save the weekly recap before adding a retrieval response.");
  }

  const prompt = existingRecord.retrievalPrompts.find(
    (entry) => entry.entryId === normalizeString(input.promptEntryId),
  );

  if (!prompt) {
    throw new Error("We could not find that retrieval prompt in this weekly recap.");
  }

  const timestamp = new Date().toISOString();
  const existingResponse = existingRecord.retrievalResponses.find(
    (entry) => entry.promptEntryId === prompt.entryId,
  );
  const nextResponse: DailyBriefNotebookWeeklyRecapResponseRecord = {
    id: existingResponse?.id ?? crypto.randomUUID(),
    promptEntryId: prompt.entryId,
    entryType: prompt.entryType,
    title: prompt.title,
    prompt: prompt.prompt,
    sourceHeadline: prompt.sourceHeadline,
    response: normalizeString(input.response),
    createdAt: existingResponse?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
  const nextRecord: DailyBriefNotebookWeeklyRecapRecord = {
    ...existingRecord,
    retrievalResponses: sortResponsesInPromptOrder(
      [
        ...existingRecord.retrievalResponses.filter(
          (entry) => entry.promptEntryId !== prompt.entryId,
        ),
        nextResponse,
      ],
      existingRecord.retrievalPrompts,
    ),
    updatedAt: timestamp,
  };
  const record = await store.upsertRecap(nextRecord);

  return {
    record,
    response: {
      record: nextResponse,
      wasUpdate: Boolean(existingResponse),
    },
  };
}

export async function updateDailyBriefNotebookWeeklyRecapNotionSync(
  input: {
    parentId: string;
    programme: Programme;
    weekKey: string;
    notionLastSyncedAt: string;
    notionLastSyncPageId: string | null;
    notionLastSyncPageUrl: string | null;
  },
) {
  const store = getDailyBriefNotebookWeeklyRecapStore();
  const existingRecord = await getDailyBriefNotebookWeeklyRecap({
    parentId: input.parentId,
    programme: input.programme,
    weekKey: input.weekKey,
  });

  if (!existingRecord) {
    return null;
  }

  return store.upsertRecap({
    ...existingRecord,
    notionLastSyncedAt: input.notionLastSyncedAt,
    notionLastSyncPageId: input.notionLastSyncPageId,
    notionLastSyncPageUrl: input.notionLastSyncPageUrl,
    updatedAt: new Date().toISOString(),
  });
}

export async function updateDailyBriefNotebookWeeklyRecapEmailDelivery(
  input: {
    parentId: string;
    programme: Programme;
    weekKey: string;
    emailLastSentAt: string | null;
    emailLastStatus: DailyBriefNotebookWeeklyRecapEmailStatus;
    emailLastMessageId?: string | null;
    emailLastErrorMessage?: string | null;
  },
) {
  const store = getDailyBriefNotebookWeeklyRecapStore();
  const existingRecord = await getDailyBriefNotebookWeeklyRecap({
    parentId: input.parentId,
    programme: input.programme,
    weekKey: input.weekKey,
  });

  if (!existingRecord) {
    return null;
  }

  return store.upsertRecap({
    ...existingRecord,
    emailLastSentAt: input.emailLastSentAt,
    emailLastStatus: input.emailLastStatus,
    emailLastMessageId: input.emailLastMessageId ?? null,
    emailLastErrorMessage: input.emailLastErrorMessage ?? null,
    updatedAt: new Date().toISOString(),
  });
}
