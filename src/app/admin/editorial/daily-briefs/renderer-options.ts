export const DAILY_BRIEF_RENDERER_OPTIONS = [
  {
    value: "pdf-lib",
    label: "pdf-lib live",
    description: "Current production renderer",
  },
  {
    value: "typst",
    label: "Typst prototype",
    description: "Admin-only comparison renderer",
  },
] as const;

export type AdminDailyBriefRenderer =
  (typeof DAILY_BRIEF_RENDERER_OPTIONS)[number]["value"];

export function formatDailyBriefRendererLabel(
  renderer: string | null | undefined,
) {
  if (renderer === "typst") {
    return "Typst prototype";
  }

  if (renderer === "pdf-lib") {
    return "pdf-lib";
  }

  return "Not recorded";
}
