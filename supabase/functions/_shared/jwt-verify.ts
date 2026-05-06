import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface JwtPayload {
  sub: string;
  exp: number;
  iat: number;
  [key: string]: any;
}

// Function to verify JWT token
export function verifyJWT(token: string): JwtPayload | null {
  try {
    // In a real implementation, you would verify the JWT signature here
    // For now, we'll return a basic implementation that parses the token
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch (e) {
    console.error('JWT verification error:', e);
    return null;
  }
}

// Function to verify JWT token from request
export function verifyTokenInRequest(req: Request): Response | null {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Missing Authorization header" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!authHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Invalid Authorization header format" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const token = authHeader.substring(7);
  const payload = verifyJWT(token);
  if (!payload) {
    return new Response(
      JSON.stringify({ error: "Invalid token" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Check if token is expired
  if (payload.exp && payload.exp < Date.now() / 1000) {
    return new Response(
      JSON.stringify({ error: "Token expired" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  return null; // Valid token
}