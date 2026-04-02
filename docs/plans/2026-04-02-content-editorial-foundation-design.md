# Daily Sparks Content Editorial Foundation Design

## Goal

Define the first production-ready editorial foundation for Daily Sparks so future content generation can use:

- an approved media whitelist
- programme-aware source guidance for `PYP`, `MYP`, and `DP`
- repetition-control rules for daily news-driven reading briefs

## Why This Change

The current product already differentiates `PYP`, `MYP`, and `DP` in weekly-plan positioning, but the repo does not yet define how daily reading content should be sourced and governed.

Without a shared editorial foundation, future prompt work would drift in three ways:

- source quality would vary from day to day
- programme adaptation would be inconsistent
- repeated topics, angles, and question patterns would erode the "daily paper" feel

## Product Decision

Daily Sparks should not run three unrelated content streams.

It should instead use:

- one shared daily topic universe
- one approved source whitelist
- one repetition-control policy
- different programme output standards layered on top of the same editorial spine

This means the system can preserve a family-level conversation topic while still adapting difficulty and task depth for the learner stage.

## Editorial Model

### Shared Editorial Spine

Each published daily brief should begin from the same upstream structure:

- a chosen daily topic or event cluster
- the core facts that matter
- the trusted source set behind those facts
- the educational value of the topic

### Programme-Specific Output

The generated output should then branch by programme:

- `PYP`: curiosity-led, concrete, discussion-friendly, lighter background load
- `MYP`: analysis-led, comparative, interdisciplinary, medium context load
- `DP`: argument-led, evidence-aware, reflective, deeper context load

## Source Strategy

The system should use a curated whitelist rather than unrestricted web search.

### Source Roles

Whitelist sources should be grouped by editorial role:

- `daily-news`: fast, reliable event detection and baseline facts
- `explainer`: background, science, culture, and contextualization
- `pyp-friendly`: age-accessible world knowledge and child-friendly explainers
- `source-of-record`: official or institution-backed factual grounding

### Source Usage Tiers

Each source should also have a usage role:

- `primary-selection`: can seed the daily topic choice
- `background-context`: can deepen the brief after a topic is chosen
- `fact-check`: can verify public-health, science, or institution-led claims

### Whitelist V1

The first approved whitelist should prioritize stability over breadth:

- Reuters
- Associated Press
- BBC
- NPR
- Science News
- Science News Explores
- UNICEF
- WHO
- National Geographic
- Smithsonian Magazine

This set is intentionally broad enough for real-world variety but small enough to audit and maintain.

## Programme Fit

The whitelist should carry programme fit metadata.

### PYP

Bias toward:

- Science News Explores
- UNICEF
- National Geographic
- selected BBC or NPR human-interest items

Use with caution:

- Reuters and AP hard-news items, unless the topic has clear child-accessible framing

### MYP

Bias toward:

- Reuters
- AP
- BBC
- NPR
- Science News
- UNICEF
- WHO

### DP

Bias toward:

- Reuters
- AP
- BBC
- NPR
- Science News
- Smithsonian Magazine
- WHO

## Repetition-Control Rules

Using current news sources does not automatically prevent repetition.

The system should therefore define repetition controls at multiple levels:

### Topic Repetition

- avoid selecting the same topic cluster too frequently within a short window
- default window: 14 days

### Angle Repetition

- even when the same event remains newsworthy, rotate the framing
- examples:
  - science mechanism
  - human impact
  - ethical question
  - systems lens

### Question Repetition

- discussion prompts should not reuse the same family of question templates repeatedly
- default memory window: 30 days

### Source Repetition

- no single source should dominate the reading rhythm across a short span
- default guideline: cap repeated use from the same source inside a 7-day window

## Implementation Shape

The repo should add a reusable editorial policy module rather than a scraper.

That module should expose:

- whitelist entries
- programme-fit profiles
- source-role metadata
- repetition windows and limits
- helper selectors for future generation code

This keeps the current MVP stable while giving future prompt pipelines and ingestion scripts a single source of truth.

## Non-Goals

This round should not:

- build a crawler
- implement live RSS or scraping jobs
- generate daily briefs from news
- add an admin UI for editorial management

Those should come later, after the editorial foundation is explicit and tested.

## Testing Strategy

Automated tests should verify:

- the whitelist contains the approved v1 sources
- each source has at least one valid editorial role and usage tier
- every programme returns a sensible recommended source list
- repetition controls expose the expected windows and limits

## Deliverables

This design should land as:

- a design document in `docs/plans`
- an implementation plan in `docs/plans`
- a reusable TypeScript editorial policy module in `src/lib`
- unit tests that lock the policy
- a README note so future contributors understand the purpose of the new foundation
