export type TextAlign = "left" | "center" | "right";

/**
 * What to do when the user asks for reduced motion (`prefers-reduced-motion: reduce`):
 * - `"respect"`: draw the particles once, statically (no animation loop, no intro, no pointer effect).
 * - `"ignore"`: animate anyway.
 * - `"hide"`: draw nothing and leave the fallback content visible.
 */
export type ReducedMotion = "respect" | "ignore" | "hide";

export interface TextBubblesOptions {
  /** Text to draw. Use `\n` for explicit line breaks. */
  text: string;
  /** CSS font-family. Default `"sans-serif"`. Use the real loaded family for web fonts. */
  font?: string;
  /** CSS font-weight. Default `400`. */
  fontWeight?: string | number;
  /** CSS font-style. Default `"normal"`. */
  fontStyle?: string;
  /** Maximum font size in CSS px; the text is shrunk to fit the container. Default `160`. */
  fontSize?: number;
  /** Maximum text width in CSS px. Default: no limit besides the container. */
  maxWidth?: number;
  /** Horizontal alignment. Default `"center"`. */
  align?: TextAlign;
  /** Line height as a multiple of the font size. Default `1`. */
  lineHeight?: number;
  /** Below this container width (CSS px) every word goes on its own line. `0` disables it. Default `0`. */
  wrapBelow?: number;
  /** Particle color: any CSS color, `currentColor`, `var(--token)` or `--token`. Default `"currentColor"`. */
  color?: string;
  /** Accent particle color (same syntax as `color`). Default `"currentColor"`. */
  accentColor?: string;
  /** Share of particles drawn with `accentColor` (0–1). Default `0`. */
  accentRatio?: number;
  /**
   * Particles per font size: the spacing becomes `fontSize / density`, clamped to 2–6 px,
   * so small text gets denser particles. Ignored when `bubbleSpacing` is set. Default `40`.
   */
  density?: number;
  /** Fixed distance between particles in CSS px (overrides `density`). */
  bubbleSpacing?: number;
  /** Particle radius in CSS px. Default: 42% of the spacing (min 0.8). */
  bubbleSize?: number;
  /** Interaction radius around the pointer in CSS px. Default `80`. */
  radius?: number;
  /** Scatter velocity of disturbed particles in CSS px per frame (60 fps). Default `6`. */
  speed?: number;
  /** Return easing per frame (0–1]. Higher returns faster. Default `0.08`. */
  ease?: number;
  /** @deprecated Use `ease`. */
  spacing?: number;
  /** Converge from a scattered state on first draw. Default `false`. */
  intro?: boolean | { duration?: number };
  /** Behavior under `prefers-reduced-motion: reduce`. Default `"respect"`. */
  reducedMotion?: ReducedMotion;
  /** Upper bound for devicePixelRatio scaling. Default `2`. */
  maxDpr?: number;
  /** Stop the loop when off-screen or when the tab is hidden. Default `true`. */
  pauseWhenHidden?: boolean;
  /** Spacing is raised automatically above this many particles. Default `12000`. */
  maxParticles?: number;
  /** Called once, when particles are first painted. */
  onReady?: () => void;
  /** Called when a pointer (mouse, pen or touch) enters the container. */
  onPointerEnter?: () => void;
  /** Called when the pointer leaves the container (or the touch ends). */
  onPointerLeave?: () => void;
}

export interface TextBubblesInstance {
  /** Resolves after the first paint (or immediately when nothing will be painted, e.g. `reducedMotion: "hide"`). */
  readonly ready: Promise<void>;
  /** The canvas owned by this instance. */
  readonly canvas: HTMLCanvasElement;
  /** Current number of particles. */
  readonly particleCount: number;
  /** Merge new options. Re-samples only when layout changes; colors are applied without re-sampling. */
  update(options: Partial<TextBubblesOptions>): void;
  /** Stop animating (the last frame stays on screen). */
  pause(): void;
  /** Resume after `pause()`. */
  resume(): void;
  /** Re-measure the container, re-resolve colors and re-sample. */
  refresh(): void;
  /** Remove the canvas, listeners and observers. */
  destroy(): void;
}

/** Options with defaults applied. */
export interface ResolvedOptions {
  text: string;
  font: string;
  fontWeight: string;
  fontStyle: string;
  fontSize: number;
  maxWidth: number;
  align: TextAlign;
  lineHeight: number;
  wrapBelow: number;
  color: string;
  accentColor: string;
  accentRatio: number;
  density: number;
  bubbleSpacing: number;
  bubbleSize: number;
  radius: number;
  speed: number;
  ease: number;
  /** Intro duration in ms (0 = off). */
  intro: number;
  reducedMotion: ReducedMotion;
  maxDpr: number;
  pauseWhenHidden: boolean;
  maxParticles: number;
}
