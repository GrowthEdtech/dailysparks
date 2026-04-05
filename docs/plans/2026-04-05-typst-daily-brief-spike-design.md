# Typst Daily Brief Spike Design

## Goal

Validate whether Typst can become the next-generation renderer for Daily Sparks
PDFs without disturbing the current production `pdf-lib` delivery chain.

## Decision

Daily Sparks will add a low-risk Typst prototype path for `Daily Brief PDF`
generation.

This spike will:

- reuse the existing outbound content packet from
  `src/lib/outbound-daily-brief-packet.ts`
- keep the production Goodnotes delivery pipeline on `pdf-lib`
- add an admin-only prototype surface for comparing Typst output
- prove or disprove that Typst improves maintainability and layout fidelity

This spike will not:

- replace the production PDF renderer
- change attachment generation for live delivery
- introduce Typst into scheduler or resend paths

## Why now

The recent packet cleanup solved the most visible content-quality issues:

- markdown artifacts such as `**bold**` no longer need to leak into output
- teaching blocks like `Words to know` and `Big idea` now exist as structured
  packet fields
- admin preview and production PDF now share the same packet model

That means the next question is no longer "can we format the content at all?",
but "is there a better long-term layout engine for these editorial packets?"

Typst is a strong candidate because:

- it models document hierarchy more naturally than manual `pdf-lib` drawing
- it should scale better for future multi-page editorial packets
- it can express cards, hierarchy, and repeated layout systems more cleanly

## Recommended spike shape

### Production path remains unchanged

- `src/lib/goodnotes-delivery.ts` stays the live renderer
- live Goodnotes delivery continues to use `pdf-lib`
- existing thumbnail and resend flows remain stable

### Prototype path is separate

Add a new Typst prototype surface that is deliberately admin-only.

Recommended components:

- `src/lib/outbound-daily-brief-typst.ts`
  - builds Typst source from the outbound packet
  - optionally compiles Typst to PDF when the runtime supports it
- `src/app/api/admin/daily-brief-typst/[briefId]/route.ts`
  - returns a prototype PDF if compilation succeeds
  - otherwise returns the Typst source or a structured fallback response
- admin detail page link or panel
  - gives operators a side-by-side path to inspect the Typst prototype

## Success criteria

The spike is successful if all three conditions are true:

1. A `Daily Brief` record can be rendered into valid Typst source from the
   current outbound packet.
2. The Typst prototype produces a visually credible first-page layout using the
   same editorial structure as the current PDF.
3. The implementation stays isolated enough that we can abandon it without
   touching production delivery if Typst proves not worth the migration.

## Evaluation criteria

### Layout quality

Compare Typst against the current `pdf-lib` PDF on:

- title wrapping
- section rhythm
- callout block consistency
- footer system
- multi-page readiness

### Engineering maintainability

Compare on:

- how much custom measurement code is needed
- how easy it is to change spacing and typography
- how naturally new blocks fit into the document model

### Deployment practicality

Validate:

- whether a Node-compatible Typst compiler works in local development
- whether it also works in Cloud Run build/runtime
- whether thumbnail and admin preview can be supported without fragile hacks

## Risk management

### Main risk

The biggest risk is not visual quality. It is operational complexity:

- native or wasm Typst tooling may complicate deploys
- runtime compilation may be too heavy for on-demand admin routes
- PDF thumbnail generation may need a second rendering pass

### Mitigation

Keep the spike off the critical path:

- no live attachment generation
- no scheduler use
- no automatic send path changes
- admin-only visibility until proven stable

## Implementation outline

1. Add a Typst source builder from the outbound packet.
2. Add tests that verify structured packet fields land in Typst source.
3. Add a compile helper and feature-detect whether Typst compilation is
   available.
4. Add an admin-only route for the prototype output.
5. Add a small CTA in `Daily Brief` admin detail to open/download the Typst
   prototype.
6. Compare output quality before deciding on a full migration.

## Recommendation

Proceed with the spike now, but do not commit to migration yet.

The right next milestone is:

- `Typst prototype works in admin`

Only after that should we decide whether to:

- keep `pdf-lib`
- move to dual-render support
- or fully migrate outbound PDF generation to Typst
