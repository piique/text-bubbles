import type { ResolvedOptions, TextBubblesOptions } from "./types";

export const DEFAULTS: ResolvedOptions = {
  text: "",
  font: "sans-serif",
  fontWeight: "400",
  fontStyle: "normal",
  fontSize: 160,
  maxWidth: Number.POSITIVE_INFINITY,
  align: "center",
  lineHeight: 1,
  wrapBelow: 0,
  color: "currentColor",
  accentColor: "currentColor",
  accentRatio: 0,
  density: 40,
  bubbleSpacing: 0,
  bubbleSize: 0,
  radius: 80,
  speed: 6,
  ease: 0.08,
  intro: 0,
  reducedMotion: "respect",
  maxDpr: 2,
  pauseWhenHidden: true,
  maxParticles: 12000,
};

const INTRO_MS = 1200;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Applies defaults and sanitizes user options (numbers may be numeric strings). Pure. */
export function normalizeOptions(options: Partial<TextBubblesOptions>): ResolvedOptions {
  const input = options as Record<string, unknown>;
  const o = { ...DEFAULTS } as Record<string, unknown> & ResolvedOptions;
  for (const key in DEFAULTS) {
    const value = input[key];
    const fallback = (DEFAULTS as unknown as Record<string, unknown>)[key];
    if (value == null || value === "") continue;
    if (typeof fallback === "number") {
      const n = +(value as number);
      // NaN and negative values keep the default.
      if (n >= 0) o[key] = n;
    } else if (typeof fallback === "boolean") o[key] = value !== false;
    else o[key] = String(value);
  }
  const d = DEFAULTS;
  // Zero is meaningless for these: fall back to the default.
  o.lineHeight ||= d.lineHeight;
  o.density ||= d.density;
  o.maxDpr ||= d.maxDpr;
  o.maxWidth ||= d.maxWidth;
  o.fontSize = Math.max(4, o.fontSize);
  o.maxParticles = Math.max(1, o.maxParticles);
  o.accentRatio = clamp(o.accentRatio, 0, 1);
  const ease = +(options.ease ?? options.spacing ?? d.ease);
  o.ease = ease > 0 ? clamp(ease, 0.001, 1) : d.ease;
  const intro = options.intro;
  const duration = intro && typeof intro === "object" ? +(intro.duration ?? INTRO_MS) : INTRO_MS;
  o.intro = intro ? (duration >= 0 ? duration : INTRO_MS) : 0;
  if (o.align !== "left" && o.align !== "right") o.align = "center";
  if (o.reducedMotion !== "ignore" && o.reducedMotion !== "hide") o.reducedMotion = "respect";
  return o;
}

/** Options that only change how existing particles are painted. */
const PAINT_KEYS = "color accentColor accentRatio bubbleSize".split(" ");
/** Options read live by the animation loop (or only used on the first paint). */
const LIVE_KEYS = "radius speed ease intro".split(" ");

export const NO_CHANGE = 0;
export const REPAINT = 1;
export const RESAMPLE = 2;

/**
 * What an `update()` has to do: `RESAMPLE` (layout changed: text, font, size, wrapping,
 * spacing…), `REPAINT` (colors/accents/dot size only) or `NO_CHANGE` (radius, speed, ease, intro).
 */
export function changeKind(prev: ResolvedOptions, next: ResolvedOptions): 0 | 1 | 2 {
  let kind: 0 | 1 | 2 = NO_CHANGE;
  for (const key in next) {
    if (prev[key as keyof ResolvedOptions] === next[key as keyof ResolvedOptions]) continue;
    if (PAINT_KEYS.includes(key)) kind = REPAINT;
    else if (!LIVE_KEYS.includes(key)) return RESAMPLE;
  }
  return kind;
}
