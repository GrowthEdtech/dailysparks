export type OperationsHealthReadinessModule = {
  title: string;
  summary: string;
  items: string[];
  evidence: string[];
  canonicalDocPath: string;
};

export const OPERATIONS_HEALTH_STABILIZATION_DOC_PATH =
  "docs/plans/2026-04-07-operations-health-stabilization-design.md";

export const OPERATIONS_HEALTH_IMPLEMENTATION_PLAN_PATH =
  "docs/plans/2026-04-07-operations-health-stabilization.md";

export const OPERATIONS_HEALTH_READINESS_MODULES: OperationsHealthReadinessModule[] =
  [
    {
      title: "Production stabilization checklist",
      summary: "Confirm canary passes before trusting today's production wave.",
      items: [
        "Verify canary is passing and blocked-by-canary count is zero before the first user wave.",
        "Check retry-delivery count and confirm it is shrinking, not growing, across the current run window.",
        "Review alert count and treat any critical Daily Brief or billing alert as a stop-the-line condition.",
        "Confirm the latest GEO monitoring and billing reconciliation runs have fresh timestamps and no unresolved failures.",
      ],
      evidence: [
        "Operations Health summary cards",
        "Recent alerts",
        "Auto-remediation workflows",
        "Daily Brief detail and canary panel",
      ],
      canonicalDocPath: OPERATIONS_HEALTH_STABILIZATION_DOC_PATH,
    },
    {
      title: "Ops drill plan",
      summary: "Rehearse the exact failure paths before they happen in production.",
      items: [
        "Simulate canary fail and validate that the wave moves into blocked-by-canary without leaking to users.",
        "Practice rerun canary and confirm the rerun uses the same renderer evidence as the blocked brief.",
        "Practice release-and-deliver and confirm receipts are written after the blocked wave is manually released.",
        "Trigger a billing webhook miss scenario and verify daily reconciliation backfills the missing invoice evidence.",
      ],
      evidence: [
        "Synthetic canary panel actions",
        "Operations Health remediation history",
        "Billing backfill evidence",
        "Delivery receipts",
      ],
      canonicalDocPath: OPERATIONS_HEALTH_IMPLEMENTATION_PLAN_PATH,
    },
    {
      title: "Incident runbook / SOP",
      summary: "Escalate consistently by choosing the smallest safe action first.",
      items: [
        "Use rerun canary first when the blocked wave still needs a fresh synthetic proof.",
        "Use release-and-deliver only after canary evidence and current alerts make it safe to resume production.",
        "Wait for auto-remediation when the issue is already inside retry-delivery, billing reconciliation, or GEO rerun and the SLA window is still open.",
        "Escalate to critical ops intervention when repeated alerts, blocked waves, or unresolved notification breaches survive one remediation cycle.",
      ],
      evidence: [
        "Operations Health alerts",
        "Blocked-canary counts",
        "Retry and billing reconciliation logs",
        "Notification ops queue",
      ],
      canonicalDocPath: OPERATIONS_HEALTH_STABILIZATION_DOC_PATH,
    },
  ];
