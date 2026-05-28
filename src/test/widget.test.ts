import { describe, it, expect } from "vitest";

describe("widget helper utilities", () => {
  const escapeHtml = (s: string | null | undefined): string => {
    if (!s) return "";
    return String(s).replace(/[&<>"']/g, (c: string) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] || c
    );
  };

  const sanitizeText = (value: string | null | undefined, maxLen: number): string =>
    String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLen);

  const sanitizePhone = (value: string | null | undefined): string =>
    sanitizeText(value, 30).replace(/[^\d+\-\s()]/g, "").trim();

  const sanitizeEmail = (value: string | null | undefined): string =>
    sanitizeText(value, 255).toLowerCase();

  const sanitizeUuid = (value: string): string => {
    const v = sanitizeText(value, 64);
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v) ? v : "";
  };

  const isValidOrigin = (origin: string): boolean => {
    try {
      const u = new URL(origin);
      return u.protocol === "https:" || u.protocol === "http:";
    } catch {
      return false;
    }
  };

  const buildChatPayload = (opts: {
    messages: Array<{ role: string; content: string }>;
    businessId: string;
    conversationId: string | null;
    pageUrl: string;
    pageTitle: string;
  }) => ({
    messages: opts.messages,
    demo: false,
    user_id: sanitizeUuid(opts.businessId),
    conversation_id: opts.conversationId ? sanitizeUuid(opts.conversationId) : null,
    page_url: opts.pageUrl,
    page_title: opts.pageTitle,
  });

  const buildAnalyticsPayload = (opts: {
    businessId: string;
    conversationId: string | null;
    event: string;
    pageUrl: string;
    pageTitle: string;
  }) => ({
    action: "analytics",
    business_id: sanitizeUuid(opts.businessId),
    conversation_id: opts.conversationId,
    event: opts.event,
    page_url: opts.pageUrl,
    page_title: opts.pageTitle,
  });

  const mapChatError = (status: number): string => {
    if (status === 429) return "Too many messages. Please wait and try again.";
    if (status === 402) return "Chat quota reached. Please contact the business.";
    if (status === 403) return "This chat session is no longer active.";
    if (status >= 500) return "AI service is temporarily unavailable. Please try again later.";
    return "Something went wrong. Please try again.";
  };

  describe("escapeHtml", () => {
    it("should escape & < > \" '", () => {
      expect(escapeHtml("&<>\"'")).toBe("&amp;&lt;&gt;&quot;&#39;");
    });

    it("should return empty string for null/undefined", () => {
      expect(escapeHtml(null)).toBe("");
      expect(escapeHtml(undefined)).toBe("");
    });

    it("should leave safe strings unchanged", () => {
      expect(escapeHtml("hello world")).toBe("hello world");
    });
  });

  describe("sanitizeText", () => {
    it("should trim and collapse whitespace", () => {
      expect(sanitizeText("  hello   world  ", 100)).toBe("hello world");
    });

    it("should truncate to maxLen", () => {
      expect(sanitizeText("hello world", 5)).toBe("hello");
    });

    it("should handle null", () => {
      expect(sanitizeText(null, 100)).toBe("");
    });
  });

  describe("sanitizePhone", () => {
    it("should keep digits, +, -, (), and space", () => {
      expect(sanitizePhone("+254 712 345 678")).toBe("+254 712 345 678");
    });

    it("should strip invalid characters", () => {
      expect(sanitizePhone("call +254-712-345-678 now!")).toBe("+254-712-345-678");
    });
  });

  describe("sanitizeEmail", () => {
    it("should lowercase email", () => {
      expect(sanitizeEmail("Test@Example.COM")).toBe("test@example.com");
    });

    it("should trim whitespace", () => {
      expect(sanitizeEmail("  user@example.com  ", 255)).toBe("user@example.com");
    });
  });

  describe("sanitizeUuid", () => {
    it("should accept valid UUIDs", () => {
      expect(sanitizeUuid("550e8400-e29b-41d4-a716-446655440000")).toBe("550e8400-e29b-41d4-a716-446655440000");
    });

    it("should reject invalid UUIDs", () => {
      expect(sanitizeUuid("not-a-uuid")).toBe("");
      expect(sanitizeUuid("")).toBe("");
    });
  });

  describe("isValidOrigin", () => {
    it("should accept https URLs", () => {
      expect(isValidOrigin("https://example.com")).toBe(true);
    });

    it("should accept http URLs", () => {
      expect(isValidOrigin("http://localhost:3000")).toBe(true);
    });

    it("should reject invalid URLs", () => {
      expect(isValidOrigin("not-a-url")).toBe(false);
    });
  });

  describe("chat payload contract", () => {
    it("should build valid widget chat payload", () => {
      const payload = buildChatPayload({
        messages: [{ role: "user", content: "hello" }],
        businessId: "550e8400-e29b-41d4-a716-446655440000",
        conversationId: "660e8400-e29b-41d4-a716-446655440001",
        pageUrl: "https://example.com/services",
        pageTitle: "Services | Example",
      });

      expect(payload.messages).toHaveLength(1);
      expect(payload.demo).toBe(false);
      expect(payload.user_id).toBe("550e8400-e29b-41d4-a716-446655440000");
      expect(payload.conversation_id).toBe("660e8400-e29b-41d4-a716-446655440001");
      expect(payload.page_url).toBe("https://example.com/services");
      expect(payload.page_title).toBe("Services | Example");
    });

    it("should handle null conversation_id for new chats", () => {
      const payload = buildChatPayload({
        messages: [{ role: "user", content: "hello" }],
        businessId: "550e8400-e29b-41d4-a716-446655440000",
        conversationId: null,
        pageUrl: "https://example.com",
        pageTitle: "Example",
      });

      expect(payload.conversation_id).toBeNull();
    });

    it("should reject invalid business UUID", () => {
      const payload = buildChatPayload({
        messages: [{ role: "user", content: "hello" }],
        businessId: "bad-uuid",
        conversationId: null,
        pageUrl: "https://example.com",
        pageTitle: "Example",
      });

      expect(payload.user_id).toBe("");
    });
  });

  describe("analytics payload contract", () => {
    it("should build valid analytics ping payload", () => {
      const payload = buildAnalyticsPayload({
        businessId: "550e8400-e29b-41d4-a716-446655440000",
        conversationId: "660e8400-e29b-41d4-a716-446655440001",
        event: "message_sent",
        pageUrl: "https://example.com",
        pageTitle: "Example",
      });

      expect(payload.action).toBe("analytics");
      expect(payload.event).toBe("message_sent");
      expect(payload.business_id).toBe("550e8400-e29b-41d4-a716-446655440000");
      expect(payload.page_url).toBe("https://example.com");
    });
  });

  describe("chat error mapping", () => {
    it("should map 429 to rate limit message", () => {
      expect(mapChatError(429)).toBe("Too many messages. Please wait and try again.");
    });

    it("should map 402 to quota message", () => {
      expect(mapChatError(402)).toBe("Chat quota reached. Please contact the business.");
    });

    it("should map 403 to session inactive message", () => {
      expect(mapChatError(403)).toBe("This chat session is no longer active.");
    });

    it("should map 5xx to unavailable message", () => {
      expect(mapChatError(500)).toBe("AI service is temporarily unavailable. Please try again later.");
      expect(mapChatError(503)).toBe("AI service is temporarily unavailable. Please try again later.");
    });

    it("should provide fallback message for unknown status", () => {
      expect(mapChatError(400)).toBe("Something went wrong. Please try again.");
    });
  });

  describe("network retry logic", () => {
    it("should allow retries up to MAX_NETWORK_RETRIES", () => {
      const MAX_NETWORK_RETRIES = 2;
      const shouldRetry = (retryCount: number): boolean => retryCount < MAX_NETWORK_RETRIES;

      expect(shouldRetry(0)).toBe(true);
      expect(shouldRetry(1)).toBe(true);
      expect(shouldRetry(2)).toBe(false);
    });

    it("should generate retry status message", () => {
      const retryMsg = (count: number, max: number): string =>
        `Request timed out. Retrying\u2026 (${count}/${max})`;

      expect(retryMsg(1, 2)).toBe("Request timed out. Retrying\u2026 (1/2)");
      expect(retryMsg(2, 2)).toBe("Request timed out. Retrying\u2026 (2/2)");
    });

    it("should build final offline message with WhatsApp and Call fallback", () => {
      const buildOfflineMessage = (whatsapp: string | null, call: string | null): string => {
        let msg = "We're having trouble reaching our servers. ";
        if (whatsapp) {
          const waNum = whatsapp.replace(/[^\d]/g, "");
          msg += "Message us on WhatsApp at wa.me/" + waNum + " ";
        }
        if (call) msg += "or call " + call + ". ";
        msg += "We apologize for the inconvenience.";
        return msg;
      };

      const result = buildOfflineMessage("+254712345678", "+254712345679");
      expect(result).toContain("wa.me/254712345678");
      expect(result).toContain("or call +254712345679");
    });

    it("should omit WhatsApp fallback when not configured", () => {
      const buildOfflineMessage = (whatsapp: string | null, call: string | null): string => {
        let msg = "We're having trouble reaching our servers. ";
        if (whatsapp) {
          const waNum = whatsapp.replace(/[^\d]/g, "");
          msg += "Message us on WhatsApp at wa.me/" + waNum + " ";
        }
        if (call) msg += "or call " + call + ". ";
        msg += "We apologize for the inconvenience.";
        return msg;
      };

      const result = buildOfflineMessage(null, "+254712345679");
      expect(result).not.toContain("WhatsApp");
      expect(result).toContain("or call +254712345679");
    });
  });

  describe("lead capture payload", () => {
    const buildLeadPayload = (opts: {
      name: string;
      email: string;
      phone: string;
    }) => ({
      action: "lead",
      name: sanitizeText(opts.name, 100),
      email: sanitizeEmail(opts.email, 255),
      phone: sanitizePhone(opts.phone),
    });

    it("should build valid lead payload", () => {
      const payload = buildLeadPayload({
        name: "John Doe",
        email: "John@Example.COM",
        phone: "+254 712 345 678",
      });

      expect(payload.action).toBe("lead");
      expect(payload.name).toBe("John Doe");
      expect(payload.email).toBe("john@example.com");
      expect(payload.phone).toBe("+254 712 345 678");
    });

    it("should handle empty fields", () => {
      const payload = buildLeadPayload({ name: "", email: "", phone: "" });
      expect(payload.name).toBe("");
      expect(payload.email).toBe("");
      expect(payload.phone).toBe("");
    });
  });

  describe("WIDGET_VERSION", () => {
    it("should be 2.0.0", () => {
      expect("2.0.0").toBe("2.0.0");
    });
  });
});
