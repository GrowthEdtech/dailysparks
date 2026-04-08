# MYP DP Content Model V2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn Daily Sparks into a true `MYP + DP` dual-tier academic reading product by adding programme-native content contracts, weekend framing policy, and a structured Notion knowledge bank.

**Architecture:** Keep one shared editorial spine and one selected topic per edition/day, but add a shared product-policy helper that drives programme-native runtime prompts, packet semantics, render-audit labels, and Notion knowledge-bank structure. Use backward-compatible parsing so legacy briefs and `PYP` records keep working.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, Typst packet rendering, Notion API integration, existing daily brief orchestrator/history/store patterns.

---

### Task 1: Add shared product policy helpers

**Files:**
- Create: `src/lib/daily-brief-product-policy.ts`
- Test: `src/lib/daily-brief-product-policy.test.ts`

**Step 1: Write the failing test**

Cover:
- `MYP` resolves to a bridge-tier content model and `myp-bridge` layout
- `DP` resolves to an academic-tier content model and `dp-academic` layout
- weekend policy returns `Vision day` for `MYP` weekends
- weekend policy returns `TOK day` for `DP` weekends

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/daily-brief-product-policy.test.ts`

**Step 3: Write minimal implementation**

Add:
- programme-native labels and fallback headings
- weekend policy helper derived from `scheduledFor`
- knowledge-bank labels used by downstream consumers

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/daily-brief-product-policy.test.ts`

### Task 2: Lock packet-builder behavior with failing tests

**Files:**
- Modify: `src/lib/outbound-daily-brief-packet.test.ts`
- Modify: `src/lib/outbound-daily-brief-typst.test.ts`
- Modify: `src/lib/daily-brief-render-audit.test.ts`

**Step 1: Write the failing tests**

Add tests showing:
- `MYP` v2 markdown headings map into `Bridge brief`, `Inquiry question`, and `Notebook prompt`
- `DP` v2 markdown headings map into `3-sentence abstract`, `TOK / essay prompt`, and `Notebook capture`
- new layout variants drive the right render-audit page policy labels

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/lib/outbound-daily-brief-packet.test.ts src/lib/outbound-daily-brief-typst.test.ts src/lib/daily-brief-render-audit.test.ts
```

**Step 3: Write minimal implementation**

Update:
- `src/lib/outbound-daily-brief-packet.ts`
- `src/lib/outbound-daily-brief-typst.ts`
- `src/lib/daily-brief-render-audit.ts`
- any layout-variant types in history schema/store normalization

**Step 4: Run test to verify it passes**

Run the same command again.

### Task 3: Upgrade runtime prompt framing and weekend policy

**Files:**
- Modify: `src/lib/daily-brief-orchestrator.ts`
- Modify: `src/lib/daily-brief-orchestrator.test.ts`
- Create: `src/lib/daily-brief-selection-policy.test.ts`
- Modify: `src/lib/daily-brief-selection-policy.ts`
- Modify: `src/lib/prompt-policy-schema.ts`
- Modify: `src/lib/prompt-policy-store.test.ts`
- Modify: `src/lib/editorial-policy.ts`
- Modify: `src/lib/weekly-plan.ts`

**Step 1: Write the failing tests**

Add coverage for:
- weekend `MYP` generation prompt includes `Vision day` framing
- weekend `DP` generation prompt includes `TOK day` framing
- weekend topic selection prefers `Vision day` candidates for `MYP`
- weekend topic selection prefers `TOK day` candidates for `DP`
- shared `MYP + DP` weekend runs prefer a topic with combined weekend signals
- default prompt template instructs `MYP` and `DP` to follow their new section order

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/lib/daily-brief-orchestrator.test.ts src/lib/prompt-policy-store.test.ts
```

**Step 3: Write minimal implementation**

Update runtime generation to:
- bias shared weekend topic ranking toward `Vision day` / `TOK day` signals without splitting the one-topic editorial spine
- append programme-native structure expectations
- append weekend policy framing when relevant
- refresh weekly-plan Sunday copy so dashboard reflects the same system policy

**Step 4: Run test to verify it passes**

Run the same command again.

### Task 4: Implement knowledge bank v1 in Notion

**Files:**
- Create: `src/lib/daily-brief-knowledge-bank.ts`
- Test: `src/lib/daily-brief-knowledge-bank.test.ts`
- Modify: `src/lib/notion.ts`
- Modify: `src/lib/notion.test.ts`

**Step 1: Write the failing tests**

Cover:
- MYP knowledge bank yields inquiry/global-context capture sections
- DP knowledge bank yields claim/counterpoint/TOK capture sections
- Notion page creation uses programme-native `Prompt` text and structured notebook blocks

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/lib/daily-brief-knowledge-bank.test.ts src/lib/notion.test.ts
```

**Step 3: Write minimal implementation**

Add:
- knowledge-bank block builder derived from packet/programme policy
- Notion page child structure that appends the knowledge-bank section after core brief content

**Step 4: Run test to verify it passes**

Run the same command again.

### Task 5: Verify the whole slice

**Files:**
- No new feature files expected beyond those above

**Step 1: Run focused tests**

```bash
npm test -- src/lib/daily-brief-product-policy.test.ts src/lib/outbound-daily-brief-packet.test.ts src/lib/outbound-daily-brief-typst.test.ts src/lib/daily-brief-render-audit.test.ts src/lib/daily-brief-orchestrator.test.ts src/lib/prompt-policy-store.test.ts src/lib/daily-brief-knowledge-bank.test.ts src/lib/notion.test.ts
```

**Step 2: Run lint**

```bash
npm run lint -- src/lib/daily-brief-product-policy.ts src/lib/daily-brief-product-policy.test.ts src/lib/outbound-daily-brief-packet.ts src/lib/outbound-daily-brief-packet.test.ts src/lib/outbound-daily-brief-typst.ts src/lib/outbound-daily-brief-typst.test.ts src/lib/daily-brief-render-audit.ts src/lib/daily-brief-render-audit.test.ts src/lib/daily-brief-orchestrator.ts src/lib/daily-brief-orchestrator.test.ts src/lib/prompt-policy-schema.ts src/lib/prompt-policy-store.test.ts src/lib/editorial-policy.ts src/lib/weekly-plan.ts src/lib/daily-brief-knowledge-bank.ts src/lib/daily-brief-knowledge-bank.test.ts src/lib/notion.ts src/lib/notion.test.ts
```

**Step 3: Run full suite**

```bash
npm test
npm run build
```

**Step 4: Commit**

```bash
git add docs/plans/2026-04-07-myp-dp-content-model-v2-design.md docs/plans/2026-04-07-myp-dp-content-model-v2.md src/lib/daily-brief-product-policy.ts src/lib/daily-brief-product-policy.test.ts src/lib/outbound-daily-brief-packet.ts src/lib/outbound-daily-brief-packet.test.ts src/lib/outbound-daily-brief-typst.ts src/lib/outbound-daily-brief-typst.test.ts src/lib/daily-brief-render-audit.ts src/lib/daily-brief-render-audit.test.ts src/lib/daily-brief-orchestrator.ts src/lib/daily-brief-orchestrator.test.ts src/lib/prompt-policy-schema.ts src/lib/prompt-policy-store.test.ts src/lib/editorial-policy.ts src/lib/weekly-plan.ts src/lib/daily-brief-knowledge-bank.ts src/lib/daily-brief-knowledge-bank.test.ts src/lib/notion.ts src/lib/notion.test.ts
git commit -m "feat: add myp dp content model v2"
```
