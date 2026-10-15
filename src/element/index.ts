import { createTextBubbles, type TextBubblesInstance, type TextBubblesOptions } from "text-bubbles";

export type { TextBubblesInstance, TextBubblesOptions } from "text-bubbles";

/** Observed attributes: kebab-case options (`intro` is handled separately). */
const ATTRIBUTES =
  "text font font-weight font-style font-size max-width align line-height wrap-below color accent-color accent-ratio density bubble-spacing bubble-size radius speed ease reduced-motion max-dpr intro".split(
    " ",
  );

/**
 * Reads every option from attributes. Values stay strings (the core parses numbers);
 * absent attributes are `undefined`, i.e. the default.
 */
function readOptions(element: HTMLElement): TextBubblesOptions {
  const options: Record<string, unknown> = {};
  for (const name of ATTRIBUTES) {
    options[name.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())] =
      element.getAttribute(name) ?? undefined;
  }
  // Without a `text` attribute, the fallback content's text is drawn.
  options.text ??= (element.textContent || "").replace(/\s+/g, " ").trim();
  const intro = options.intro as string | undefined;
  options.intro =
    intro == null || intro === "false" ? false : +intro > 0 ? { duration: +intro } : true;
  return options as unknown as TextBubblesOptions;
}

/** The `<text-bubbles>` element class (only available in the browser). */
export interface TextBubblesElement extends HTMLElement {
  /** The running instance (undefined while disconnected). */
  readonly instance: TextBubblesInstance | undefined;
}

/**
 * Registers the custom element (default tag `text-bubbles`). Safe to call more than once
 * and on the server (it does nothing there).
 *
 * Attributes (kebab-case options): text, font, font-weight, font-style, font-size, max-width,
 * align, line-height, wrap-below, color, accent-color, accent-ratio, density, bubble-spacing,
 * bubble-size, radius, speed, ease, intro, reduced-motion, max-dpr.
 * Light DOM children stay in place as the accessible fallback; `data-ready="true"` is set once
 * the particles are painted, and a `ready` event is dispatched.
 */
export function defineTextBubbles(tagName = "text-bubbles"): void {
  if (typeof customElements === "undefined" || customElements.get(tagName)) return;

  class Element extends HTMLElement implements TextBubblesElement {
    static get observedAttributes() {
      return ATTRIBUTES;
    }

    private bubbles: TextBubblesInstance | undefined;

    get instance() {
      return this.bubbles;
    }

    connectedCallback() {
      const doc = this.ownerDocument;
      // Defined before parsing finished: wait for children (the fallback text).
      if (doc.readyState === "loading") {
        doc.addEventListener("DOMContentLoaded", () => this.mount(), { once: true });
      } else this.mount();
    }

    private mount() {
      if (this.bubbles || !this.isConnected) return;
      if (getComputedStyle(this).display === "inline") this.style.display = "block";
      this.bubbles = createTextBubbles(this, {
        ...readOptions(this),
        onReady: () => this.dispatchEvent(new Event("ready")),
      });
    }

    disconnectedCallback() {
      this.bubbles?.destroy();
      this.bubbles = undefined;
    }

    attributeChangedCallback() {
      this.bubbles?.update(readOptions(this));
    }
  }

  customElements.define(tagName, Element);
}

defineTextBubbles();

declare global {
  interface HTMLElementTagNameMap {
    "text-bubbles": TextBubblesElement;
  }
}
