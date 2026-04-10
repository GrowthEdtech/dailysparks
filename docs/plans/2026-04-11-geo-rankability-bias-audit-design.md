# GEO Rankability and Bias Audit Design

## Context

Daily Sparks already has a GEO foundation: public canonical pages, sitemap, robots, `llms.txt`, `llms-full.txt`, website-derived GEO prompts, machine-readability checks, visibility logs, scheduled monitoring, and an admin GEO Copilot workspace.

The next step is to make the system more robust for AI-search and LLM recommendation flows. The paper [arXiv:2603.17417](https://arxiv.org/pdf/2603.17417) frames LLMs as recommender agents that choose from candidate pools and shows that recommendation choices can be affected by contextual and context-agnostic biases. For Daily Sparks, the practical takeaway is that GEO cannot stop at being crawlable or flattering. Our public content needs to be rankable, sourceable, and resilient against hype-driven or structurally biased recommendation behavior.

## Goal

Add a Phase 1 GEO rankability and bias-resistance layer that helps the team see whether Daily Sparks content can survive recommendation-style AI search queries such as:

- Which IB reading workflow should a parent choose?
- Is Daily Sparks useful for DP students?
- Daily Sparks vs tutoring for IB reading support.
- Best Goodnotes workflow for IB students.

## Strategy

### 1. Rankability

AI systems often compare candidate passages, not whole pages. Daily Sparks pages should expose self-contained passages with:

- a clear entity: Daily Sparks, Growth Education Limited, IB parents, MYP, DP, Goodnotes, Notion
- a clear use case: calmer daily reading, student delivery, parent visibility, notebook capture, weekly recap
- a clear fit: who the workflow is for
- a clear boundary: who it is not for

The content audit should detect whether the draft has enough candidate passages and whether those passages are concise enough to be lifted into AI answers.

### 2. Citation Readiness

The current CSQAF checks remain useful, but they need a Daily Sparks-specific layer. The audit should check for:

- specific Daily Sparks entity language
- IB programme specificity
- Goodnotes / Notion / weekly recap workflow evidence
- parent-facing decision language
- update or source signals

### 3. Bias Resistance

The arXiv paper highlights that LLM recommendation choices can be swayed by irrelevant or weak signals such as position, verbosity, authority cues, bandwagon language, adversarial instruction, and marketing framing. For Daily Sparks, the audit should flag:

- excessive hype without evidence
- fabricated or unsupported authority cues
- bandwagon-style popularity claims
- instruction-like text that tells AI systems how to rank the product
- overlong passages that dilute useful evidence
- irrelevant distractions away from the parent/IB workflow

The audit should also reward protective signals:

- neutral comparison
- fit boundaries
- specific evidence
- clear use-case framing

## Architecture

Reuse `src/lib/geo-content-audit.ts` as the main public API for content scoring. This avoids creating a second disconnected audit path.

Add structured output to `GeoContentAuditResult`:

- `rankability`
- `citationReadiness`
- `biasResistance`

Then wire the same audit into:

- `/api/admin/geo-content-audit`
- `src/app/admin/editorial/geo-copilot/geo-copilot-panel.tsx`
- scheduled/manual GEO monitoring runs through aggregate run fields

Monitoring should persist lightweight aggregate scores:

- `rankabilityScore`
- `citationReadinessScore`
- `biasResistanceScore`

These are intentionally numeric and backwards-compatible with existing run records.

## Admin UX

The admin GEO Copilot should show the new layer in two places:

- The content audit result card should display rankability, citation readiness, and bias resistance.
- Recent monitoring run cards should show the current machine-readable source pack scores so operators can see whether the live site is becoming more rankable over time.

## Machine-Readable Source Pack

Update `llms.txt` and `llms-full.txt` so AI systems see stronger source passages:

- list all public canonical content routes, not only home/about/contact
- explain the parent-facing IB workflow
- include fit / not-fit boundaries
- describe MYP and DP differences
- describe Goodnotes and Notion roles
- avoid hype-first language

## Non-Goals

- Do not build a full external LLM-as-recommender benchmark yet.
- Do not add competitor scraping or third-party review mining in this phase.
- Do not store full page HTML snapshots in Firestore.
- Do not change public landing page layout in this phase.

## Success Criteria

- The content audit returns rankability, citation-readiness, and bias-resistance scores.
- Biased/hype-heavy content is flagged with concrete issues and suggestions.
- Strong Daily Sparks content receives higher rankability and citation-readiness scores.
- Monitoring runs persist the new aggregate GEO scores.
- Admin GEO Copilot renders the new scores.
- `llms.txt` and `llms-full.txt` contain all public canonical content pages and stronger source passages.
