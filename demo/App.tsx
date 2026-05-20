import { useState } from 'react';
import { TextBubbles } from '../src';

function Slider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
      <span style={{ minWidth: 90, fontWeight: 500 }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step ?? Math.max(1, (max - min) / 100)}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: 120 }}
      />
      <span style={{ minWidth: 28, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </label>
  );
}

export default function App() {
  const [text, setText] = useState('Hello World');
  const [color, setColor] = useState('#222');
  const [fontSize, setFontSize] = useState(50);
  const [bubbleSize, setBubbleSize] = useState(1.2);
  const [bubbleSpacing, setBubbleSpacing] = useState(1);
  const [speed, setSpeed] = useState(7);
  const [spacing, setSpacing] = useState(0.05);
  const [radius, setRadius] = useState(100);

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          padding: '12px 16px',
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
          alignItems: 'center',
          background: '#fff',
          borderBottom: '1px solid #ddd',
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type something..."
          style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, width: 200 }}
        />

        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          style={{ width: 32, height: 32, border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Slider label="Font size" value={fontSize} min={20} max={120} onChange={setFontSize} />
          <Slider label="Bubble size" value={bubbleSize} min={0.5} max={5} step={0.1} onChange={setBubbleSize} />
          <Slider label="Spacing" value={bubbleSpacing} min={1} max={15} onChange={setBubbleSpacing} />
          <div style={{ fontSize: 11, color: '#888' }}>Spacing controls quantity — lower = more bubbles</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Slider label="Speed" value={speed} min={1} max={30} onChange={setSpeed} />
          <Slider label="Easing" value={spacing} min={0.01} max={1} step={0.01} onChange={setSpacing} />
          <Slider label="Radius" value={radius} min={10} max={300} onChange={setRadius} />
          <div style={{ fontSize: 11, color: '#888' }}>Easing = how fast bubbles return. Radius = interaction range. Speed = scatter intensity.</div>
        </div>
        <a
          href="https://github.com/piique/text-bubbles"
          target="_blank"
          rel="noreferrer"
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}
          title="View on GitHub"
        >
          <svg width="28" height="28" viewBox="0 0 98 96" xmlns="http://www.w3.org/2000/svg">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
              fill="#24292f"
            />
          </svg>
        </a>
      </div>

      <div style={{ flex: 1 }}>
        <TextBubbles
          key={`${text}-${color}-${fontSize}-${bubbleSize}-${bubbleSpacing}-${speed}-${spacing}-${radius}`}
          text={text}
          color={color}
          fontSize={fontSize}
          bubbleSize={bubbleSize}
          bubbleSpacing={bubbleSpacing}
          speed={speed}
          spacing={spacing}
          radius={radius}
        />
      </div>
    </div>
  );
}
