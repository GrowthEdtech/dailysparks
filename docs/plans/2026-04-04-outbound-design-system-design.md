# Outbound Design System Design

## Goal

Create one consistent outbound visual system for Daily Sparks so that PDFs and
transactional emails feel like the same premium Growth Education product rather
than three separate engineering outputs.

## Decision

Daily Sparks will adopt a single outbound design system that covers:

- `Welcome Note PDF`
- `Daily Brief PDF`
- `Onboarding Reminder Email`

The system will be designed in Canva first, then translated into production
code with two different implementation modes:

- `PDF-faithful` rendering for PDF assets
- `email-safe premium minimal` rendering for transactional email

## Why now

The current outbound assets are functional but visually uneven:

- `Welcome Note PDF` already has some premium styling but is still mostly
  hand-laid engineering output.
- `Daily Brief PDF` is readable but lacks a strong editorial identity.
- `Onboarding Reminder Email` is clean and safe, but more utilitarian than
  brand-led.

Because these assets are what parents actually receive, improving them has a
direct effect on trust, perceived product quality, and onboarding conversion.

## Outbound brand direction

The visual direction is `premium minimal editorial`.

This means:

- strong typography hierarchy
- deep navy as the anchor color
- warm gold as the accent color
- pale blue and warm white as supporting surfaces
- soft borders and restrained shadows
- generous whitespace
- no heavy gradients, no busy illustrations, no decorative clutter

The experience should feel closer to a polished editorial packet than a
marketing flyer.

## Core brand tokens

### Color system

- Primary ink: `#0f172a`
- Primary hover/deeper ink: `#1e293b`
- Accent gold: `#fbbf24`
- Accent gold dark text pairing: `#b45309`
- Pale editorial blue: `#eef6ff`
- Warm paper: `#fffdfa`
- Soft card white: `#ffffff`
- Quiet border: `#dbe4f0`
- Secondary text: `#475569`
- Tertiary text: `#64748b`

### Typography system

The outbound system uses a two-family hierarchy:

- Heading family: elegant serif for titles and major pull moments
- Body family: clean sans-serif for paragraphs, labels, metadata, and CTA text

Implementation fallback if font licensing or PDF embedding becomes costly:

- Heading fallback: `Georgia`
- Body fallback: `Helvetica` / `Arial`

### Shape and spacing

- Large card radius: `24-28px`
- Small badge radius: `999px`
- Outer content width should feel centered and calm, not edge-to-edge
- Internal sections should use card rhythm rather than long uninterrupted text
- Shadows should be subtle and mostly used on web previews, not aggressively in
  email

## Canva design scope

Canva is the source of truth for the visual system, not the literal renderer
for production email HTML.

### Deliverables in Canva

1. `Outbound Brand Board`
   - palette
   - typography hierarchy
   - badges
   - buttons
   - card surfaces
   - metadata rows
   - footer signature

2. `Welcome Note PDF`
   - final page composition
   - desktop print/export view

3. `Daily Brief PDF`
   - first-page template
   - content section system
   - source/reference layout

4. `Onboarding Reminder Email`
   - desktop width comp
   - mobile width comp
   - email-safe component variants

5. `Design-to-code mapping notes`
   - which effects are safe for PDF
   - which effects must be simplified for email

## PDF visual specification

### Welcome Note PDF

Purpose: onboarding confirmation and brand first impression.

Required structure:

- top brand band with eyebrow
- main title: `Welcome to Daily Sparks`
- one short intro paragraph
- `Setup confirmed` feature card
- one section describing what to expect
- one section describing weekly rhythm
- one short `Next steps` list
- final signature block with `Growth Education Limited`

Visual rules:

- pale blue primary panel for the setup confirmation card
- gold eyebrow or micro-label for key emphasis
- serif heading, sans body
- large top breathing room
- signature block should feel formal and calm, not promotional

### Daily Brief PDF

Purpose: daily reading experience, not just data export.

Required structure:

- editorial header band
- issue metadata row
  - date
  - programme
  - cohort
- story title
- short summary deck
- main reading body
- discussion or reflection area
- source references area
- footer signature with `Growth Education Limited`

Visual rules:

- first page should clearly establish edition identity
- metadata should feel structured and scannable
- summary should sit in a lightly differentiated card
- main body text should optimize for long-form reading
- references should be visually quieter but still legible
- source and discussion sections should not look like raw appendices

## Email-safe specification

The reminder email should share the same brand system, but it must not try to
copy complex website or Canva effects 1:1.

### Hard constraints

- single-column layout
- maximum width around `600px`
- table-friendly structure
- inline styles only
- no background images
- no glassmorphism
- no reliance on external web fonts
- all essential content must remain readable with images disabled
- plain-text version remains required

### Visual direction

- white or warm-white content card on a pale background
- dark headline text
- one strong primary CTA
- one supporting recommendation card
- light brand accent through eyebrow, outline, and CTA
- consistent footer signature: `Growth Education Limited`

### Messaging rules

- Goodnotes remains the primary activation CTA
- Notion remains a secondary optional path
- copy should feel like guided onboarding, not system warning
- no more than one primary CTA per email

## Implementation strategy

The implementation should preserve one design system but deliberately split into
two rendering modes.

### Mode 1: PDF-faithful

The production PDFs should follow the Canva composition closely. This is where
we should spend the most design fidelity effort.

### Mode 2: Email-safe premium minimal

The email should reuse the same hierarchy, colors, and language, but simplify:

- fewer layers
- fewer nested cards
- no complex ornament
- stronger compatibility over perfect visual parity

## Non-goals

This slice does not include:

- redesigning dashboard or admin UI
- changing prompt policy content
- changing daily brief information architecture
- converting email to image-heavy newsletter format
- adding marketing campaign automation

## Implementation order

1. Create `Outbound Brand Board` in Canva
2. Design and export `Welcome Note PDF` template
3. Refactor production welcome note PDF renderer to match
4. Design and export `Daily Brief PDF` template
5. Refactor daily brief PDF renderer to match
6. Design `Onboarding Reminder Email` comp in Canva
7. Translate email comp into email-safe HTML
8. Add visual regression checks and live smoke validation

## Success criteria

- Welcome Note PDF and Daily Brief PDF clearly look like the same family
- Reminder email looks branded without sacrificing email client safety
- All outbound assets consistently use `Growth Education Limited`
- The outbound system feels premium, minimal, and calm rather than overly
  decorative
- Production rendering remains testable and maintainable
