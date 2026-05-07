import { describe, expect, it } from "vitest";
import { isAllowedOrigin, normalizeOrigin, sanitizeUserMessage } from "../../supabase/functions/_shared/request-security.ts";

describe("security allowlist", () => {
  it("normalizes and matches host exactly", () => {
    expect(normalizeOrigin("https://Example.com/path")).toBe("https://example.com");
    expect(isAllowedOrigin("https://example.com", ["https://example.com"])).toBe(true);
    expect(isAllowedOrigin("https://evil-example.com", ["https://example.com"])).toBe(false);
  });
});

describe("input sanitization", () => {
  it("trims and clamps", () => {
    const s = sanitizeUserMessage("  hello  ", 5);
    expect(s).toBe("hel");
  });

  it("drops null bytes", () => {
    const s = sanitizeUserMessage("ab\u0000cd", 10);
    expect(s).toBe("abcd");
  });
});
