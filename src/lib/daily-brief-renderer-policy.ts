import type {
  DailyBriefPdfRenderer,
  GoodnotesAttachmentMode,
} from "./goodnotes-delivery";
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
