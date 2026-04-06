import type {
  DailyBriefPdfRenderer,
  GoodnotesAttachmentMode,
} from "./goodnotes-delivery";
import type { DailyBriefHistoryRecord } from "./daily-brief-history-schema";
import type { Programme } from "./mvp-types";

export const DAILY_BRIEF_RENDERER_MODES = [
  "auto",
  "typst",
] as const;

export type DailyBriefRendererMode =
  (typeof DAILY_BRIEF_RENDERER_MODES)[number];

type ResolveDailyBriefRendererPolicyOptions = {
  selectedMode: DailyBriefRendererMode;
  programme: Programme;
  attachmentMode: GoodnotesAttachmentMode;
};

export type DailyBriefRendererPolicy = {
  selectedMode: DailyBriefRendererMode;
  renderer: DailyBriefPdfRenderer;
  defaultRenderer: DailyBriefPdfRenderer;
  programme: Programme;
  attachmentMode: GoodnotesAttachmentMode;
};

export type DailyBriefRendererHistoryResolution = {
  renderer: DailyBriefPdfRenderer;
  source: "delivery-receipt" | "render-audit" | "current-policy";
};

const DEFAULT_TYPST_RENDERER: DailyBriefPdfRenderer = "typst";

function getAutoDefaultRenderer() {
  return DEFAULT_TYPST_RENDERER;
}

export function normalizeDailyBriefRendererMode(
  value: unknown,
): DailyBriefRendererMode | null {
  return typeof value === "string" &&
      (DAILY_BRIEF_RENDERER_MODES as readonly string[]).includes(value)
    ? (value as DailyBriefRendererMode)
    : null;
}

export function resolveDailyBriefRendererPolicy({
  selectedMode,
  programme,
  attachmentMode,
}: ResolveDailyBriefRendererPolicyOptions): DailyBriefRendererPolicy {
  const defaultRenderer = getAutoDefaultRenderer();
  const renderer =
    selectedMode === "auto" ? defaultRenderer : selectedMode;

  return {
    selectedMode,
    renderer,
    defaultRenderer,
    programme,
    attachmentMode,
  };
}

export function getDailyBriefRendererPolicyLabel(
  policy: DailyBriefRendererPolicy,
) {
  if (policy.selectedMode !== "auto") {
    return "Manual override: Typst live selected by the operator.";
  }

  if (policy.attachmentMode === "production") {
    return `Auto default: Typst live for ${policy.programme} production briefs.`;
  }

  return `Auto default: Typst live for ${policy.programme} canary briefs.`;
}

type DailyBriefRendererHistoryInput = Pick<
  DailyBriefHistoryRecord,
  "programme" | "deliveryReceipts" | "renderAudit"
>;

function findReceiptRenderer(
  deliveryReceipts: DailyBriefHistoryRecord["deliveryReceipts"],
) {
  return deliveryReceipts.find((receipt) => receipt.renderer)?.renderer ?? null;
}

export function resolveDailyBriefRendererFromHistory(input: {
  brief: DailyBriefRendererHistoryInput;
  attachmentMode: GoodnotesAttachmentMode;
  selectedMode?: DailyBriefRendererMode;
}): DailyBriefRendererHistoryResolution {
  const receiptRenderer = findReceiptRenderer(input.brief.deliveryReceipts);

  if (receiptRenderer) {
    return {
      renderer: receiptRenderer,
      source: "delivery-receipt",
    };
  }

  const renderAuditRenderer = input.brief.renderAudit?.renderer ?? null;

  if (renderAuditRenderer) {
    return {
      renderer: renderAuditRenderer,
      source: "render-audit",
    };
  }

  return {
    renderer: resolveDailyBriefRendererPolicy({
      selectedMode: input.selectedMode ?? "auto",
      programme: input.brief.programme,
      attachmentMode: input.attachmentMode,
    }).renderer,
    source: "current-policy",
  };
}
