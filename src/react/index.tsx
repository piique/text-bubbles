"use client";

import {
  type CSSProperties,
  createElement,
  type ElementType,
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import { createTextBubbles, type TextBubblesInstance, type TextBubblesOptions } from "text-bubbles";

export type { TextBubblesInstance, TextBubblesOptions } from "text-bubbles";

/** Options without callbacks, as a string: it only changes when a primitive value changes. */
const serialize = (options: TextBubblesOptions): string =>
  JSON.stringify(options, (_key, value) => (typeof value === "function" ? undefined : value));

export interface UseTextBubblesResult {
  /** True once the particles are painted. */
  ready: boolean;
  /** The underlying instance (null before mount and after unmount). */
  instance: RefObject<TextBubblesInstance | null>;
}

/**
 * Draws `options.text` as particles inside the element in `ref`.
 * The instance is created once per mount; option changes are applied with `update()`
 * (compared by value, so inline object literals never re-initialize it).
 */
export function useTextBubbles(
  ref: RefObject<HTMLElement | null>,
  options: TextBubblesOptions,
): UseTextBubblesResult {
  const [ready, setReady] = useState(false);
  const instance = useRef<TextBubblesInstance | null>(null);
  const latest = useRef(options);
  const applied = useRef<Record<string, unknown>>({});
  const key = serialize(options);

  // Callbacks are read from here, so changing them never restarts anything.
  useEffect(() => {
    latest.current = options;
  });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const current = latest.current;
    const created = createTextBubbles(element, {
      ...current,
      onReady: () => {
        setReady(true);
        latest.current.onReady?.();
      },
      onPointerEnter: () => latest.current.onPointerEnter?.(),
      onPointerLeave: () => latest.current.onPointerLeave?.(),
    });
    applied.current = JSON.parse(serialize(current));
    instance.current = created;
    return () => {
      created.destroy();
      instance.current = null;
      setReady(false);
    };
  }, [ref]);

  useEffect(() => {
    const current = instance.current;
    if (!current) return;
    const next: Record<string, unknown> = JSON.parse(key);
    // Props that disappeared go back to their defaults.
    for (const name in applied.current) if (!(name in next)) next[name] = undefined;
    applied.current = next;
    current.update(next);
  }, [key]);

  return { ready, instance };
}

export interface TextBubblesProps extends TextBubblesOptions {
  /** Element to render. Default `"div"`. */
  as?: ElementType;
  id?: string;
  className?: string;
  style?: CSSProperties;
  /**
   * Static content kept in the DOM under the canvas: the accessible text (e.g. your `<h1>`),
   * shown before the particles are ready, without JavaScript and with `reducedMotion: "hide"`.
   * Fade it with `[data-ready="true"]`.
   */
  children?: ReactNode;
}

/** Container that draws its `text` as particles. Size it with `className`/`style`. */
export function TextBubbles({
  as = "div",
  id,
  className,
  style,
  children,
  ...options
}: TextBubblesProps) {
  const ref = useRef<HTMLElement | null>(null);
  const { ready } = useTextBubbles(ref, options);
  return createElement(
    as,
    {
      ref,
      id,
      className,
      style: { position: "relative", ...style },
      "data-ready": ready ? "true" : "false",
    },
    children,
  );
}
