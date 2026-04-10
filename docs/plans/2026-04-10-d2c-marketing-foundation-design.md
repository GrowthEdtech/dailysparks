# Daily Sparks D2C Marketing Foundation Design

## Goal

Ship the first production-ready D2C marketing layer for Daily Sparks so the product can:

- measure acquisition and activation
- capture colder parent traffic before trial signup
- nurture trial families toward first value
- prepare a cleaner handoff into later referral work

## Why Now

Daily Sparks now has a stronger product surface than its marketing surface. The public site explains the product better than before, but the stack still lacks four foundational growth capabilities:

1. a shared product-marketing context
2. actionable marketing analytics
3. a lead capture layer for parents not ready to start a trial immediately
4. a more persuasive activation email sequence for trial families

## Scope

Phase 1 includes:

1. product marketing context
2. GA4-compatible event tracking foundation
3. an `IB Parent Starter Kit` lead magnet page and capture flow
4. an upgraded stage-based activation email sequence using the existing onboarding reminder scheduler

Out of scope for this phase:

- paid ads
- CRM / RevOps tooling
- complex referral rewards
- full newsletter platform integration
- a new B2B school funnel

## Product-Marketing Context

Create a reusable context document in `.agents/product-marketing-context.md` so future copy, SEO, lifecycle email, and referral work share the same positioning.

The document will capture:

- product overview
- target audience
- core pain points
- MYP and DP value promises
- objections and anti-personas
- customer language
- proof and goals

## Analytics Foundation

Add a lightweight GA4 foundation that is safe to deploy even when analytics is not configured.

### Requirements

- load GA4 only when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is present
- expose a small client helper for marketing events
- no-op cleanly when analytics is absent
- avoid PII in event payloads

### Initial Events

- `landing_cta_clicked`
- `guide_cta_clicked`
- `starter_kit_viewed`
- `starter_kit_submitted`
- `starter_kit_delivered`
- `trial_cta_clicked`
- `pricing_cta_clicked`
- `activation_email_clicked`

## Lead Magnet

Add a cold-traffic conversion path centered on an `IB Parent Starter Kit`.

### Public Surface

New public page:

- `/ib-parent-starter-kit`

The page will:

- explain who the starter kit is for
- preview what is inside
- capture name, parent email, and child stage interest
- immediately reveal success state and next step

### Persistence

Persist captured leads in a dedicated store with local and Firestore implementations.

Minimum stored data:

- lead id
- email
- parent name
- child stage interest
- source page
- UTM fields
- created / updated timestamps
- delivery status metadata

### Delivery

If transactional email is configured, send the starter kit by email immediately.

If email is not configured:

- still persist the lead
- return success
- show a non-blocking on-page fallback message

## Activation Email Sequence

Reuse the existing onboarding reminder scheduler, but upgrade the content into a real stage-based activation sequence instead of a generic Goodnotes reminder.

### Sequence Shape

Stage 1:

- focus: start the setup
- CTA: connect the primary delivery path
- supporting content: MYP / DP guide links and starter explanations

Stage 2:

- focus: get the first brief flowing
- CTA: finish delivery setup and review the dashboard
- supporting content: notebook and weekly recap value

Stage 3:

- focus: final activation push before trial momentum fades
- CTA: complete setup now
- supporting content: trial value and what families unlock after setup

### Constraints

- do not build a new scheduler
- preserve current due-stage logic and reminder history
- improve only message quality, CTA specificity, and activation framing

## CTA Split

Strengthen the homepage and SEO pages with a warmer/cooler traffic split:

- warm traffic: start trial
- colder traffic: get the parent starter kit

This keeps current signup intent while adding a softer capture path for parents still evaluating.

## Testing

Add or update tests for:

- GA script rendering and event-safe behavior
- homepage / guide CTA links and copy
- lead capture API
- lead capture persistence
- starter kit email builder
- upgraded onboarding activation email copy

## Risks

### Risk: Marketing analytics creates brittle runtime behavior

Mitigation:

- load only when env is present
- no-op helper by default

### Risk: Lead magnet capture adds a new data sink

Mitigation:

- isolate the store
- keep schema narrow
- test local and Firestore pathways through the shared store contract

### Risk: Activation email changes could weaken current onboarding reminder behavior

Mitigation:

- preserve existing stage timing logic
- update only copy and CTA framing
- keep current scheduler contract and tests
