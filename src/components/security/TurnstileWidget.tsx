import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: {
        sitekey: string;
        callback?: (token: string) => void;
        "expired-callback"?: () => void;
        "error-callback"?: () => void;
        theme?: "light" | "dark" | "auto";
      }) => string;
      reset: (widgetId?: string) => void;
      remove?: (widgetId: string) => void;
    };
  }
}

type Props = {
  siteKey?: string;
  onToken: (token: string | null) => void;
  theme?: "light" | "dark" | "auto";
};

const SCRIPT_ID = "cf-turnstile-script";

export default function TurnstileWidget({ siteKey, onToken, theme = "auto" }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey || !ref.current) return;

    const renderWidget = () => {
      if (!window.turnstile || !ref.current) return;
      if (widgetIdRef.current) {
        try { window.turnstile.reset(widgetIdRef.current); } catch { /* widget reset failed */ }
        return;
      }
      widgetIdRef.current = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        theme,
        callback: (token: string) => onToken(token),
        "expired-callback": () => onToken(null),
        "error-callback": () => onToken(null),
      });
    };

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (window.turnstile) renderWidget();
      else existing.addEventListener("load", renderWidget, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = renderWidget;
    document.head.appendChild(script);

    return () => {
      if (widgetIdRef.current && window.turnstile?.remove) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* widget remove failed */ }
      }
      widgetIdRef.current = null;
    };
  }, [siteKey, theme, onToken]);

  if (!siteKey) return null;
  return <div ref={ref} className="flex justify-center" />;
}
