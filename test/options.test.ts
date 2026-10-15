import { describe, expect, it } from "vitest";
import {
  changeKind,
  DEFAULTS,
  NO_CHANGE,
  normalizeOptions,
  REPAINT,
  RESAMPLE,
} from "../src/core/options";

describe("normalizeOptions", () => {
  it("applies defaults", () => {
    const o = normalizeOptions({ text: "Hi" });
    expect(o).toEqual({ ...DEFAULTS, text: "Hi" });
    expect(o.color).toBe("currentColor");
    expect(o.reducedMotion).toBe("respect");
    expect(o.maxDpr).toBe(2);
    expect(o.pauseWhenHidden).toBe(true);
  });

  it("ignores undefined, null, empty strings, NaN and negative numbers", () => {
    const o = normalizeOptions({
      text: "Hi",
      fontSize: undefined,
      radius: Number.NaN,
      speed: -3,
      color: "",
      density: null as unknown as number,
    });
    expect(o.fontSize).toBe(DEFAULTS.fontSize);
    expect(o.radius).toBe(DEFAULTS.radius);
    expect(o.speed).toBe(DEFAULTS.speed);
    expect(o.color).toBe(DEFAULTS.color);
    expect(o.density).toBe(DEFAULTS.density);
  });

  it("parses numeric strings (custom element attributes)", () => {
    const o = normalizeOptions({
      text: "Hi",
      fontSize: "120" as unknown as number,
      accentRatio: "0.07" as unknown as number,
      wrapBelow: "608" as unknown as number,
      fontWeight: 600,
    });
    expect(o.fontSize).toBe(120);
    expect(o.accentRatio).toBe(0.07);
    expect(o.wrapBelow).toBe(608);
    expect(o.fontWeight).toBe("600");
  });

  it("clamps ranges and falls back for meaningless zeros", () => {
    const o = normalizeOptions({
      text: "Hi",
      accentRatio: 4,
      ease: 3,
      lineHeight: 0,
      density: 0,
      maxDpr: 0,
      fontSize: 1,
    });
    expect(o.accentRatio).toBe(1);
    expect(o.ease).toBe(1);
    expect(o.lineHeight).toBe(DEFAULTS.lineHeight);
    expect(o.density).toBe(DEFAULTS.density);
    expect(o.maxDpr).toBe(DEFAULTS.maxDpr);
    expect(o.fontSize).toBe(4);
  });

  it("keeps the deprecated `spacing` as an alias of `ease`", () => {
    expect(normalizeOptions({ text: "a", spacing: 0.2 }).ease).toBe(0.2);
    expect(normalizeOptions({ text: "a", spacing: 0.2, ease: 0.3 }).ease).toBe(0.3);
    expect(normalizeOptions({ text: "a", ease: 0 }).ease).toBe(DEFAULTS.ease);
  });

  it("normalizes intro to a duration", () => {
    expect(normalizeOptions({ text: "a" }).intro).toBe(0);
    expect(normalizeOptions({ text: "a", intro: false }).intro).toBe(0);
    expect(normalizeOptions({ text: "a", intro: true }).intro).toBe(1200);
    expect(normalizeOptions({ text: "a", intro: {} }).intro).toBe(1200);
    expect(normalizeOptions({ text: "a", intro: { duration: 600 } }).intro).toBe(600);
  });

  it("validates enums", () => {
    const bad = normalizeOptions({
      text: "a",
      align: "justify" as "left",
      reducedMotion: "nope" as "hide",
    });
    expect(bad.align).toBe("center");
    expect(bad.reducedMotion).toBe("respect");
    const good = normalizeOptions({ text: "a", align: "right", reducedMotion: "hide" });
    expect(good.align).toBe("right");
    expect(good.reducedMotion).toBe("hide");
  });

  it("only turns pauseWhenHidden off with an explicit false", () => {
    expect(normalizeOptions({ text: "a", pauseWhenHidden: false }).pauseWhenHidden).toBe(false);
    expect(normalizeOptions({ text: "a", pauseWhenHidden: undefined }).pauseWhenHidden).toBe(true);
  });
});

describe("changeKind (what update() does)", () => {
  const base = normalizeOptions({ text: "Hello", color: "#fff" });
  const next = (partial: Parameters<typeof normalizeOptions>[0]) =>
    changeKind(base, normalizeOptions({ text: "Hello", color: "#fff", ...partial }));

  it("does nothing for identical options", () => {
    expect(next({})).toBe(NO_CHANGE);
  });

  it("re-samples when layout changes", () => {
    for (const partial of [
      { text: "Bye" },
      { font: "serif" },
      { fontWeight: 700 },
      { fontSize: 90 },
      { maxWidth: 300 },
      { align: "left" as const },
      { lineHeight: 1.2 },
      { wrapBelow: 500 },
      { density: 20 },
      { bubbleSpacing: 4 },
      { maxParticles: 100 },
      { reducedMotion: "ignore" as const },
      { maxDpr: 1 },
    ]) {
      expect(next(partial), JSON.stringify(partial)).toBe(RESAMPLE);
    }
  });

  it("only repaints for colors, accents and dot size", () => {
    expect(next({ color: "red" })).toBe(REPAINT);
    expect(next({ accentColor: "var(--signal)" })).toBe(REPAINT);
    expect(next({ accentRatio: 0.1 })).toBe(REPAINT);
    expect(next({ bubbleSize: 2 })).toBe(REPAINT);
  });

  it("needs nothing for live physics options", () => {
    expect(next({ radius: 10, speed: 2, ease: 0.2, intro: true })).toBe(NO_CHANGE);
  });

  it("re-samples when a layout change comes with a paint change", () => {
    expect(next({ color: "red", text: "Other" })).toBe(RESAMPLE);
  });
});
