export function isUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export function clamp(s: unknown, max: number): string {
  return String(s ?? "").slice(0, max);
}

export function jsonResponse(data: unknown, status = 200, corsHeaders?: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...(corsHeaders ?? {}),
      "Content-Type": "application/json",
    },
  });
}

export function errorResponse(message: string, status = 400, code?: string, corsHeaders?: Record<string, string>) {
  return jsonResponse({ error: message, code }, status, corsHeaders);
}
