/** Structure-of-arrays particle storage: no per-particle objects, no allocations per frame. */
export interface Particles {
  count: number;
  /** Sampling step actually used (may be raised by the particle cap). */
  step: number;
  x: Float32Array;
  y: Float32Array;
  /** Rest position. */
  tx: Float32Array;
  ty: Float32Array;
  /** Random unit vectors in [-0.5, 0.5]: scatter direction and intro offset. */
  rx: Float32Array;
  ry: Float32Array;
  accent: Uint8Array;
  accents: number;
}

/** Deterministic PRNG (Park–Miller), so a given layout always looks the same. */
export function prng(seed: number): () => number {
  let s = seed % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const OPAQUE = 128;

function countOpaque(data: ArrayLike<number>, width: number, height: number, step: number) {
  let count = 0;
  const offset = step >> 1;
  for (let y = offset; y < height; y += step)
    for (let x = offset; x < width; x += step) if (data[(x + y * width) * 4 + 3] > OPAQUE) count++;
  return count;
}

/**
 * Picks a step ≥ `step` that keeps the particle count ≤ `max`.
 * The count scales with 1/step², so the step is raised by √(count/max) and re-checked.
 */
export function capStep(
  data: ArrayLike<number>,
  width: number,
  height: number,
  step: number,
  max: number,
): number {
  let count = countOpaque(data, width, height, step);
  while (count > max) {
    step = Math.max(step + 1, Math.ceil(step * Math.sqrt(count / max)));
    count = countOpaque(data, width, height, step);
  }
  return step;
}

/** Samples opaque pixels of RGBA `data` on a `step` grid (raised to respect `max`). */
export function sampleParticles(
  data: ArrayLike<number>,
  width: number,
  height: number,
  step: number,
  max: number,
): Particles {
  step = capStep(data, width, height, step, max);
  const count = countOpaque(data, width, height, step);
  const make = () => new Float32Array(count);
  const p: Particles = {
    count,
    step,
    x: make(),
    y: make(),
    tx: make(),
    ty: make(),
    rx: make(),
    ry: make(),
    accent: new Uint8Array(count),
    accents: 0,
  };
  const random = prng(7);
  const offset = step >> 1;
  let i = 0;
  for (let y = offset; y < height; y += step) {
    for (let x = offset; x < width; x += step) {
      if (data[(x + y * width) * 4 + 3] > OPAQUE) {
        p.x[i] = p.tx[i] = x;
        p.y[i] = p.ty[i] = y;
        p.rx[i] = random() - 0.5;
        p.ry[i] = random() - 0.5;
        i++;
      }
    }
  }
  return p;
}

/** Marks a deterministic `ratio` share of particles as accents. Cheap: no re-sampling. */
export function assignAccents(p: Particles, ratio: number): void {
  const random = prng(13);
  let accents = 0;
  for (let i = 0; i < p.count; i++) accents += p.accent[i] = random() < ratio ? 1 : 0;
  p.accents = accents;
}
