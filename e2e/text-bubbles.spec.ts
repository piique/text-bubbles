import { expect, type Page, test } from "@playwright/test";

declare global {
  interface Window {
    __t: {
      raf: number;
      imageReads: number;
      preventDefault: number;
      listeners: Map<EventTarget, number>;
      touchOptions: unknown[];
      observers: Set<unknown>;
    };
  }
}

/** Instruments rAF, listeners, observers and pixel reads before any page script runs. */
const instrument = () => {
  const t = {
    raf: 0,
    imageReads: 0,
    preventDefault: 0,
    listeners: new Map<EventTarget, number>(),
    touchOptions: [] as unknown[],
    observers: new Set<unknown>(),
  };
  window.__t = t;
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => {
    t.raf++;
    return raf(cb);
  };
  const read = CanvasRenderingContext2D.prototype.getImageData;
  CanvasRenderingContext2D.prototype.getImageData = function (...args) {
    t.imageReads++;
    return read.apply(this, args as Parameters<typeof read>);
  };
  const prevent = Event.prototype.preventDefault;
  Event.prototype.preventDefault = function () {
    t.preventDefault++;
    return prevent.call(this);
  };
  const add = EventTarget.prototype.addEventListener;
  const remove = EventTarget.prototype.removeEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, options) {
    t.listeners.set(this, (t.listeners.get(this) ?? 0) + 1);
    if (type.startsWith("touch") && (this as HTMLElement).id === "core")
      t.touchOptions.push(options);
    return add.call(this, type, fn, options);
  };
  EventTarget.prototype.removeEventListener = function (type, fn, options) {
    t.listeners.set(this, (t.listeners.get(this) ?? 0) - 1);
    return remove.call(this, type, fn, options);
  };
  for (const name of ["ResizeObserver", "IntersectionObserver", "MutationObserver"] as const) {
    const Original = window[name] as unknown as {
      new (...args: unknown[]): { observe(...a: unknown[]): void; disconnect(): void };
    };
    const Patched = class extends Original {
      observe(...args: unknown[]) {
        t.observers.add(this);
        return super.observe(...args);
      }
      disconnect() {
        t.observers.delete(this);
        return super.disconnect();
      }
    };
    Object.defineProperty(window, name, { value: Patched, configurable: true, writable: true });
  }
};

/** Number of non-transparent pixels on the canvas inside `selector`. */
const paintedPixels = (page: Page, selector: string) =>
  page.evaluate((sel) => {
    const canvas = document.querySelector(`${sel} > canvas`) as HTMLCanvasElement | null;
    if (!canvas?.width) return 0;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let count = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) count++;
    return count;
  }, selector);

/** Creates a core instance on #core and waits for its first paint. */
const createCore = (page: Page, options: Record<string, unknown> = {}) =>
  page.evaluate(async (opts) => {
    const target = document.getElementById("core") as HTMLElement;
    const instance = window.createTextBubbles(target, { text: "Core", color: "#000", ...opts });
    (window as unknown as { core: typeof instance }).core = instance;
    await instance.ready;
    return instance.particleCount;
  }, options);

const rafDelta = async (page: Page, ms: number, during?: () => Promise<void>) => {
  const before = await page.evaluate(() => window.__t.raf);
  if (during) await during();
  await page.waitForTimeout(ms);
  return (await page.evaluate(() => window.__t.raf)) - before;
};

const errors: string[] = [];

test.beforeEach(async ({ page }) => {
  errors.length = 0;
  page.on("console", (message) => {
    // The readback warning comes from this suite reading the visible canvas, not from the library.
    if (/willReadFrequently/.test(message.text())) return;
    if (message.type() === "error" || message.type() === "warning") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(instrument);
});

test.afterEach(() => {
  expect(errors, "console errors/warnings").toEqual([]);
});

test("core: draws particles on an aria-hidden canvas and flags data-ready", async ({ page }) => {
  await page.goto("/e2e.html");
  const count = await createCore(page);
  expect(count).toBeGreaterThan(100);
  expect(await paintedPixels(page, "#core")).toBeGreaterThan(500);
  const canvas = page.locator("#core > canvas");
  await expect(canvas).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("#core")).toHaveAttribute("data-ready", "true");
  expect(await canvas.evaluate((c) => getComputedStyle(c).pointerEvents)).toBe("none");
  expect(await canvas.evaluate((c) => getComputedStyle(c).touchAction)).toBe("pan-y");
});

test("core: sleeps when settled and wakes on pointer moves", async ({ page }) => {
  await page.goto("/e2e.html");
  await createCore(page);
  await page.waitForTimeout(300);
  expect(await rafDelta(page, 400)).toBe(0);
  const box = await page.locator("#core").boundingBox();
  if (!box) throw new Error("no box");
  const moved = await rafDelta(page, 200, async () => {
    await page.mouse.move(box.x + 50, box.y + 100);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 5 });
  });
  expect(moved).toBeGreaterThan(3);
  await page.mouse.move(box.x + box.width + 300, box.y + 600);
  await page.waitForTimeout(2500);
  expect(await rafDelta(page, 400)).toBe(0);
});

for (const [dsf, maxDpr, expected] of [
  [1, undefined, 1],
  [2, undefined, 2],
  [3, undefined, 2],
  [3, 3, 3],
  [2, 1, 1],
] as const) {
  test(`DPR: deviceScaleFactor ${dsf}, maxDpr ${maxDpr ?? "default"} → ${expected}x`, async ({
    browser,
  }) => {
    const context = await browser.newContext({ deviceScaleFactor: dsf });
    const page = await context.newPage();
    await page.addInitScript(instrument);
    await page.goto("/e2e.html");
    await createCore(page, maxDpr ? { maxDpr } : {});
    const size = await page.locator("#core > canvas").evaluate((c: HTMLCanvasElement) => ({
      width: c.width,
      height: c.height,
      cssWidth: c.clientWidth,
      cssHeight: c.clientHeight,
    }));
    expect(size.cssWidth).toBe(600);
    expect(size.width).toBe(size.cssWidth * expected);
    expect(size.height).toBe(size.cssHeight * expected);
    await context.close();
  });
}

test("update(): recolors without re-sampling, re-samples on layout changes", async ({ page }) => {
  await page.goto("/e2e.html");
  const initial = await createCore(page);
  const reads = () => page.evaluate(() => window.__t.imageReads);
  const before = await reads();
  await page.evaluate(() => {
    const core = (window as unknown as { core: { update(o: object): void } }).core;
    core.update({ color: "#f00", accentColor: "#00f", accentRatio: 0.5, radius: 10, speed: 2 });
  });
  await page.waitForTimeout(100);
  expect(await reads()).toBe(before);
  await page.evaluate(() => {
    const core = (window as unknown as { core: { update(o: object): void } }).core;
    core.update({ text: "Core text that is longer" });
  });
  await expect.poll(reads).toBe(before + 1);
  const after = await page.evaluate(
    () => (window as unknown as { core: { particleCount: number } }).core.particleCount,
  );
  expect(after).not.toBe(initial);
});

test("destroy(): removes canvas, listeners, observers and stops the loop", async ({ page }) => {
  await page.goto("/e2e.html");
  const baseline = await page.evaluate(() => ({
    listeners: window.__t.listeners.get(document.getElementById("core") as HTMLElement) ?? 0,
    docListeners: window.__t.listeners.get(document) ?? 0,
    observers: window.__t.observers.size,
  }));
  await createCore(page, { intro: true, color: "var(--brand)" });
  const during = await page.evaluate(() => window.__t.observers.size);
  expect(during).toBeGreaterThan(baseline.observers);
  await page.evaluate(() => {
    (window as unknown as { core: { destroy(): void } }).core.destroy();
  });
  const after = await page.evaluate(() => {
    const target = document.getElementById("core") as HTMLElement;
    return {
      canvas: target.querySelector("canvas") !== null,
      listeners: window.__t.listeners.get(target) ?? 0,
      docListeners: window.__t.listeners.get(document) ?? 0,
      observers: window.__t.observers.size,
      position: target.style.position,
      ready: target.dataset.ready,
    };
  });
  expect(after).toEqual({
    canvas: false,
    listeners: baseline.listeners,
    docListeners: baseline.docListeners,
    observers: baseline.observers,
    position: "",
    ready: "false",
  });
  // Let the other fixtures (React intro, element) settle: the rAF counter is page-wide.
  await page.waitForTimeout(600);
  const box = await page.locator("#core").boundingBox();
  if (!box) throw new Error("no box");
  const delta = await rafDelta(page, 300, () =>
    page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 5 }),
  );
  expect(delta).toBe(0);
});

test("pauses off-screen: an instance below the fold does not animate", async ({ page }) => {
  await page.goto("/e2e.html");
  await page.evaluate(async () => {
    const target = document.getElementById("below") as HTMLElement;
    const instance = window.createTextBubbles(target, { text: "Below", intro: { duration: 3000 } });
    await instance.ready;
  });
  await page.waitForTimeout(200);
  expect(await rafDelta(page, 400)).toBe(0);
  await page.locator("#below").scrollIntoViewIfNeeded();
  expect(await rafDelta(page, 400)).toBeGreaterThan(5);
});

test("auto height: a container without height gets one from the font size", async ({ page }) => {
  await page.goto("/e2e.html");
  const result = await page.evaluate(async () => {
    const target = document.getElementById("auto") as HTMLElement;
    const before = target.clientHeight;
    const instance = window.createTextBubbles(target, { text: "Auto", fontSize: 80 });
    await instance.ready;
    return { before, after: target.clientHeight, canvas: instance.canvas.clientHeight };
  });
  expect(result.before).toBe(0);
  expect(result.after).toBe(100); // 80 / 0.8
  expect(result.canvas).toBe(result.after);
});

test("custom element: renders, resolves var() colors, keeps the fallback, reacts to attributes", async ({
  page,
}) => {
  await page.goto("/e2e.html");
  const element = page.locator("#el");
  await expect(element).toHaveAttribute("data-ready", "true");
  await expect(element.locator("h2")).toHaveText("Element");
  expect(await paintedPixels(page, "#el")).toBeGreaterThan(300);
  // var(--brand) is pure red.
  const color = await page.evaluate(() => {
    const canvas = document.querySelector("#el > canvas") as HTMLCanvasElement;
    const { data } = (canvas.getContext("2d") as CanvasRenderingContext2D).getImageData(
      0,
      0,
      canvas.width,
      canvas.height,
    );
    let best = -1;
    for (let i = 0; i < data.length; i += 4) if (best < 0 || data[i + 3] > data[best + 3]) best = i;
    return [data[best], data[best + 1], data[best + 2]];
  });
  expect(color).toEqual([255, 0, 0]);
  const count = () =>
    page.evaluate(
      () =>
        (document.getElementById("el") as { instance?: { particleCount: number } } | null)?.instance
          ?.particleCount,
    );
  const before = await count();
  await element.evaluate((el) => el.setAttribute("text", "A much longer text"));
  await expect.poll(count).not.toBe(before);
  // Theme change: the token is re-resolved (debounced) without re-sampling.
  const reads = await page.evaluate(() => window.__t.imageReads);
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--brand", "rgb(0, 0, 255)");
  });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const canvas = document.querySelector("#el > canvas") as HTMLCanvasElement;
        const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let best = -1;
        for (let i = 0; i < data.length; i += 4)
          if (best < 0 || data[i + 3] > data[best + 3]) best = i;
        return data[best + 2];
      }),
    )
    .toBe(255);
  // Only the reads made by this test's polling, no re-sampling by the element.
  const sampled = await page.evaluate(() => window.__t.imageReads);
  expect(sampled).toBeGreaterThan(reads);
  expect(await count()).toBeGreaterThan(0);
});

test("React: re-rendering the parent never re-initializes the instance", async ({ page }) => {
  await page.goto("/e2e.html");
  await page.waitForFunction(() => window.reactReady === true);
  const react = page.locator("#react > div");
  await expect(react).toHaveAttribute("data-ready", "true");
  await page.evaluate(() => {
    const host = document.querySelector("#react > div") as HTMLElement;
    (window as unknown as { first: Element | null }).first = host.querySelector("canvas");
    (window as unknown as { inserted: number }).inserted = 0;
    new MutationObserver((records) => {
      for (const record of records)
        for (const node of record.addedNodes)
          if (node.nodeName === "CANVAS") (window as unknown as { inserted: number }).inserted++;
    }).observe(host, { childList: true });
  });
  const reads = await page.evaluate(() => window.__t.imageReads);
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.rerender());
    await page.waitForTimeout(30);
  }
  await expect(react.locator("h2")).toHaveText("React 5");
  const result = await page.evaluate(() => {
    const w = window as unknown as { first: Element | null; inserted: number };
    return {
      renders: window.renders,
      same: document.querySelector("#react > div > canvas") === w.first,
      canvases: document.querySelectorAll("#react canvas").length,
      inserted: w.inserted,
      reads: window.__t.imageReads,
    };
  });
  expect(result).toEqual({ renders: 6, same: true, canvases: 1, inserted: 0, reads });
  expect(await paintedPixels(page, "#react > div")).toBeGreaterThan(300);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("respect (default): static particles, no animation loop", async ({ page }) => {
    await page.goto("/e2e.html");
    await createCore(page, { intro: true });
    expect(await paintedPixels(page, "#core")).toBeGreaterThan(500);
    await page.waitForTimeout(200);
    const box = await page.locator("#core").boundingBox();
    if (!box) throw new Error("no box");
    const delta = await rafDelta(page, 400, () =>
      page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 }),
    );
    expect(delta).toBe(0);
  });

  test("hide: no canvas painted and the fallback stays visible", async ({ page }) => {
    await page.goto("/e2e.html");
    await createCore(page, { reducedMotion: "hide" });
    await expect(page.locator("#core")).toHaveAttribute("data-ready", "false");
    await expect(page.locator("#core > canvas")).toBeHidden();
  });

  test("ignore: animates anyway", async ({ page }) => {
    await page.goto("/e2e.html");
    await createCore(page, { reducedMotion: "ignore", intro: { duration: 2000 } });
    expect(await rafDelta(page, 300)).toBeGreaterThan(5);
  });
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  /** Swipes a finger up from the middle of `#core`; returns the resulting scrollY. */
  const swipe = async (page: Page) => {
    await page.evaluate(() => window.scrollTo(0, 0));
    const box = await page.locator("#core").boundingBox();
    if (!box) throw new Error("no box");
    const client = await page.context().newCDPSession(page);
    const point = (y: number) => ({ x: 150, y, id: 1, radiusX: 5, radiusY: 5, force: 1 });
    const y = Math.round(box.y + box.height / 2);
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point(y)] });
    for (let i = 1; i <= 15; i++) {
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [point(y - i * 25)],
      });
      await page.waitForTimeout(20);
    }
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(800);
    return page.evaluate(() => window.scrollY);
  };

  test("touch listeners are passive and a swipe over the text scrolls the page", async ({
    page,
  }) => {
    await page.goto("/e2e.html");
    // Room above the text so the finger can travel up while staying on screen.
    await page.evaluate(() => {
      (document.getElementById("core") as HTMLElement).style.marginTop = "500px";
    });
    // Headless Chrome barely scrolls on the first synthetic gesture of a page: warm it up.
    await swipe(page);
    await createCore(page);
    const options = await page.evaluate(() => window.__t.touchOptions);
    expect(options.length).toBeGreaterThan(0);
    for (const option of options) expect(option).toMatchObject({ passive: true });

    expect(await swipe(page)).toBeGreaterThan(100);
    expect(await page.evaluate(() => window.__t.preventDefault)).toBe(0);

    // Control: a blocking listener on the same element does stop the scroll.
    await page.evaluate(() => {
      document
        .getElementById("core")
        ?.addEventListener("touchmove", (event) => event.preventDefault(), { passive: false });
    });
    expect(await swipe(page)).toBe(0);
  });

  test("wraps into one word per line below wrapBelow", async ({ page }) => {
    await page.goto("/e2e.html");
    const lines = await page.evaluate(async () => {
      const target = document.getElementById("core") as HTMLElement;
      const instance = window.createTextBubbles(target, {
        text: "Pedro Vilaça",
        wrapBelow: 608,
        color: "#000",
      });
      await instance.ready;
      // Count rows with paint on the canvas: two separated bands means two lines.
      const canvas = instance.canvas;
      const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let bands = 0;
      let inBand = false;
      for (let y = 0; y < canvas.height; y++) {
        let row = false;
        for (let x = 0; x < canvas.width && !row; x++)
          row = data[(x + y * canvas.width) * 4 + 3] > 0;
        if (row && !inBand) bands++;
        inBand = row;
      }
      return bands;
    });
    expect(lines).toBe(2);
  });
});

test("no console errors on the demo page", async ({ page }) => {
  await page.goto("/index.html");
  await expect(page.locator(".stage")).toHaveAttribute("data-ready", "true");
  const box = await page.locator(".stage").boundingBox();
  if (!box) throw new Error("no box");
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
  await page.getByRole("button", { name: /theme/ }).click();
  await page.waitForTimeout(300);
});
