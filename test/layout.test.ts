import { describe, expect, it } from "vitest";
import {
  autoHeight,
  availableWidth,
  dotRadius,
  fitFontSize,
  fontString,
  spacingFor,
  splitLines,
} from "../src/core/layout";
import { normalizeOptions } from "../src/core/options";

/** Mocked measureText: every character is 0.5em wide. */
const measure = (line: string, size: number) => line.length * size * 0.5;

describe("splitLines", () => {
  it("keeps a single line and trims it", () => {
    expect(splitLines("  Pedro Vilaça ", 800, 0)).toEqual(["Pedro Vilaça"]);
  });

  it("splits on explicit newlines and drops empty lines", () => {
    expect(splitLines("Hello\nworld\r\n\n!", 800, 0)).toEqual(["Hello", "world", "!"]);
  });

  it("puts one word per line below wrapBelow", () => {
    expect(splitLines("Pedro Vilaça", 400, 608)).toEqual(["Pedro", "Vilaça"]);
    expect(splitLines("Pedro Vilaça", 608, 608)).toEqual(["Pedro Vilaça"]);
    expect(splitLines("a b\nc  d", 100, 608)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("fitFontSize", () => {
  it("uses the max font size when everything fits", () => {
    const o = normalizeOptions({ text: "Hi", fontSize: 100 });
    expect(fitFontSize(measure, ["Hi"], o, 1000, 1000)).toBe(100);
  });

  it("is limited by the container height (80% of it per line block)", () => {
    const o = normalizeOptions({ text: "Hi", fontSize: 500 });
    expect(fitFontSize(measure, ["Hi"], o, 10000, 100)).toBe(80);
    const two = normalizeOptions({ text: "a\nb", fontSize: 500, lineHeight: 1 });
    expect(fitFontSize(measure, ["a", "b"], two, 10000, 100)).toBe(40);
  });

  it("shrinks to fit the width (92% when centered, 98% otherwise)", () => {
    const o = normalizeOptions({ text: "x", fontSize: 200 });
    // 10 chars * 0.5em = 5em; 0.92 * 500 / 5 = 92
    expect(fitFontSize(measure, ["abcdefghij"], o, 500, Number.POSITIVE_INFINITY)).toBe(92);
    const left = normalizeOptions({ text: "x", fontSize: 200, align: "left" });
    expect(fitFontSize(measure, ["abcdefghij"], left, 500, Number.POSITIVE_INFINITY)).toBe(98);
  });

  it("fits the widest line", () => {
    const o = normalizeOptions({ text: "x", fontSize: 200 });
    expect(fitFontSize(measure, ["ab", "abcdefghij"], o, 500, Number.POSITIVE_INFINITY)).toBe(92);
  });

  it("honors maxWidth", () => {
    const o = normalizeOptions({ text: "x", fontSize: 200, maxWidth: 250 });
    expect(availableWidth(o, 1000)).toBe(250);
    expect(fitFontSize(measure, ["abcdefghij"], o, 1000, Number.POSITIVE_INFINITY)).toBe(50);
  });

  it("never goes below 4px", () => {
    const o = normalizeOptions({ text: "x", fontSize: 200 });
    expect(fitFontSize(measure, ["a".repeat(1000)], o, 10, 10)).toBe(4);
  });
});

describe("autoHeight", () => {
  it("inverts the height fit", () => {
    expect(autoHeight(1, 80, 1)).toBe(100);
    expect(autoHeight(2, 40, 1)).toBe(100);
    const o = normalizeOptions({ text: "a\nb", fontSize: 500, lineHeight: 0.95 });
    const h = autoHeight(2, 120, 0.95);
    expect(fitFontSize(measure, ["a", "b"], o, 10000, h)).toBe(120);
  });
});

describe("spacingFor (density → spacing)", () => {
  it("derives the spacing from the fitted font size, clamped to 2–6 px", () => {
    const o = normalizeOptions({ text: "x", density: 40 });
    expect(spacingFor(o, 160)).toBe(4);
    expect(spacingFor(o, 200)).toBe(5);
    expect(spacingFor(o, 30)).toBe(2);
    expect(spacingFor(o, 1000)).toBe(6);
  });

  it("prefers an explicit bubbleSpacing", () => {
    expect(spacingFor(normalizeOptions({ text: "x", bubbleSpacing: 3.4 }), 1000)).toBe(3);
    expect(spacingFor(normalizeOptions({ text: "x", bubbleSpacing: 0.4 }), 1000)).toBe(1);
  });
});

describe("dotRadius", () => {
  it("defaults to 42% of the spacing (min 0.8)", () => {
    const o = normalizeOptions({ text: "x" });
    expect(dotRadius(o, 5)).toBeCloseTo(2.1);
    expect(dotRadius(o, 1)).toBe(0.8);
    expect(dotRadius(normalizeOptions({ text: "x", bubbleSize: 3 }), 5)).toBe(3);
  });
});

describe("fontString", () => {
  it("builds the canvas font shorthand", () => {
    const o = normalizeOptions({
      text: "x",
      font: "'Instrument Serif', serif",
      fontWeight: 600,
      fontStyle: "italic",
    });
    expect(fontString(o, 42)).toBe("italic 600 42px 'Instrument Serif', serif");
  });
});
