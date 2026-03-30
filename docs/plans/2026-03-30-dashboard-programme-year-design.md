# Dashboard Programme and Year Design

## Goal

Replace the dashboard's subject-chip preference model with a structure that matches how IB families actually think: programme first, year second, then a system-generated weekly reading plan.

## Why This Change

The existing `Target IB subjects` block asks parents to do curriculum planning work themselves. That is more like a settings surface than a product experience.

For Daily Sparks, the stronger product behavior is:

- the parent selects the student's current IB stage
- the parent selects the year within that stage
- the system generates the weekly reading rhythm
- Sunday becomes a special, brandable reading moment

This makes the dashboard simpler, more opinionated, and closer to the user's real mental model.

## Product Model

The dashboard will move to four concepts:

- `Programme`: `PYP`, `MYP`, `DP`
- `Programme Year`: numeric year within that programme
- `Weekly Reading Plan`: generated from programme and year
- `Sunday Special`: generated from programme and year

The parent will no longer manually select IB subject chips.

## Data Model

The student profile will store:

- `programme`
- `programmeYear`
- `goodnotesEmail`
- existing identity fields such as `studentName`

Legacy `ibSubjects` data may still exist in older local JSON files, so the store should normalize older records on read and fill in defaults for the new fields.

## Defaults

For newly created student profiles:

- `programme`: `PYP`
- `programmeYear`: `5`

These defaults preserve the current target age range while still allowing the parent to switch to `MYP` or `DP`.

## Weekly Plan Rules

### PYP

Use the six transdisciplinary themes across Monday to Saturday:

- Monday: Who we are
- Tuesday: Where we are in place and time
- Wednesday: How we express ourselves
- Thursday: How the world works
- Friday: How we organize ourselves
- Saturday: Sharing the planet
- Sunday: Special family or reflection reading

### MYP

Show a system-generated weekly rhythm oriented around secondary-school learning habits:

- Monday: Language and literature
- Tuesday: Sciences
- Wednesday: Mathematics
- Thursday: Individuals and societies
- Friday: Design and creative inquiry
- Saturday: Wellness and interdisciplinary extension
- Sunday: Special deep-dive reading

This is intentionally productized rather than a strict UI surface for all eight subject groups.

### DP

Show a university-prep reading rhythm:

- Monday: Studies in language and literature
- Tuesday: Language acquisition
- Wednesday: Individuals and societies
- Thursday: Sciences
- Friday: Mathematics
- Saturday: Arts or elective exploration
- Sunday: TOK / extended reading special

## Dashboard Layout

The dashboard will shift from:

- Current Plan
- Target IB subjects
- Delivery channels

to:

- Current Plan
- Learning Stage
- Weekly Reading Plan
- Delivery channels

### Learning Stage Card

This card will include:

- programme selector buttons
- year selector buttons that update based on the programme
- short helper text that explains the system will generate the weekly reading schedule

### Weekly Reading Plan Card

This card will show:

- a short explanation of the generated rhythm
- Monday to Saturday rows
- a visually highlighted `Sunday Special`

## Validation Rules

Profile updates must validate:

- programme is one of `PYP`, `MYP`, `DP`
- year is valid for the selected programme
- GoodNotes email remains optional but must be valid when provided

## Migration Strategy

When reading the local JSON store:

- if a student record is missing `programme`, default to `PYP`
- if a student record is missing `programmeYear`, default to `5`
- older `ibSubjects` values are ignored by the dashboard

This keeps the MVP usable without forcing the user to delete existing local data.

## Testing Strategy

Automated coverage should verify:

- new student profiles receive default programme and year values
- legacy records are normalized
- profile updates validate programme and year combinations
- route responses return the new shape

UI structure will be validated with lint and build in this round.
