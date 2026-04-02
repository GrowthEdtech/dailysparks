# Content Editorial Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a reusable Daily Sparks editorial foundation covering the approved source whitelist, programme fit, and repetition controls.

**Architecture:** Store the editorial foundation as a plain TypeScript module in `src/lib` so future ingestion or prompt-generation code can import it without depending on UI code. Lock the behavior with focused unit tests and document the policy in the README.

**Tech Stack:** TypeScript, Vitest, Markdown docs

---

### Task 1: Add the failing editorial policy test

**Files:**
- Create: `src/lib/editorial-policy.test.ts`
- Reference: `src/lib/weekly-plan.ts`

**Step 1: Write the failing test**

Add tests that require:

- a whitelist of exactly the approved v1 sources
- programme-aware recommended source lists for `PYP`, `MYP`, and `DP`
- explicit repetition-control windows for source, topic, angle, and question reuse

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/lib/editorial-policy.test.ts
```

Expected:

- FAIL because `src/lib/editorial-policy.ts` does not exist yet

### Task 2: Add the minimal editorial policy module

**Files:**
- Create: `src/lib/editorial-policy.ts`
- Test: `src/lib/editorial-policy.test.ts`

**Step 1: Write minimal implementation**

Add:

- source-entry types
- whitelist constants
- programme editorial profiles
- repetition-control config
- helper selectors such as `getRecommendedSourcesForProgramme`

**Step 2: Run test to verify it passes**

Run:

```bash
npm test -- src/lib/editorial-policy.test.ts
```

Expected:

- PASS

### Task 3: Document the policy for contributors

**Files:**
- Modify: `README.md`

**Step 1: Add a short editorial foundation section**

Document:

- whitelist v1 purpose
- why the project uses a curated source pool
- how programme adaptation works
- what the repetition policy is meant to protect

**Step 2: Run lint-free verification via full project checks**

Run:

```bash
npm run lint -- src/lib/editorial-policy.ts src/lib/editorial-policy.test.ts README.md
```

Expected:

- PASS for the TypeScript files

### Task 4: Run full verification

**Files:**
- Modify: none

**Step 1: Run focused tests**

```bash
npm test -- src/lib/editorial-policy.test.ts
```

**Step 2: Run full tests**

```bash
npm test
```

**Step 3: Run production build**

```bash
npm run build
```

Expected:

- tests pass
- build passes
- any existing Turbopack tracing warning remains unchanged and is reported honestly

### Task 5: Commit

**Step 1: Commit the completed foundation**

```bash
git add docs/plans/2026-04-02-content-editorial-foundation-design.md docs/plans/2026-04-02-content-editorial-foundation.md README.md src/lib/editorial-policy.ts src/lib/editorial-policy.test.ts
git commit -m "feat: add editorial source foundation"
```
