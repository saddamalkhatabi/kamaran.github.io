# Original generated photographic scene atlases — Learn English

**Status:** Installed into the private application and public preview (2026-11-01).

These are **our own AI-generated realistic pictures**, not Pexels, stock photography or external hotlinked assets. The original images were created in three 4×3 storyboards: one for each English grammar-pattern lesson. They were cropped into 12 separate cells per lesson, removing the numbered circles, then optimized into **self-hosted WebP sprite sheets**.

## Files and layout

- `assets/real-scenes/this-scenes.webp`: first 12 sentences in This is / That is, dimensions 1392×1044 px, 4 columns × 3 rows, 348×348 per scene.
- `assets/real-scenes/have-scenes.webp`: 12 scenes for Have / Has.
- `assets/real-scenes/got-scenes.webp`: 12 scenes for Have got / Has got.
- `assets/real-scenes/manifest.json`: each scene linked to its exact English text, Arabic translation and situational explanation.

Each scene has an independent visual and the image for lesson `lessonId`, level `depthIndex`, scene `sceneIndex` is `depthIndex * 4 + sceneIndex` (all zero-based). The main viewer, lesson cards and story thumbnails use the corresponding locally hosted atlas. Story lines first match exact lesson phrases, then reuse the nearest applicable thematic scene; the 36 authored main lesson scenes have direct one-to-one matches.

## Web implementation

The three WebP files total approximately 576 KB, much smaller than the multi-megabyte source PNGs. CSS uses background-size 400% 300% and 4×3 positions, so each photo is displayed from the correct tile. The main viewer preserves a square aspect ratio to avoid distorting faces; the prior `assets/scenes.svg` is still used only if a WebP image cannot load.

No third-party photo host is necessary for this page. New lessons should have their own atlas or corresponding optimized scene images; do not bring back the old generic stock-photo URLs.

## Related audio

This visual update does not change the English voice recordings. Word highlighting uses the acoustic timing pipeline when validated cue files exist, rather than time-by-word-length estimation.
