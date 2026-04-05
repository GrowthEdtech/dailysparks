# Notification Email Policy Design

## Goal

Define one explicit outbound email policy for Daily Sparks so the team can tell
which user-facing emails should render as lightweight HTML notifications and
which flows should continue to deliver a PDF learning asset.

## Decision

Daily Sparks will separate outbound email into two product surfaces:

- `HTML notification emails`
- `PDF attachment delivery transports`

The policy is content-first:

- emails whose job is to prompt, remind, confirm, or guide should be rendered
  as `HTML notifications`
- emails whose job is to move the actual learning asset into Goodnotes should
  continue to carry the asset as a `Typst PDF`

## Why this split is right

The current system serves two different jobs:

1. `Onboarding reminder` is a parent-facing prompt. It should be easy to scan
   on mobile, support one CTA, and feel light.
2. `Daily Brief` and `Welcome Note` are the actual learning artifacts. Their
   real value is the PDF attachment that lands in Goodnotes, not the email body.

Trying to force both jobs into one format would either make notifications too
heavy or make the learning asset feel disposable.

## Policy

### HTML notifications

These should render as email-safe HTML with a plain-text fallback:

- `Onboarding reminder`
- future `trial ending reminder`
- future `billing / payment status update`
- future `delivery support / channel attention` emails

Shared traits:

- one primary CTA
- parent inbox as the destination
- skimmable structure
- mobile-first spacing
- no attachment required

### PDF content transports

These should continue to send the learning asset as a Typst PDF attachment:

- `Goodnotes welcome note`
- `Daily Brief delivery`

Shared traits:

- attachment is the product
- destination may be a Goodnotes ingestion address rather than a human inbox
- email body stays lightweight and secondary
- PDF remains the canonical learning format

## HTML notification design system

The HTML notification design system should be code-native and email-safe, not
runtime-rendered from Canva.

### Visual direction

- deep navy text
- warm gold eyebrow / emphasis
- pale editorial blue recommendation cards
- warm paper content surface
- quiet borders
- rounded but restrained card shapes

### Layout rules

- table-based outer layout for compatibility
- one centered content card
- hidden preview text
- one headline
- up to two supporting highlight panels
- one primary CTA
- short footer with `Growth Education Limited`

### Copy rules

- concise subject lines
- one action per email
- no marketing clutter
- clear distinction between the notification itself and any optional supporting
  context

## What changes in code

1. Add a typed `notification-email policy` module that records which families
   are `HTML` and which stay `PDF transport`.
2. Add a shared `notification email design system` renderer that outputs:
   - email-safe HTML
   - plain-text fallback
3. Move `onboarding reminder` onto that shared renderer.
4. Keep `Goodnotes welcome note` and `Daily Brief` as PDF transports, but make
   their transport role explicit in policy so later work does not accidentally
   convert learning-content delivery into pure HTML.

## Non-goals

- Replacing Typst PDFs with HTML for learning-content delivery
- Rendering emails from Canva at runtime
- Building a full visual email CMS
- Introducing more than one CTA per notification
