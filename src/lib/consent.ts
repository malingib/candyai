export type ConsentState = {
  required: true;
  analytics: boolean;
  updatedAt: string;
};

export const CONSENT_KEY = "mw_consent_v1";

export function readConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConsentState>;
    if (typeof parsed.analytics !== "boolean") return null;
    return {
      required: true,
      analytics: parsed.analytics,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeConsent(analytics: boolean): ConsentState {
  const next: ConsentState = { required: true, analytics, updatedAt: new Date().toISOString() };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("mw-consent-updated", { detail: next }));
  return next;
}
