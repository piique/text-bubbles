// Playwright fixtures (built only with `vite build --mode e2e`, never deployed).
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { createTextBubbles } from "text-bubbles";
import "text-bubbles/element";
import { TextBubbles } from "text-bubbles/react";

declare global {
  interface Window {
    createTextBubbles: typeof createTextBubbles;
    rerender: () => void;
    renders: number;
    reactReady: boolean;
  }
}

window.createTextBubbles = createTextBubbles;
window.renders = 0;

function Parent() {
  const [count, setCount] = useState(0);
  window.rerender = () => setCount((n) => n + 1);
  window.renders = count + 1;
  return (
    // Inline object/function props on purpose: they must not re-initialize the effect.
    <TextBubbles
      text="React"
      fontSize={64}
      color="rgb(0, 128, 0)"
      intro={{ duration: 200 }}
      style={{ width: 600, height: 150 }}
      onReady={() => {
        window.reactReady = true;
      }}
      onPointerEnter={() => {}}
    >
      <h2 className="fallback">React {count}</h2>
    </TextBubbles>
  );
}

const root = document.getElementById("react");
if (root) createRoot(root).render(<Parent />);
