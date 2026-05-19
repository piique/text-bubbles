# @pedrovilaca/text-bubbles

Interactive text bubble effect for React — renders text as dynamic bubbles that react to mouse movement.

[Demo](https://text-bubbles.netlify.app/)

## Features

- Customizable text, font, size, and color
- Interactive bubbles that scatter from the mouse cursor
- Responsive — adapts to the parent container's size
- React component (`<TextBubbles>`) and hook (`useTextBubbles`) APIs
- Zero dependencies (peer dep: React 18+)
- TypeScript support

## Installation

```bash
npm install @pedrovilaca/text-bubbles
```

## Usage

### Component

```tsx
import { TextBubbles } from '@pedrovilaca/text-bubbles';

function App() {
  return (
    <div style={{ width: 600, height: 400 }}>
      <TextBubbles text="Hello World" color="#222" fontSize={50} />
    </div>
  );
}
```

### Hook

```tsx
import { useTextBubbles } from '@pedrovilaca/text-bubbles';

function App() {
  const { canvasRef, containerRef } = useTextBubbles({
    text: 'Hello World',
    color: '#222',
  });

  return (
    <div ref={containerRef} style={{ width: 600, height: 400 }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
}
```

## Props / Options

| Prop | Type | Default | Description |
|---|---|---|---|
| `text` | `string` | `'Example Text'` | Text to render as bubbles |
| `color` | `string` | `'#111111'` | Bubble fill color |
| `fontSize` | `number` | `50` | Base font size (auto-scales) |
| `font` | `string` | `'Arial'` | Font family |
| `radius` | `number` | `100` | Mouse interaction radius |
| `speed` | `number` | `7` | Bubble scatter speed |
| `spacing` | `number` | `0.05` | Return-to-position easing |
| `bubbleSize` | `number` | `1.2` | Individual bubble radius |
| `bubbleSpacing` | `number` | `1` | Pixel spacing between bubble centers |
| `maxWidth` | `number` | `500` | Max text width before font scaling |

## Development

```bash
npm install
npm run dev       # Start demo app
npm run build     # Build library
npm run typecheck # Type check
```

## License

MIT