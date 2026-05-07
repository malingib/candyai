import { createRemoteJWKSet, decodeJwt, jwtVerify } from "npm:jose@5.9.6";

export interface JwtPayload {
  sub: string;
  exp: number;
  iat: number;
  [key: string]: any;
}

const jsonHeaders = { "Content-Type": "application/json" };
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getSupabaseIssuerFromEnv(): string | null {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) return null;
    const origin = new URL(supabaseUrl).origin;
    return `${origin}/auth/v1`;
  } catch {
    return null;
  }
}

function toAudienceArray(aud: unknown): string[] {
  if (typeof aud === "string") return [aud];
  if (Array.isArray(aud)) return aud.filter((v): v is string => typeof v === "string");
  return [];
}

function getJwks(issuer: string) {
  const jwksUrl = `${issuer.replace(/\/+$/, "")}/.well-known/jwks.json`;
  const cached = jwksCache.get(jwksUrl);
  if (cached) return cached;
  const remote = createRemoteJWKSet(new URL(jwksUrl));
  jwksCache.set(jwksUrl, remote);
  return remote;
}

// Function to verify JWT token
export async function verifyJWT(token: string): Promise<JwtPayload | null> {
  try {
    const decoded = decodeJwt(token);
    const envIssuer = getSupabaseIssuerFromEnv();
    const issuer = typeof decoded.iss === "string" ? decoded.iss : envIssuer;
    if (!issuer) return null;

    // Enforce that token issuer matches this Supabase project.
    if (envIssuer && issuer !== envIssuer) return null;

    const tokenAudiences = toAudienceArray(decoded.aud);
    if (!tokenAudiences.includes("authenticated")) return null;

    const { payload } = await jwtVerify(token, getJwks(issuer), {
      issuer,
      audience: "authenticated",
      clockTolerance: 5,
    });
    return payload as JwtPayload;
  } catch (e) {
    console.error("JWT verification error:", e);
    return null;
  }
}

// Function to verify JWT token from request
export async function verifyTokenInRequest(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Missing Authorization header" }),
      { status: 401, headers: jsonHeaders }
    );
  }

  if (!authHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Invalid Authorization header format" }),
      { status: 401, headers: jsonHeaders }
    );
  }

  const token = authHeader.substring(7);
  const payload = await verifyJWT(token);
  if (!payload) {
    return new Response(
      JSON.stringify({ error: "Invalid token" }),
      { status: 401, headers: jsonHeaders }
    );
  }

  return null; // Valid token
}
