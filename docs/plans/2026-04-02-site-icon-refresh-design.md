# Site Icon Refresh Design

## Goal

Replace the current Daily Sparks favicon-only setup with a unified site icon set derived from the approved `android-chrome-512x512.png` brand mark.

## Scope

- Replace the existing browser favicon with the new brand mark.
- Add a complete site icon set for browser tabs, Apple touch icons, and Android/PWA install surfaces.
- Add an explicit web manifest so icon metadata is deterministic across platforms.
- Keep the rest of the product branding unchanged.

## Approach

Use the provided 512x512 PNG as the single source image. Generate the platform icon variants inside `src/app` so Next.js App Router can serve them via the built-in metadata pipeline. Add a `site.webmanifest` route under `src/app` and declare the icon and manifest metadata in `src/app/layout.tsx`.

## Validation

- Add a metadata test that asserts the exported layout metadata references the new icon set.
- Run a targeted test for the layout metadata.
- Run a production build to ensure the generated icons and manifest are wired correctly.
