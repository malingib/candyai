import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyTokenInRequest } from "../_shared/jwt-verify.ts";
import { multiRateLimit, rateLimitedResponse, logRequest } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ISSUE_KEYWORDS = [
  "issue", "problem", "broken", "bug", "error", "not working",
  "doesn't work", "doesnt work", "complaint", "refund", "cancel",
  "urgent", "help me", "stuck", "failed", "can't", "cannot",
  "wrong", "missing", "lost", "support", "fix",
];

const URGENT_KEYWORDS = ["urgent", "asap", "emergency", "immediately", "critical"];
const HIGH_KEYWORDS = ["broken", "down", "lost money", "refund", "can't access"];

function detectIssue(text: string): { isIssue: boolean; priority: "low" | "medium" | "high" | "urgent" } {
  const lower = text.toLowerCase();
  const isIssue = ISSUE_KEYWORDS.some((k) => lower.includes(k));
  let priority: "low" | "medium" | "high" | "urgent" = "medium";
  if (URGENT_KEYWORDS.some((k) => lower.includes(k))) priority = "urgent";
  else if (HIGH_KEYWORDS.some((k) => lower.includes(k))) priority = "high";
  return { isIssue, priority };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const rl = multiRateLimit(req, "auto-create-ticket", {
    ip: { limit: 30, windowMs: 60_000 },
    user: { limit: 60, windowMs: 60_000 },
    session: { limit: 30, windowMs: 60_000 },
  });
  if (!rl.allowed) return rateLimitedResponse("auto-create-ticket", rl.scope!, rl.ctx, corsHeaders);
  const tokenError = verifyTokenInRequest(req);
  if (tokenError) {
    logRequest({ function_name: "auto-create-ticket", event_type: "unauthorized", status_code: 401, ctx: rl.ctx });
    return tokenError;
  }

  try {
    const { conversation_id, message } = await req.json();
    if (!conversation_id || !message) {
      return new Response(JSON.stringify({ error: "conversation_id and message required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const detection = detectIssue(message);
    if (!detection.isIssue) {
      return new Response(JSON.stringify({ created: false, reason: "no_issue_detected" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Avoid duplicates: check if a ticket already exists for this conversation
    const { data: existing } = await supabase
      .from("tickets")
      .select("id")
      .eq("conversation_id", conversation_id)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ created: false, reason: "ticket_exists", ticket_id: existing.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: conv, error: cErr } = await supabase
      .from("conversations")
      .select("user_id, visitor_name, visitor_email")
      .eq("id", conversation_id)
      .single();
    if (cErr || !conv) throw new Error("Conversation not found");

    const subject = message.length > 80 ? message.slice(0, 77) + "..." : message;

    const { data: ticket, error: tErr } = await supabase
      .from("tickets")
      .insert({
        user_id: conv.user_id,
        conversation_id,
        subject,
        description: message,
        priority: detection.priority,
        status: "open",
        customer_name: conv.visitor_name || "",
        customer_email: conv.visitor_email || "",
        tags: ["auto-created", "from-chat"],
      })
      .select("id")
      .single();

    if (tErr) throw tErr;

    // Fire email notification (non-blocking)
    fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-ticket-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ ticket_id: ticket.id, event: "created" }),
    }).catch((e) => console.error("Email notify failed:", e));

    return new Response(JSON.stringify({ created: true, ticket_id: ticket.id, priority: detection.priority }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("auto-create-ticket error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
