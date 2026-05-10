import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { supabase } from "./integrations/supabase/client";
import { readConsent } from "./lib/consent";

const cloudflareToken = import.meta.env.VITE_CLOUDFLARE_ANALYTICS_TOKEN;
if (cloudflareToken && typeof document !== "undefined" && readConsent()?.analytics) {
  const script = document.createElement("script");
  script.defer = true;
  script.src = "https://static.cloudflareinsights.com/beacon.min.js";
  script.setAttribute("data-cf-beacon", JSON.stringify({ token: cloudflareToken }));
  document.head.appendChild(script);
}

const telemetryEndpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/client-telemetry`;
let lastTelemetryAt = 0;
async function sendClientTelemetry(level: "error" | "warn", message: string, metadata: Record<string, unknown> = {}) {
  const now = Date.now();
  if (now - lastTelemetryAt < 3000) return;
  lastTelemetryAt = now;
  if (!import.meta.env.VITE_SUPABASE_URL) return;
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) return;
  fetch(telemetryEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({
      level,
      message: String(message).slice(0, 500),
      metadata: {
        path: window.location.pathname,
        ua: navigator.userAgent.slice(0, 200),
        ...metadata,
      },
    }),
  }).catch(() => {});
}

window.addEventListener("error", (e) => {
  void sendClientTelemetry("error", e.message || "window error", {
    filename: e.filename,
    lineno: e.lineno,
    colno: e.colno,
  });
});
window.addEventListener("unhandledrejection", (e) => {
  const reason = e.reason instanceof Error ? e.reason.message : String(e.reason || "promise rejection");
  void sendClientTelemetry("error", reason);
});

createRoot(document.getElementById("root")!).render(<App />);
