import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function isUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}
function clamp(s: unknown, max: number): string {
  return String(s ?? "").slice(0, max);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, business_id } = body;

    if (!isUuid(business_id)) {
      return new Response(JSON.stringify({ error: "invalid business_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify business exists
    const { data: profile } = await supabase
      .from("profiles").select("user_id").eq("user_id", business_id).maybeSingle();
    if (!profile) {
      return new Response(JSON.stringify({ error: "business not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Create or reuse conversation ----
    if (action === "start") {
      const meta = {
        user_agent: clamp(req.headers.get("user-agent"), 500),
        referer: clamp(req.headers.get("referer"), 500),
        started_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from("conversations")
        .insert({ user_id: business_id, status: "active", visitor_metadata: meta })
        .select("id").single();
      if (error) throw error;
      return new Response(JSON.stringify({ conversation_id: data.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Persist a message ----
    if (action === "message") {
      const { conversation_id, role, content } = body;
      if (!isUuid(conversation_id) || !["user", "assistant"].includes(role)) {
        return new Response(JSON.stringify({ error: "invalid input" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = clamp(content, 4000);
      if (!text) return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const { error } = await supabase.from("messages").insert({
        conversation_id, role, content: text,
      });
      if (error) throw error;
      // Touch conversation updated_at
      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversation_id);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Capture a lead ----
    if (action === "lead") {
      const { conversation_id, name, email, phone } = body;
      const cleanName = clamp(name, 100).trim();
      const cleanEmail = clamp(email, 255).trim();
      const cleanPhone = clamp(phone, 30).trim();

      if (!cleanName && !cleanEmail && !cleanPhone) {
        return new Response(JSON.stringify({ error: "at least one field required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return new Response(JSON.stringify({ error: "invalid email" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase.from("leads").insert({
        user_id: business_id,
        conversation_id: isUuid(conversation_id) ? conversation_id : null,
        name: cleanName || null,
        email: cleanEmail || null,
        phone: cleanPhone || null,
        notes: "Captured from embedded widget",
      });
      if (error) throw error;

      // Also save visitor info on conversation
      if (isUuid(conversation_id)) {
        await supabase.from("conversations")
          .update({ visitor_name: cleanName || null, visitor_email: cleanEmail || null })
          .eq("id", conversation_id);
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("widget-conversation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
