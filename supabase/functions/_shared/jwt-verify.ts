import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface JwtPayload {
  sub: string;
  exp?: number;
  iat?: number;
  email?: string;
  role?: string;
  [key: string]: any;
}

const supabaseAuth = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,
);

/**
 * Verifies a JWT by delegating signature validation to Supabase Auth.
 * Returns the verified claims, or null if invalid/expired.
 */
export async function verifyJWT(token: string): Promise<JwtPayload | null> {
  try {
    const { data, error } = await supabaseAuth.auth.getClaims(token);
    if (error || !data?.claims) return null;
    return data.claims as JwtPayload;
  } catch (e) {
    console.error("JWT verification error:", e);
    return null;
  }
}

/**
 * Validates the Authorization header on a request. Returns a 401 Response if
 * invalid, or null if the token is valid (signature + expiry verified by Supabase).
 */
export async function verifyTokenInRequest(
  req: Request,
  corsHeaders?: Record<string, string>,
): Promise<Response | null> {
  const jsonHeaders = { ...(corsHeaders ?? {}), "Content-Type": "application/json" };
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Missing Authorization header" }),
      { status: 401, headers: jsonHeaders },
    );
  }

  if (!authHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Invalid Authorization header format" }),
      { status: 401, headers: jsonHeaders },
    );
  }

  const token = authHeader.substring(7);
  const payload = await verifyJWT(token);
  if (!payload) {
    return new Response(
      JSON.stringify({ error: "Invalid or expired token" }),
      { status: 401, headers: jsonHeaders },
    );
  }

  return null;
}
