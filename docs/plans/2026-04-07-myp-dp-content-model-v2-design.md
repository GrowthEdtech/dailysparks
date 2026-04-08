# MYP DP Content Model V2 Design

## Goal

Upgrade Daily Sparks from a programme-aware brief generator into a dual-tier academic reading product:

- `MYP` as a bridge-tier analytical reading experience
- `DP` as an academic evidence-and-argument experience

This phase should also turn the existing weekly rhythm into a real weekend delivery policy and upgrade the current Notion archive into a structured `knowledge bank v1`.

## Why This Phase Matters

The repo already has:

- one shared editorial spine and one selected topic cluster per day
- programme-aware generation for `PYP`, `MYP`, and `DP`
- Typst-based packet rendering and delivery
- a working Notion archive sink

What it does not yet have is a true product split between `MYP` and `DP`.

Right now:

- prompt contracts are still structurally generic
- `MYP` and `DP` are mostly different tones applied to the same shape
- weekend rhythm is descriptive, not operational
- Notion stores briefs as archive pages, not as a cumulative academic notebook

## Product Decision

Keep the shared topic/source spine and the `one source, two tiers` mechanism.

Do **not** split the system into separate MYP and DP source pipelines.

Instead:

- keep one selected topic cluster per edition/day
- generate programme-native outputs for `MYP` and `DP`
- make weekend behavior programme-specific at the framing layer
- treat Notion as a structured knowledge sink rather than a passive archive

This preserves editorial efficiency and operational simplicity while making the learner-facing product meaningfully different.

## Scope Of This Phase

This phase should land three connected upgrades:

1. `MYP / DP content model v2`
2. `Weekend delivery policy`
3. `Knowledge bank v1`

This phase does **not** yet include:

- per-student personalized article selection
- teacher analytics / B2B classroom views
- full notebook UI inside the product
- DP-specific multi-article dossier mode

## Decision 1: MYP / DP Content Model V2

The shared JSON transport should remain:

- `headline`
- `summary`
- `briefMarkdown`
- `topicTags`

The differentiation should happen through programme-native structure inside `briefMarkdown`, plus programme-native packet semantics when building Typst and Notion outputs.

### MYP Model

`MYP` should feel like a bridge-tier analytical reading session.

Recommended section order:

- `What's happening?`
- `Why does this matter?`
- `Global context`
- `Compare or connect`
- `Words to know`
- `Inquiry question`
- `Notebook prompt`

Design intent:

- support cause/effect and perspective comparison
- connect the story to `Global Contexts`
- build inquiry, not full essay-writing pressure

### DP Model

`DP` should feel like an academic framing and idea-capture workflow.

Recommended section order:

- `3-sentence abstract`
- `Core issue`
- `Claim`
- `Counterpoint or evidence limit`
- `Why this matters for IB thinking`
- `Key academic term`
- `TOK / essay prompt`
- `Notebook capture`

Design intent:

- move beyond summary into interpretation
- foreground claim, evidence, uncertainty, and academic usefulness
- accumulate reusable thinking for `TOK`, essay planning, and independent argument

### Runtime Strategy

Do not depend on editors manually updating the active prompt policy before the system benefits.

Instead:

- keep prompt policy records as editable house style
- add a built-in programme-native runtime contract in generation code
- preserve backwards compatibility with old briefs by making packet parsing accept both legacy and v2 headings

## Decision 2: Weekend Delivery Policy

Weekend behavior should become a real system rule instead of only dashboard copy.

### Weekday

- continue normal daily generation
- use standard programme framing

### MYP Weekend Mode

`MYP` weekends should become `Vision day`.

Editorial intent:

- curiosity-rich
- global perspective
- future-facing or cross-disciplinary framing
- stronger inquiry energy than weekday structure

### DP Weekend Mode

`DP` weekends should become `TOK day`.

Editorial intent:

- ethics
- knowledge questions
- interdisciplinary tension
- evidence limits, ambiguity, and interpretive framing

### Architectural Constraint

The system still selects one shared topic cluster for the day.

So weekend policy in this phase should operate through:

- a shared weekend-aware ranking bias inside topic selection
- programme-specific framing instructions
- programme-specific packet labels and prompts
- programme-specific knowledge-capture prompts

It should **not** yet attempt per-programme topic divergence. Instead, the shared topic selector should prefer candidates whose headline and summary better match `Vision day` and `TOK day` intent signals whenever the run falls on a weekend.

## Decision 3: Knowledge Bank V1

Notion should shift from `archive page` to `structured academic capture sink`.

### MYP Knowledge Bank

Target outcome:

- inquiry notebook
- global-context connection
- compare/connect reflection
- saved vocabulary with meaning in context

### DP Knowledge Bank

Target outcome:

- idea bank for `TOK / essay / EE-style thinking`
- saved claim and counterpoint frame
- academic term capture
- notebook-ready writing prompt

### V1 Delivery Shape

Keep the existing Notion database schema stable in this phase.

Do not require new database properties.

Instead:

- keep existing Title / Date / Programme / Theme / Summary / Prompt properties
- upgrade page `children` into a structured knowledge bank layout
- make `Prompt` property programme-native instead of generic family discussion text

This minimizes rollout risk while still changing the learner value of every archived page.

## Architecture

### Shared Product Policy Helper

Add a single helper module that owns:

- programme-native content model labels
- layout variants
- weekend policy labels and runtime notes
- knowledge-bank framing metadata

This helper should be reused by:

- orchestrator runtime prompt assembly
- packet building
- render audit policy labels
- Notion knowledge bank generation
- weekly plan/dashboard copy

### Packet Builder

`buildOutboundDailyBriefPacket` should become the semantic bridge between `briefMarkdown` and downstream renderers.

It should:

- recognize both legacy and v2 section headings
- produce `myp-bridge` and `dp-academic` layout variants
- set programme-native labels for summary, reading, discussion, and notebook capture
- expose structured fields needed by Typst and Notion

### Notion Sink

The Notion writer should build page children from packet semantics, not directly from raw markdown paragraphs.

That allows:

- cleaner academic sections
- programme-native notebook blocks
- future reuse for non-Notion knowledge sinks

## Testing Strategy

This phase should lock behavior in four places:

1. `product policy helper`
- weekday vs weekend rules
- MYP vs DP framing metadata

2. `packet builder`
- MYP v2 headings map into bridge-tier packet labels
- DP v2 headings map into academic packet labels
- legacy headings still parse safely

3. `orchestrator runtime`
- weekend generation prompts include the correct programme-specific override

4. `Notion knowledge sink`
- MYP pages include inquiry notebook structure
- DP pages include academic idea-bank structure
- no new database-schema dependency is introduced

## Risks

### Prompt Drift

If prompt policy text and hardcoded runtime structure disagree, editors will see one thing in admin and get another in production. The runtime v2 scaffolds should therefore be explicit and predictable, not hidden magic.

### Legacy Brief Parsing

Old `briefMarkdown` values will still exist in history. Packet parsing must remain tolerant of older headings, otherwise history previews and resend flows will regress.

### Notion Schema Fragility

Adding new database properties would risk breaking existing parent workspaces. This phase should only upgrade page body structure, not database schema requirements.

## Deliverables

This phase should land:

- a design doc in `docs/plans`
- an implementation plan in `docs/plans`
- a shared `daily brief product policy` helper
- upgraded runtime prompt framing for `MYP` and `DP`
- upgraded packet/layout semantics for `MYP` and `DP`
- a real weekend framing policy
- `knowledge bank v1` structure in Notion page bodies
- automated tests that lock the new behavior
