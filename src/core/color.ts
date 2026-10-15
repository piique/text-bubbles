/** The subset of CSSStyleDeclaration used to resolve colors. */
export interface StyleSource {
  getPropertyValue(property: string): string;
  color: string;
}

const VAR = /^var\(\s*(--[\w-]+)\s*(?:,([\s\S]*))?\)$/i;

/**
 * Resolves a color for canvas `fillStyle`:
 * `var(--token[, fallback])` and bare `--token` read the custom property from `style`;
 * `currentColor` reads `style.color`; anything else is returned as is.
 * Unset tokens fall back to the var() fallback, then to `currentColor`.
 */
export function resolveColor(value: string, style: StyleSource): string {
  const v = value.trim();
  const match = VAR.exec(v) || (v.startsWith("--") ? [v, v] : null);
  if (match) {
    const fallback = match[2]?.trim();
    return (
      style.getPropertyValue(match[1]).trim() ||
      (fallback ? resolveColor(fallback, style) : style.color)
    );
  }
  return /^currentcolor$/i.test(v) ? style.color : v;
}

/** True when the color depends on the cascade (and may change with the theme). */
export const isDynamicColor = (value: string): boolean => /var\(|^\s*--|currentcolor/i.test(value);
