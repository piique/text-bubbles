import { useEffect, useMemo, useRef, useState } from "react";
import { createTextBubbles, type TextBubblesOptions } from "text-bubbles";
import "text-bubbles/element";
import { TextBubbles, useTextBubbles } from "text-bubbles/react";

const REPO = "https://github.com/piique/text-bubbles";
const NPM = "https://www.npmjs.com/package/text-bubbles";

const FONTS = [
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Sans", value: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
  { label: "Mono", value: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" },
  { label: "Impact", value: "Impact, 'Arial Black', sans-serif" },
];

type Options = Required<
  Pick<
    TextBubblesOptions,
    | "text"
    | "font"
    | "fontWeight"
    | "fontSize"
    | "align"
    | "lineHeight"
    | "wrapBelow"
    | "color"
    | "accentColor"
    | "accentRatio"
    | "density"
    | "bubbleSpacing"
    | "bubbleSize"
    | "radius"
    | "speed"
    | "ease"
    | "reducedMotion"
  >
> & { intro: boolean };

const INITIAL: Options = {
  text: "text bubbles",
  font: FONTS[0].value,
  fontWeight: "400",
  fontSize: 180,
  align: "center",
  lineHeight: 0.95,
  wrapBelow: 560,
  color: "var(--fg)",
  accentColor: "var(--signal)",
  accentRatio: 0.07,
  density: 40,
  bubbleSpacing: 0,
  bubbleSize: 0,
  radius: 80,
  speed: 6,
  ease: 0.08,
  intro: true,
  reducedMotion: "respect",
};

/** Library defaults: options equal to these are left out of the generated snippets. */
const LIB_DEFAULTS: Partial<Record<keyof Options, unknown>> = {
  font: "sans-serif",
  fontWeight: "400",
  fontSize: 160,
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
  intro: false,
  reducedMotion: "respect",
};

const changed = (o: Options) =>
  (Object.keys(o) as (keyof Options)[]).filter(
    (key) => key === "text" || o[key] !== LIB_DEFAULTS[key],
  );

const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const escapeAttr = (value: string) => value.replace(/"/g, "&quot;");

function snippet(kind: "react" | "element" | "vanilla", o: Options): string {
  const keys = changed(o);
  if (kind === "react") {
    const props = keys.map((key) => {
      const value = o[key];
      if (value === true) return `  ${key}`;
      return typeof value === "string" && !value.includes("\n")
        ? `  ${key}="${escapeAttr(value)}"`
        : `  ${key}={${JSON.stringify(value)}}`;
    });
    return `import { TextBubbles } from "text-bubbles/react";

<TextBubbles
${props.join("\n")}
  style={{ height: 320 }}
>
  <h1 className="fallback">${o.text}</h1>
</TextBubbles>`;
  }
  if (kind === "element") {
    const attrs = keys
      .filter((key) => key !== "text")
      .map((key) =>
        o[key] === true ? `  ${kebab(key)}` : `  ${kebab(key)}="${escapeAttr(String(o[key]))}"`,
      );
    return `<script type="module">import "text-bubbles/element";</script>

<text-bubbles
${attrs.join("\n")}
  style="display:block;height:320px"
>
  <!-- Fallback + source of the text when there is no text attribute -->
  <h1 class="fallback">${o.text}</h1>
</text-bubbles>`;
  }
  const lines = keys.map((key) => `  ${key}: ${JSON.stringify(o[key])},`);
  return `import { createTextBubbles } from "text-bubbles";

const bubbles = createTextBubbles(document.querySelector("#hero"), {
${lines.join("\n")}
});
// bubbles.update({ text: "new" }); bubbles.destroy();`;
}

function Range(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  hint?: string;
  onChange: (value: number) => void;
}) {
  const { label, value, min, max, step, hint, onChange } = props;
  return (
    <label className="field" title={hint}>
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <output>{value === 0 && min === 0 && hint?.includes("auto") ? "auto" : value}</output>
    </label>
  );
}

function ColorField(props: { label: string; value: string; onChange: (value: string) => void }) {
  const { label, value, onChange } = props;
  return (
    <label className="field">
      <span>{label}</span>
      <input type="text" value={value} onChange={(event) => onChange(event.target.value)} />
      <input
        type="color"
        aria-label={`${label} picker`}
        value={value.startsWith("#") && value.length === 7 ? value : "#888888"}
        onChange={(event) => onChange(event.target.value)}
        style={{ width: 44, height: 26, padding: 0, border: 0, background: "none" }}
      />
    </label>
  );
}

/** Main stage: uses the hook so the particle count can be shown. */
function Stage({ options, onCount }: { options: Options; onCount: (n: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const { ready, instance } = useTextBubbles(ref, options);
  useEffect(() => {
    const id = setInterval(() => onCount(instance.current?.particleCount ?? 0), 400);
    return () => clearInterval(id);
  }, [instance, onCount]);
  return (
    <div ref={ref} className="stage" data-ready={ready ? "true" : "false"}>
      <h1 className="fallback" style={{ fontFamily: options.font, fontWeight: options.fontWeight }}>
        {options.text}
      </h1>
    </div>
  );
}

/** Vanilla core usage, wired by hand. */
function CoreExample() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const bubbles = createTextBubbles(ref.current, {
      text: "core",
      font: FONTS[2].value,
      fontWeight: 700,
      fontSize: 72,
      color: "var(--signal)",
      radius: 40,
      speed: 4,
    });
    return () => bubbles.destroy();
  }, []);
  return (
    <div ref={ref} className="box">
      <p className="small-fallback">core</p>
    </div>
  );
}

export function App() {
  const [options, setOptions] = useState<Options>(INITIAL);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [tab, setTab] = useState<"react" | "element" | "vanilla">("react");
  const [count, setCount] = useState(0);
  const [run, setRun] = useState(0);
  const set =
    <K extends keyof Options>(key: K) =>
    (value: Options[K]) =>
      setOptions((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const code = useMemo(() => snippet(tab, options), [tab, options]);

  return (
    <>
      <div className="wrap">
        <header className="top">
          <h1>text-bubbles</h1>
          <p>
            Text as interactive particles. ~4 KB gzipped, zero dependencies, React and custom
            element adapters.
          </p>
          <nav className="links" aria-label="Project links">
            <code className="install">npm i text-bubbles</code>
            <a className="btn" href={NPM} target="_blank" rel="noreferrer">
              npm
            </a>
            <a className="btn" href={REPO} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <button
              type="button"
              className="btn"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? "Light" : "Dark"} theme
            </button>
          </nav>
        </header>
      </div>

      <main className="wrap layout">
        <div>
          <Stage key={run} options={options} onCount={setCount} />
          <div className="meta">
            <span>
              {count.toLocaleString("en-US")} particles · move the pointer (or a finger) over the
              text
            </span>
            <button type="button" className="btn" onClick={() => setRun((n) => n + 1)}>
              Replay intro
            </button>
          </div>

          <section>
            <div className="tabs" role="tablist" aria-label="Snippet">
              {(["react", "element", "vanilla"] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  role="tab"
                  className="btn"
                  aria-selected={tab === kind}
                  onClick={() => setTab(kind)}
                >
                  {kind === "react" ? "React" : kind === "element" ? "Custom element" : "Vanilla"}
                </button>
              ))}
            </div>
            <pre className="code">
              <code>{code}</code>
            </pre>
          </section>

          <section>
            <h2 className="heading">Three ways to use it</h2>
            <div className="examples">
              <div className="example">
                <h3>Core: createTextBubbles()</h3>
                <CoreExample />
              </div>
              <div className="example">
                <h3>React: &lt;TextBubbles&gt;</h3>
                <TextBubbles
                  text="react"
                  font={FONTS[1].value}
                  fontWeight={800}
                  fontSize={72}
                  color="var(--fg)"
                  accentColor="var(--signal)"
                  accentRatio={0.2}
                  radius={40}
                  style={{ height: 120 }}
                >
                  <p className="small-fallback">react</p>
                </TextBubbles>
              </div>
              <div className="example">
                <h3>Custom element: &lt;text-bubbles&gt;</h3>
                <text-bubbles
                  font="Georgia, serif"
                  font-size="72"
                  color="var(--signal)"
                  accent-color="var(--fg)"
                  accent-ratio="0.3"
                  radius="40"
                >
                  <p className="small-fallback">element</p>
                </text-bubbles>
              </div>
            </div>
          </section>
        </div>

        <aside className="controls" aria-label="Options">
          <h2>Text</h2>
          <textarea
            aria-label="Text"
            value={options.text}
            onChange={(event) => set("text")(event.target.value)}
          />
          <label className="field">
            <span>font</span>
            <select value={options.font} onChange={(event) => set("font")(event.target.value)}>
              {FONTS.map((font) => (
                <option key={font.label} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
            <span />
          </label>
          <label className="field">
            <span>fontWeight</span>
            <select
              value={String(options.fontWeight)}
              onChange={(event) => set("fontWeight")(event.target.value)}
            >
              {["300", "400", "600", "700", "900"].map((weight) => (
                <option key={weight}>{weight}</option>
              ))}
            </select>
            <span />
          </label>
          <label className="field">
            <span>align</span>
            <select
              value={options.align}
              onChange={(event) => set("align")(event.target.value as Options["align"])}
            >
              <option>left</option>
              <option>center</option>
              <option>right</option>
            </select>
            <span />
          </label>
          <Range
            label="fontSize (max)"
            value={options.fontSize}
            min={24}
            max={320}
            step={1}
            onChange={set("fontSize")}
          />
          <Range
            label="lineHeight"
            value={options.lineHeight}
            min={0.7}
            max={1.6}
            step={0.05}
            onChange={set("lineHeight")}
          />
          <Range
            label="wrapBelow"
            value={options.wrapBelow}
            min={0}
            max={1200}
            step={10}
            hint="Container width under which each word gets its own line"
            onChange={set("wrapBelow")}
          />

          <h2>Colors</h2>
          <ColorField label="color" value={options.color} onChange={set("color")} />
          <ColorField
            label="accentColor"
            value={options.accentColor}
            onChange={set("accentColor")}
          />
          <Range
            label="accentRatio"
            value={options.accentRatio}
            min={0}
            max={1}
            step={0.01}
            onChange={set("accentRatio")}
          />

          <h2>Particles</h2>
          <Range
            label="density"
            value={options.density}
            min={10}
            max={80}
            step={1}
            hint="spacing = fontSize / density (2–6 px)"
            onChange={set("density")}
          />
          <Range
            label="bubbleSpacing"
            value={options.bubbleSpacing}
            min={0}
            max={12}
            step={1}
            hint="0 = auto (from density)"
            onChange={set("bubbleSpacing")}
          />
          <Range
            label="bubbleSize"
            value={options.bubbleSize}
            min={0}
            max={6}
            step={0.1}
            hint="0 = auto (42% of spacing)"
            onChange={set("bubbleSize")}
          />

          <h2>Motion</h2>
          <Range
            label="radius"
            value={options.radius}
            min={0}
            max={300}
            step={1}
            onChange={set("radius")}
          />
          <Range
            label="speed"
            value={options.speed}
            min={0}
            max={30}
            step={0.5}
            onChange={set("speed")}
          />
          <Range
            label="ease"
            value={options.ease}
            min={0.01}
            max={1}
            step={0.01}
            onChange={set("ease")}
          />
          <label className="field">
            <span>intro</span>
            <input
              type="checkbox"
              checked={options.intro}
              onChange={(event) => set("intro")(event.target.checked)}
            />
            <span />
          </label>
          <label className="field">
            <span>reducedMotion</span>
            <select
              value={options.reducedMotion}
              onChange={(event) =>
                set("reducedMotion")(event.target.value as Options["reducedMotion"])
              }
            >
              <option>respect</option>
              <option>ignore</option>
              <option>hide</option>
            </select>
            <span />
          </label>
          <button type="button" className="btn" onClick={() => setOptions(INITIAL)}>
            Reset
          </button>
        </aside>
      </main>

      <footer className="wrap">
        MIT © Pedro Vilaça · <a href={REPO}>github.com/piique/text-bubbles</a> ·{" "}
        <a href={NPM}>npmjs.com/package/text-bubbles</a>
      </footer>
    </>
  );
}
