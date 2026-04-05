export const DAILY_BRIEF_RENDERER_OPTIONS = [
  {
    value: "auto",
    label: "Auto (policy)",
    description: "Uses the Typst live default for this brief",
  },
  {
    value: "typst",
    label: "Typst live",
    description: "Current Daily Brief production renderer",
  },
] as const;

export type AdminDailyBriefRenderer =
  (typeof DAILY_BRIEF_RENDERER_OPTIONS)[number]["value"];

export function formatDailyBriefRendererModeLabel(
  rendererMode: string | null | undefined,
) {
  if (rendererMode === "auto") {
    return "Auto (policy)";
  }

  return formatDailyBriefRendererLabel(rendererMode);
}

export function formatDailyBriefRendererLabel(
  renderer: string | null | undefined,
) {
  if (renderer === "typst") {
    return "Typst live";
  }

  if (renderer === "pdf-lib") {
    return "Legacy pdf-lib";
  }

  return "Not recorded";
}
