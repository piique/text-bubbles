import { describe, expect, it } from "vitest";
import { isDynamicColor, resolveColor, type StyleSource } from "../src/core/color";

/** Stub for getComputedStyle(target). */
const style = (vars: Record<string, string>, color = "rgb(1, 2, 3)"): StyleSource => ({
  color,
  getPropertyValue: (name) => vars[name] ?? "",
});

describe("resolveColor", () => {
  const s = style({ "--fg": " #e6edf3 ", "--signal": "#3ddc97", "--empty": "  " });

  it("passes plain CSS colors through", () => {
    expect(resolveColor("#123456", s)).toBe("#123456");
    expect(resolveColor(" rgb(0 0 0 / 50%) ", s)).toBe("rgb(0 0 0 / 50%)");
    expect(resolveColor("oklch(70% 0.1 150)", s)).toBe("oklch(70% 0.1 150)");
  });

  it("resolves var(--token) and bare --token (trimmed)", () => {
    expect(resolveColor("var(--fg)", s)).toBe("#e6edf3");
    expect(resolveColor("var( --signal )", s)).toBe("#3ddc97");
    expect(resolveColor("--signal", s)).toBe("#3ddc97");
  });

  it("uses the var() fallback, nested vars and finally currentColor", () => {
    expect(resolveColor("var(--missing, #ff0000)", s)).toBe("#ff0000");
    expect(resolveColor("var(--missing, var(--signal))", s)).toBe("#3ddc97");
    expect(resolveColor("var(--missing, rgb(1, 1, 1))", s)).toBe("rgb(1, 1, 1)");
    expect(resolveColor("var(--empty)", s)).toBe("rgb(1, 2, 3)");
    expect(resolveColor("--missing", s)).toBe("rgb(1, 2, 3)");
  });

  it("resolves currentColor from the computed color", () => {
    expect(resolveColor("currentColor", s)).toBe("rgb(1, 2, 3)");
    expect(resolveColor("currentcolor", s)).toBe("rgb(1, 2, 3)");
  });

  it("re-reads the style each time (theme switch)", () => {
    const vars: Record<string, string> = { "--fg": "#fff" };
    const live = style(vars);
    expect(resolveColor("var(--fg)", live)).toBe("#fff");
    vars["--fg"] = "#000";
    expect(resolveColor("var(--fg)", live)).toBe("#000");
  });
});

describe("isDynamicColor", () => {
  it("flags cascade-dependent colors", () => {
    expect(isDynamicColor("var(--fg)")).toBe(true);
    expect(isDynamicColor("--fg")).toBe(true);
    expect(isDynamicColor("currentColor")).toBe(true);
    expect(isDynamicColor("#fff")).toBe(false);
    expect(isDynamicColor("rgb(0,0,0)")).toBe(false);
  });
});
