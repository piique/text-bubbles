import { describe, expect, it } from "vitest";
import { assignAccents, capStep, prng, sampleParticles } from "../src/core/particles";

/** RGBA buffer with an opaque w×h rectangle at (x0, y0). */
function rect(width: number, height: number, x0: number, y0: number, w: number, h: number) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) data[(x + y * width) * 4 + 3] = 255;
  return data;
}

describe("prng", () => {
  it("is deterministic and in [0, 1)", () => {
    const a = prng(7);
    const b = prng(7);
    for (let i = 0; i < 1000; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    expect(prng(1)()).not.toBe(prng(2)());
  });
});

describe("sampleParticles", () => {
  it("samples opaque pixels on the step grid", () => {
    const data = rect(100, 50, 10, 10, 20, 20);
    const p = sampleParticles(data, 100, 50, 4, 10_000);
    expect(p.step).toBe(4);
    expect(p.count).toBe(25); // 5 × 5 grid points inside a 20 px square
    for (let i = 0; i < p.count; i++) {
      expect(p.x[i]).toBe(p.tx[i]);
      expect(p.tx[i]).toBeGreaterThanOrEqual(10);
      expect(p.tx[i]).toBeLessThan(30);
      expect(Math.abs(p.rx[i])).toBeLessThanOrEqual(0.5);
    }
  });

  it("is deterministic for the same input", () => {
    const data = rect(64, 64, 0, 0, 64, 64);
    const a = sampleParticles(data, 64, 64, 2, 10_000);
    const b = sampleParticles(data, 64, 64, 2, 10_000);
    expect(Array.from(a.rx)).toEqual(Array.from(b.rx));
  });

  it("ignores pixels with alpha ≤ 128", () => {
    const data = new Uint8ClampedArray(10 * 10 * 4).fill(128);
    expect(sampleParticles(data, 10, 10, 1, 1000).count).toBe(0);
  });
});

describe("particle cap", () => {
  it("raises the step until the count fits", () => {
    const data = rect(1000, 400, 0, 0, 1000, 400); // 400k opaque pixels
    const step = capStep(data, 1000, 400, 1, 12_000);
    expect(step).toBeGreaterThan(1);
    const p = sampleParticles(data, 1000, 400, 1, 12_000);
    expect(p.count).toBeLessThanOrEqual(12_000);
    expect(p.count).toBeGreaterThan(5_000);
    expect(p.step).toBe(step);
  });

  it("keeps the step when under the cap", () => {
    const data = rect(100, 100, 0, 0, 100, 100);
    expect(capStep(data, 100, 100, 5, 12_000)).toBe(5);
  });
});

describe("assignAccents", () => {
  it("marks about `ratio` of particles, deterministically", () => {
    const data = rect(400, 100, 0, 0, 400, 100);
    const p = sampleParticles(data, 400, 100, 2, 100_000);
    assignAccents(p, 0.07);
    expect(p.accents / p.count).toBeGreaterThan(0.05);
    expect(p.accents / p.count).toBeLessThan(0.09);
    const first = Array.from(p.accent);
    assignAccents(p, 0.07);
    expect(Array.from(p.accent)).toEqual(first);
    assignAccents(p, 0);
    expect(p.accents).toBe(0);
    assignAccents(p, 1);
    expect(p.accents).toBe(p.count);
  });
});
