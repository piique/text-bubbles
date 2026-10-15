import type { ResolvedOptions } from "./types";

/** Share of the container height the text block may use. */
const HEIGHT_SHARE = 0.8;

/** Canvas font shorthand. */
export const fontString = (o: ResolvedOptions, size: number): string =>
  `${o.fontStyle} ${o.fontWeight} ${size}px ${o.font}`;

/** Splits on `\n`; below `wrapBelow` every word gets its own line. */
export function splitLines(text: string, width: number, wrapBelow: number): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return wrapBelow > 0 && width < wrapBelow ? lines.flatMap((line) => line.split(/\s+/)) : lines;
}

/** Height of a block of `count` lines, in multiples of the font size. */
const blockEm = (count: number, lineHeight: number) => 1 + (Math.max(1, count) - 1) * lineHeight;

/** Horizontal room for the text inside a container of `width`. */
export const availableWidth = (o: ResolvedOptions, width: number): number =>
  Math.min(o.maxWidth, width * (o.align === "center" ? 0.92 : 0.98));

/**
 * Largest font size (≤ `o.fontSize`) at which every line fits `width` × `height`.
 * `measure(line, size)` returns the rendered width; it is assumed to scale linearly with size.
 * Pass `height = Infinity` to fit the width only.
 */
export function fitFontSize(
  measure: (line: string, size: number) => number,
  lines: string[],
  o: ResolvedOptions,
  width: number,
  height: number,
): number {
  let size = Math.min(o.fontSize, (height * HEIGHT_SHARE) / blockEm(lines.length, o.lineHeight));
  const maxWidth = availableWidth(o, width);
  let widest = 0;
  for (const line of lines) widest = Math.max(widest, measure(line, size));
  if (widest > maxWidth) size = (size * maxWidth) / widest;
  return Math.max(4, Math.floor(size));
}

/** Container height to use when the target has none: fits the text block at `size`. */
export const autoHeight = (lineCount: number, size: number, lineHeight: number): number =>
  Math.ceil((blockEm(lineCount, lineHeight) * size) / HEIGHT_SHARE);

/** Sampling step in CSS px: explicit `bubbleSpacing`, else `size / density` clamped to 2–6. */
export function spacingFor(o: ResolvedOptions, size: number): number {
  if (o.bubbleSpacing > 0) return Math.max(1, Math.round(o.bubbleSpacing));
  return Math.min(6, Math.max(2, Math.round(size / o.density)));
}

/** Particle radius for a given step. */
export const dotRadius = (o: ResolvedOptions, step: number): number =>
  o.bubbleSize > 0 ? o.bubbleSize : Math.max(0.8, step * 0.42);
