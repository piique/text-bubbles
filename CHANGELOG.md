# Changelog

All notable changes to this project are documented here. This project follows
[Semantic Versioning](https://semver.org/).

## 1.0.0 (2026-10-15)

First release on npm as `text-bubbles` (previously an unpublished React-only package).

### Added

- Framework-agnostic core: `createTextBubbles(target, options)` returns an instance with
  `update()`, `pause()`, `resume()`, `refresh()`, `destroy()`, `ready`, `canvas` and `particleCount`.
- React adapter `text-bubbles/react`: `<TextBubbles>` (with `as`, `className`, `style` and an
  accessible fallback via `children`) and `useTextBubbles(ref, options)`. Marked `"use client"`.
- Custom element `text-bubbles/element`: `<text-bubbles>` with kebab-case attributes, light DOM
  fallback and `data-ready`; `defineTextBubbles(tagName?)`.
- Multi-line text (`\n`), `align` (`left` / `center` / `right`), `lineHeight`, `wrapBelow`
  (one word per line under a container width), `maxWidth`.
- Colors from any CSS color, `currentColor` or `var(--token)` (re-resolved when the theme changes),
  plus accent particles (`accentColor`, `accentRatio`).
- `density` (spacing derived from the fitted font size), particle cap (`maxParticles`).
- `intro` animation, `reducedMotion` (`respect` / `ignore` / `hide`), `maxDpr`, `pauseWhenHidden`,
  `onReady`, `onPointerEnter`, `onPointerLeave`.
- `data-ready="true|false"` on the container, to fade the fallback with CSS.

### Changed

- `spacing` is renamed `ease` (`spacing` still works and is deprecated).
- Default color is `currentColor`, so the particles follow the surrounding text color.
- Default spacing comes from `density` (2–6 px) instead of 1 px (every pixel).
- The canvas is created by the library inside the target; you no longer render it yourself.

### Fixed

- No re-initialization on every React render (options are compared by value).
- Crisp rendering on high-DPI screens (devicePixelRatio scaling, capped by `maxDpr`).
- Touch never blocks page scrolling (passive listeners, no `preventDefault`).
- Container size tracked with `ResizeObserver`; containers without a height get one from the font size.
- Loop pauses off-screen and in hidden tabs, and sleeps once every particle is at rest.
- Waits for web fonts before sampling (no fallback-font flash) and re-samples when they load late.
- `maxWidth` and the pointer enter callback now work.
- Packaging: real library build (ESM + CJS + types), correct `exports`, repository URL and LICENSE.
