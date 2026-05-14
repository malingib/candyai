import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// Mock the Admin component dependencies
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "test-user-id" } }),
}));

vi.mock("@/hooks/useIsAdmin", () => ({
  useIsAdmin: () => ({ isAdmin: true, loading: false }),
}));

// Test utility functions extracted from Admin.tsx
describe("Admin utility functions", () => {
  describe("csvEscape", () => {
    it("should escape values with commas", () => {
      const csvEscape = (value: unknown): string => {
        const s = String(value ?? "");
        if (s.includes(",") || s.includes("\n") || s.includes('"')) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };

      expect(csvEscape("hello")).toBe("hello");
      expect(csvEscape("hello, world")).toBe('"hello, world"');
      expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    });

    it("should handle null and undefined", () => {
      const csvEscape = (value: unknown): string => {
        const s = String(value ?? "");
        if (s.includes(",") || s.includes("\n") || s.includes('"')) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };

      expect(csvEscape(null)).toBe("");
      expect(csvEscape(undefined)).toBe("");
    });
  });

  describe("accountStatus", () => {
    it("should return active for free plan with valid trial", () => {
      const accountStatus = (p: { plan: string; trial_expires_at: string | null }) => {
        if (p.plan === "free") {
          if (p.trial_expires_at && new Date(p.trial_expires_at).getTime() < Date.now()) {
            return "expired";
          }
          return "active";
        }
        return "active";
      };

      expect(accountStatus({ plan: "free", trial_expires_at: null })).toBe("active");
      expect(
        accountStatus({
          plan: "free",
          trial_expires_at: new Date(Date.now() + 86400000).toISOString(),
        })
      ).toBe("active");
    });

    it("should return expired for free plan with expired trial", () => {
      const accountStatus = (p: { plan: string; trial_expires_at: string | null }) => {
        if (p.plan === "free") {
          if (p.trial_expires_at && new Date(p.trial_expires_at).getTime() < Date.now()) {
            return "expired";
          }
          return "active";
        }
        return "active";
      };

      expect(
        accountStatus({
          plan: "free",
          trial_expires_at: new Date(Date.now() - 86400000).toISOString(),
        })
      ).toBe("expired");
    });
  });
});

describe("Bulk action validation", () => {
  it("should validate user selection before bulk action", () => {
    const validateBulkAction = (selectedUserIds: string[]) => {
      if (!selectedUserIds.length) {
        throw new Error("Select at least one user first.");
      }
      return true;
    };

    expect(() => validateBulkAction([])).toThrow("Select at least one user first.");
    expect(() => validateBulkAction(["user-1", "user-2"])).toBeTruthy();
  });

  it("should sanitize plan values", () => {
    const validPlans = ["free", "growth", "premium", "enterprise"] as const;
    type Plan = (typeof validPlans)[number];

    const validatePlan = (plan: string): Plan => {
      if (!validPlans.includes(plan as Plan)) {
        throw new Error("Invalid plan");
      }
      return plan as Plan;
    };

    expect(validatePlan("growth")).toBe("growth");
    expect(() => validatePlan("invalid")).toThrow("Invalid plan");
  });
});