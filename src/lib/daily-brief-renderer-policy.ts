import type {
  DailyBriefPdfRenderer,
  GoodnotesAttachmentMode,
} from "./goodnotes-delivery";
import type { Programme } from "./mvp-types";

export const DAILY_BRIEF_RENDERER_MODES = [
  "auto",
  "pdf-lib",
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
  isRollbackActive: boolean;
};

const DEFAULT_PYP_CANARY_RENDERER: DailyBriefPdfRenderer = "typst";
const DEFAULT_NON_PYP_CANARY_RENDERER: DailyBriefPdfRenderer = "pdf-lib";
const DEFAULT_PRODUCTION_RENDERER: DailyBriefPdfRenderer = "pdf-lib";
const PYP_CANARY_RENDERER_DEFAULT_ENV =
  "DAILY_BRIEF_PYP_CANARY_RENDERER_DEFAULT";

function normalizeRenderer(
  value: string | undefined,
): DailyBriefPdfRenderer | null {
  if (value === "pdf-lib" || value === "typst") {
    return value;
  }

  return null;
}

function getPypCanaryDefaultRenderer() {
  const envValue = normalizeRenderer(
    process.env[PYP_CANARY_RENDERER_DEFAULT_ENV]?.trim(),
  );

  return envValue ?? DEFAULT_PYP_CANARY_RENDERER;
}

function isPypCanaryPolicy(
  programme: Programme,
  attachmentMode: GoodnotesAttachmentMode,
) {
  return programme === "PYP" &&
    (attachmentMode === "canary" || attachmentMode === "test");
}

function getAutoDefaultRenderer(
  programme: Programme,
  attachmentMode: GoodnotesAttachmentMode,
) {
  if (isPypCanaryPolicy(programme, attachmentMode)) {
    return getPypCanaryDefaultRenderer();
  }

  if (attachmentMode === "production") {
    return DEFAULT_PRODUCTION_RENDERER;
  }

  return DEFAULT_NON_PYP_CANARY_RENDERER;
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
  const defaultRenderer = getAutoDefaultRenderer(programme, attachmentMode);
  const renderer =
    selectedMode === "auto" ? defaultRenderer : selectedMode;
  const isRollbackActive =
    isPypCanaryPolicy(programme, attachmentMode) &&
    getPypCanaryDefaultRenderer() !== DEFAULT_PYP_CANARY_RENDERER;

  return {
    selectedMode,
    renderer,
    defaultRenderer,
    programme,
    attachmentMode,
    isRollbackActive,
  };
}

export function getDailyBriefRendererPolicyLabel(
  policy: DailyBriefRendererPolicy,
) {
  if (policy.selectedMode !== "auto") {
    return `Manual override: ${policy.renderer === "typst" ? "Typst prototype" : "pdf-lib live"} selected by the operator.`;
  }

  if (isPypCanaryPolicy(policy.programme, policy.attachmentMode)) {
    if (policy.isRollbackActive && policy.renderer === "pdf-lib") {
      return "Auto default: pdf-lib live for PYP canary briefs (rollback active).";
    }

    return "Auto default: Typst prototype for PYP canary briefs.";
  }

  if (policy.attachmentMode === "production") {
    return "Auto default: pdf-lib live for production delivery.";
  }

  return "Auto default: pdf-lib live for non-PYP canary delivery.";
}
