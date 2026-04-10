# Dashboard Deferred Notebook Data Design

## Goal

Reduce real dashboard first-render latency by moving notebook and weekly recap data off the initial server page render and into a lightweight authenticated follow-up request.

## Problem

`/dashboard` currently blocks on:

- profile lookup
- latest brief lookup
- notebook entry history
- weekly recap history
- notebook suggestion packet generation

That means the page the user reaches right after login still waits for the heaviest data slice before anything can render.

## Recommended approach

Keep the dashboard shell server-rendered, but defer notebook and weekly recap data to a dedicated authenticated API route.

### Scope

- `dashboard/page.tsx` should only load:
  - session
  - profile
  - notion configured flag
- a new `/api/dashboard/notebook` route should return:
  - notebook entries
  - weekly recap record/history
  - latest notebook suggestion
- `DashboardForm` should render a lightweight loading state for notebook/recap areas until that API resolves

## Why this is the best fit

- It directly lowers real dashboard first-render cost.
- It keeps the login handoff improvement effective instead of simply moving the wait one screen later.
- It avoids a larger React streaming rewrite.

## UX

Parents should see the dashboard shell quickly:

- account header
- delivery channels
- weekly reading plan
- profile controls

Then notebook and recap sections should fill in shortly after with:

- latest brief notebook suggestion
- weekly recap block
- saved notebook workspace

If the deferred load fails, the notebook area should explain the problem and offer a retry.

## Validation

- Add a route test for `/api/dashboard/notebook`
- Update `dashboard/page.test.tsx` so the page no longer depends on notebook data loaders
- Add a dashboard form test for the deferred loading state
