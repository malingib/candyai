import { describe, expect, it } from "vitest";
import {
  isSensitiveRateLimitKey,
  maskEmail,
  maskPhone,
  resolveRateLimitFailModeFromEnv,
} from "../../supabase/functions/_shared/security-utils.ts";

describe("rate limit failure mode resolution", () => {
  it("fails closed for sensitive keys by default", () => {
    expect(resolveRateLimitFailModeFromEnv("chat:1.2.3.4", {})).toBe("closed");
    expect(resolveRateLimitFailModeFromEnv("widget-conversation:1.2.3.4", {})).toBe("closed");
    expect(resolveRateLimitFailModeFromEnv("ai-chat:1.2.3.4", {})).toBe("closed");
  });

  it("respects explicit mode override", () => {
    expect(resolveRateLimitFailModeFromEnv("chat:1.2.3.4", {}, "open")).toBe("open");
  });

  it("uses default mode for non-sensitive keys", () => {
    expect(resolveRateLimitFailModeFromEnv("public-feed:1.2.3.4", { defaultMode: "closed" })).toBe("closed");
    expect(resolveRateLimitFailModeFromEnv("public-feed:1.2.3.4", { defaultMode: "open" })).toBe("open");
  });

  it("allows sensitive mode configuration", () => {
    expect(resolveRateLimitFailModeFromEnv("chat:1.2.3.4", { sensitiveMode: "open" })).toBe("open");
  });
});

describe("sensitive key detection", () => {
  it("matches required endpoint prefixes", () => {
    expect(isSensitiveRateLimitKey("chat:ip")).toBe(true);
    expect(isSensitiveRateLimitKey("widget-conversation:ip")).toBe(true);
    expect(isSensitiveRateLimitKey("ai-chat:ip")).toBe(true);
    expect(isSensitiveRateLimitKey("other:ip")).toBe(false);
  });
});

describe("PII masking", () => {
  it("masks email local/domain segments", () => {
    expect(maskEmail("alice@example.com")).toBe("al***@ex***.com");
  });

  it("returns safe fallback for malformed email", () => {
    expect(maskEmail("not-an-email")).toBe("[redacted-email]");
  });

  it("masks phone digits preserving last 4", () => {
    expect(maskPhone("+254 712 345 678")).toBe("********5678");
  });
});
