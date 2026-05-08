import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { verifyTokenInRequest } from "../_shared/jwt-verify.ts";
import { multiRateLimit, rateLimitedResponse, logRequest } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type EventType = "created" | "assigned" | "resolved";

const subjects: Record<EventType, (s: string) => string> = {
  created: (s) => `[Ticket Opened] ${s}`,
  assigned: (s) => `[Ticket Assigned] ${s}`,
  resolved: (s) => `[Ticket Resolved] ${s}`,
};

const bodies: Record<EventType, (t: Record<string, unknown>, extra?: string) => string> = {
  created: (t) =>
    `<h2 style="color:#2563eb">A new ticket has been opened</h2>
     <p><strong>Subject:</strong> ${escape(t.subject)}</p>
     <p><strong>Priority:</strong> ${t.priority}</p>
     <p><strong>Status:</strong> ${t.status}</p>
     ${t.description ? `<p><strong>Description:</strong><br>${escape(t.description)}</p>` : ""}
     ${t.customer_name ? `<p><strong>From:</strong> ${escape(t.customer_name)} ${t.customer_email ? `(${escape(t.customer_email)})` : ""}</p>` : ""}`,
  assigned: (t, extra) =>
    `<h2 style="color:#2563eb">Ticket assigned${extra ? ` to ${escape(extra)}` : ""}</h2>
     <p><strong>Subject:</strong> ${escape(t.subject)}</p>
     <p><strong>Priority:</strong> ${t.priority}</p>
     <p><strong>Status:</strong> ${t.status}</p>`,
  resolved: (t) =>
    `<h2 style="color:#16a34a">Ticket resolved ✓</h2>
     <p><strong>Subject:</strong> ${escape(t.subject)}</p>
     ${t.resolution ? `<p><strong>Resolution:</strong><br>${escape(t.resolution)}</p>` : ""}`,
};

function escape(s: string) {
  return String(s ?? "")
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const rl = multiRateLimit(req, "send-ticket-email", {
    ip: { limit: 30, windowMs: 60_000 },
    user: { limit: 60, windowMs: 60_000 },
  });
  if (!rl.allowed) return rateLimitedResponse("send-ticket-email", rl.scope!, rl.ctx, corsHeaders);
  const tokenError = verifyTokenInRequest(req);
  if (tokenError) {
    logRequest({ function_name: "send-ticket-email", event_type: "unauthorized", status_code: 401, ctx: rl.ctx });
    return tokenError;
  }

  try {
    const { ticket_id, event, extra } = await req.json();
    if (!ticket_id || !event) {
      return new Response(JSON.stringify({ error: "ticket_id and event required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: ticket, error: tErr } = await supabase
      .from("tickets")
      .select("*")
      .eq("id", ticket_id)
      .single();
    if (tErr || !ticket) throw new Error("Ticket not found");

    const { data: smtp } = await supabase
      .from("smtp_settings")
      .select("*")
      .eq("user_id", ticket.user_id)
      .maybeSingle();

    if (!smtp || !smtp.host || !smtp.username) {
      console.log("SMTP not configured for user", ticket.user_id);
      return new Response(JSON.stringify({ skipped: "smtp_not_configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Recipients: business owner + customer (if email present)
    const recipients = new Set<string>();
    if (smtp.from_email) recipients.add(smtp.from_email);
    if (ticket.customer_email) recipients.add(ticket.customer_email);
    if (recipients.size === 0) {
      return new Response(JSON.stringify({ skipped: "no_recipients" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = new SMTPClient({
      connection: {
        hostname: smtp.host,
        port: smtp.port || 587,
        tls: smtp.encryption === "ssl" || smtp.encryption === "tls",
        auth: { username: smtp.username, password: smtp.password },
      },
    });

    const subject = subjects[event];
    const html = bodies[event](ticket, extra);

    for (const to of recipients) {
      try {
        await client.send({
          from: smtp.from_email || smtp.username,
          to,
          subject,
          html,
          content: html.replace(/<[^>]+>/g, ""),
        });
      } catch (e) {
        console.error("Send to", to, "failed:", e);
      }
    }

    await client.close();

    return new Response(JSON.stringify({ ok: true, recipients: [...recipients] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});