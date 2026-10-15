import { describe, expect, it } from "vitest";

describe("server-side import", () => {
  it("never touches window/document when imported", async () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
    const core = await import("../src/index");
    const react = await import("../src/react/index");
    const element = await import("../src/element/index");
    expect(typeof core.createTextBubbles).toBe("function");
    expect(typeof react.TextBubbles).toBe("function");
    expect(typeof react.useTextBubbles).toBe("function");
    // Registration is a no-op without customElements.
    expect(() => element.defineTextBubbles()).not.toThrow();
  });
});
