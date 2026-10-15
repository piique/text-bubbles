import { isDynamicColor, resolveColor } from "./color";
import { autoHeight, dotRadius, fitFontSize, fontString, spacingFor, splitLines } from "./layout";
import { changeKind, normalizeOptions, REPAINT, RESAMPLE } from "./options";
import { assignAccents, type Particles, sampleParticles } from "./particles";
import type { ResolvedOptions, TextBubblesInstance, TextBubblesOptions } from "./types";

const TAU = Math.PI * 2;
/** Distance (CSS px) under which a returning particle snaps to its rest position. */
const REST = 0.05;
/** Max wait for web fonts before drawing with whatever is available. */
const FONT_TIMEOUT = 3000;
const FRAME_MS = 1000 / 60;

/**
 * Draws `options.text` as particles inside `target` (a canvas is appended to it).
 * Safe to import on the server; call it in the browser only.
 */
export function createTextBubbles(
  target: HTMLElement,
  options: TextBubblesOptions,
): TextBubblesInstance {
  const doc = target.ownerDocument;
  const win = doc.defaultView || window;
  const fonts = doc.fonts as FontFaceSet | undefined;
  const style = win.getComputedStyle(target);
  const canvas = doc.createElement("canvas");
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const motionQuery = win.matchMedia?.("(prefers-reduced-motion: reduce)");
  const schemeQuery = win.matchMedia?.("(prefers-color-scheme: dark)");

  let raw: Partial<TextBubblesOptions> = { ...options };
  let o: ResolvedOptions = normalizeOptions(raw);
  let particles: Particles | null = null;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let radius = 1;
  let fill = "";
  let accentFill = "";
  let frameId = 0;
  let lastTime = 0;
  let introT = 0;
  let introDuration = 0;
  let introSpread = 0;
  let pointerX = 0;
  let pointerY = 0;
  let pointer = false;
  let inView = true;
  let paused = false;
  let destroyed = false;
  let painted = false;
  let fontOk = true;
  let autoSized: boolean | undefined;
  let lastW = -1;
  let lastH = -1;
  let layoutToken = 0;
  let resizeFrame = 0;
  let themeTimer: ReturnType<typeof setTimeout> | undefined;
  let themeObserver: MutationObserver | undefined;
  let markReady!: () => void;
  const ready = new Promise<void>((resolve) => {
    markReady = resolve;
  });

  const restore = { position: target.style.position, minHeight: target.style.minHeight };
  if (style.position === "static") target.style.position = "relative";
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText =
    "position:absolute;left:0;top:0;display:block;pointer-events:none;touch-action:pan-y;opacity:0;transition:opacity .3s";
  target.appendChild(canvas);
  target.dataset.ready = "false";

  const reduced = () => o.reducedMotion !== "ignore" && !!motionQuery?.matches;
  /** The loop may run: animated mode, not paused, on screen and tab visible. */
  const canAnimate = () =>
    !destroyed &&
    !paused &&
    !reduced() &&
    !!particles &&
    (!o.pauseWhenHidden || (inView && doc.visibilityState !== "hidden"));

  // ---- painting -------------------------------------------------------------

  function pass(flag: number, color: string) {
    const p = particles as Particles;
    const { x, y, accent } = p;
    const r = radius;
    // Dots under ~2.5 device px look the same as squares, and rect() is much cheaper than arc().
    const square = r * dpr < 1.25;
    const side = r * 2;
    ctx.beginPath();
    for (let i = 0; i < p.count; i++) {
      if (accent[i] !== flag) continue;
      if (square) ctx.rect(x[i] - r, y[i] - r, side, side);
      else {
        ctx.moveTo(x[i] + r, y[i]);
        ctx.arc(x[i], y[i], r, 0, TAU);
      }
    }
    ctx.fillStyle = color;
    ctx.fill();
  }

  function paint() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (!particles) return;
    // One path per color: a single fill() per color per frame.
    if (particles.accents < particles.count) pass(0, fill);
    if (particles.accents) pass(1, accentFill);
  }

  function resolveColors() {
    fill = resolveColor(o.color, style);
    accentFill = resolveColor(o.accentColor, style);
  }

  // ---- animation loop -------------------------------------------------------

  function frame(now: number) {
    frameId = 0;
    const p = particles;
    if (!p || !canAnimate()) return;
    const k = lastTime ? Math.min(now - lastTime, 50) / FRAME_MS : 1;
    lastTime = now;
    const { x, y, tx, ty, rx, ry, count } = p;
    let moving = false;

    if (introDuration) {
      // Progress advances with (clamped) frame time, so pausing never skips the intro.
      introT = Math.min(1, introT + (k * FRAME_MS) / introDuration);
      const t = introT;
      const spread = introSpread * (1 - t) ** 3;
      for (let i = 0; i < count; i++) {
        x[i] = tx[i] + rx[i] * spread;
        y[i] = ty[i] + ry[i] * spread;
      }
      if (t < 1) moving = true;
      else introDuration = 0;
    } else {
      const r2 = o.radius * o.radius;
      const step = o.speed * k;
      const ease = 1 - (1 - o.ease) ** k;
      for (let i = 0; i < count; i++) {
        if (pointer) {
          const dx = x[i] - pointerX;
          const dy = y[i] - pointerY;
          if (dx * dx + dy * dy < r2) {
            x[i] += rx[i] * step;
            y[i] += ry[i] * step;
            moving = true;
            continue;
          }
        }
        const ex = tx[i] - x[i];
        const ey = ty[i] - y[i];
        if (ex > REST || ex < -REST || ey > REST || ey < -REST) {
          x[i] += ex * ease;
          y[i] += ey * ease;
          moving = true;
        } else {
          x[i] = tx[i];
          y[i] = ty[i];
        }
      }
    }

    paint();
    // Sleep once everything is at rest; pointer moves wake the loop again.
    if (moving) frameId = win.requestAnimationFrame(frame);
    else lastTime = 0;
  }

  function sync() {
    if (canAnimate()) {
      if (!frameId) frameId = win.requestAnimationFrame(frame);
    } else if (frameId) {
      win.cancelAnimationFrame(frameId);
      frameId = 0;
      lastTime = 0;
    }
  }

  // ---- layout and sampling --------------------------------------------------

  /** Measures the container and samples the text (sync; fonts must be settled). */
  function layout() {
    if (destroyed) return;
    if (o.reducedMotion === "hide" && reduced()) {
      particles = null;
      canvas.style.display = "none";
      target.dataset.ready = "false";
      sync();
      markReady();
      return;
    }
    canvas.style.display = "block";
    const w = target.clientWidth;
    let h = target.clientHeight;
    if (autoSized === undefined && w) autoSized = h === 0;
    lastW = w;
    lastH = h;
    if (!w || !o.text.trim()) {
      particles = null;
      width = height = 0;
      canvas.width = canvas.height = 0;
      return;
    }

    const scratch = doc.createElement("canvas");
    const sctx = scratch.getContext("2d", { willReadFrequently: true });
    if (!sctx) return;
    const lines = splitLines(o.text, w, o.wrapBelow);
    const measure = (line: string, size: number) => {
      sctx.font = fontString(o, size);
      return sctx.measureText(line).width;
    };
    const size = fitFontSize(measure, lines, o, w, autoSized ? Number.POSITIVE_INFINITY : h);
    if (autoSized) {
      h = autoHeight(lines.length, size, o.lineHeight);
      target.style.minHeight = `${h}px`;
      lastH = h;
    }
    width = w;
    height = h;
    dpr = Math.min(win.devicePixelRatio || 1, o.maxDpr);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    // Draw the text once at 1x on a scratch canvas and sample its opaque pixels.
    scratch.width = w;
    scratch.height = h;
    const font = fontString(o, size);
    fontOk = !fonts || fonts.check(font, o.text);
    sctx.font = font;
    sctx.textAlign = o.align;
    sctx.textBaseline = "middle";
    const inset = Math.ceil(size * 0.02);
    const x = o.align === "left" ? inset : o.align === "right" ? w - inset : w / 2;
    const lineStep = size * o.lineHeight;
    const top = h / 2 - ((lines.length - 1) * lineStep) / 2;
    lines.forEach((line, i) => {
      sctx.fillText(line, x, top + i * lineStep);
    });
    const { data } = sctx.getImageData(0, 0, w, h);
    scratch.width = scratch.height = 0;

    const p = sampleParticles(data, w, h, spacingFor(o, size), o.maxParticles);
    assignAccents(p, o.accentRatio);
    particles = p;
    radius = dotRadius(o, p.step);
    resolveColors();

    // The intro plays once, on the first paint.
    introDuration = !painted && o.intro && !reduced() ? o.intro : 0;
    introT = 0;
    if (introDuration) {
      introSpread = Math.max(80, size * 0.8);
      for (let i = 0; i < p.count; i++) {
        p.x[i] = p.tx[i] + p.rx[i] * introSpread;
        p.y[i] = p.ty[i] + p.ry[i] * introSpread;
      }
    }
    paint();
    canvas.style.opacity = "1";
    target.dataset.ready = "true";
    if (!painted) {
      painted = true;
      markReady();
      raw.onReady?.();
    }
    sync();
  }

  /** Waits for the font (bounded), then lays out. Stale calls are dropped. */
  function start() {
    const token = ++layoutToken;
    const run = () => {
      if (token === layoutToken) layout();
    };
    if (!fonts) return run();
    let timer: ReturnType<typeof setTimeout> | undefined;
    Promise.race([
      fonts.load(fontString(o, o.fontSize), o.text),
      new Promise((resolve) => {
        timer = setTimeout(resolve, FONT_TIMEOUT);
      }),
    ])
      .catch(() => {})
      .then(() => {
        clearTimeout(timer);
        run();
      });
  }

  // ---- events and observers -------------------------------------------------

  function setPointer(event: PointerEvent | TouchEvent) {
    const point = "touches" in event ? event.touches[0] : event;
    if (!point) return;
    const rect = target.getBoundingClientRect();
    pointerX = point.clientX - rect.left - target.clientLeft;
    pointerY = point.clientY - rect.top - target.clientTop;
    pointer = true;
    if (!introDuration) sync();
  }
  function onEnter(event: PointerEvent) {
    setPointer(event);
    raw.onPointerEnter?.();
  }
  function onEnd() {
    if (!pointer) return;
    pointer = false;
    sync();
    raw.onPointerLeave?.();
  }
  function onLeave(event: PointerEvent) {
    // Touch pointers "leave" as soon as the page scrolls; touchend handles them.
    if (event.pointerType !== "touch") onEnd();
  }

  // All listeners are passive: they never call preventDefault, so scrolling is never blocked.
  const listeners: [string, EventListener][] = [
    ["pointerenter", onEnter as EventListener],
    ["pointermove", setPointer as EventListener],
    ["pointerdown", setPointer as EventListener],
    ["pointerleave", onLeave as EventListener],
    ["touchmove", setPointer as EventListener],
    ["touchend", onEnd],
    ["touchcancel", onEnd],
  ];
  const passive = { passive: true };
  for (const [type, fn] of listeners) target.addEventListener(type, fn, passive);

  const resizeObserver = new ResizeObserver(() => {
    if (resizeFrame) return;
    resizeFrame = win.requestAnimationFrame(() => {
      resizeFrame = 0;
      if (lastW < 0) return; // first layout still pending (it measures by itself)
      const w = target.clientWidth;
      // Auto-sized targets get their height from us: only their width matters.
      if (w !== lastW || (!autoSized && target.clientHeight !== lastH)) start();
    });
  });
  resizeObserver.observe(target);

  const intersectionObserver = new IntersectionObserver((entries) => {
    inView = entries[entries.length - 1].isIntersecting;
    sync();
  });
  intersectionObserver.observe(target);

  const recolor = () => {
    if (destroyed || !particles) return;
    resolveColors();
    paint();
  };
  const onTheme = () => {
    clearTimeout(themeTimer);
    themeTimer = setTimeout(recolor, 30);
  };
  function watchTheme() {
    if (themeObserver || !(isDynamicColor(o.color) || isDynamicColor(o.accentColor))) return;
    themeObserver = new MutationObserver(onTheme);
    themeObserver.observe(doc.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    });
    schemeQuery?.addEventListener("change", onTheme);
  }
  watchTheme();

  const onVisibility = () => sync();
  const onMotion = () => start();
  const onFonts = () => {
    if (!fontOk && fonts?.check(fontString(o, o.fontSize), o.text)) start();
  };
  doc.addEventListener("visibilitychange", onVisibility);
  motionQuery?.addEventListener("change", onMotion);
  fonts?.addEventListener("loadingdone", onFonts);

  start();

  return {
    ready,
    canvas,
    get particleCount() {
      return particles ? particles.count : 0;
    },
    update(next) {
      if (destroyed) return;
      raw = { ...raw, ...next };
      const prev = o;
      o = normalizeOptions(raw);
      watchTheme();
      const kind = changeKind(prev, o);
      if (kind === RESAMPLE) start();
      else if (kind === REPAINT && particles) {
        if (prev.accentRatio !== o.accentRatio) assignAccents(particles, o.accentRatio);
        radius = dotRadius(o, particles.step);
        recolor();
      }
      sync();
    },
    pause() {
      paused = true;
      sync();
    },
    resume() {
      paused = false;
      sync();
    },
    refresh() {
      if (!destroyed) start();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      layoutToken++;
      sync();
      if (resizeFrame) win.cancelAnimationFrame(resizeFrame);
      clearTimeout(themeTimer);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      themeObserver?.disconnect();
      schemeQuery?.removeEventListener("change", onTheme);
      motionQuery?.removeEventListener("change", onMotion);
      fonts?.removeEventListener("loadingdone", onFonts);
      doc.removeEventListener("visibilitychange", onVisibility);
      for (const [type, fn] of listeners) target.removeEventListener(type, fn);
      canvas.remove();
      target.style.position = restore.position;
      target.style.minHeight = restore.minHeight;
      target.dataset.ready = "false";
      particles = null;
      markReady();
    },
  };
}
