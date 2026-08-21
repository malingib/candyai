import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyJWT } from "../_shared/jwt-verify.ts";
import { getChatwootConfig, upsertContact, createConversation, sendMessage } from "../_shared/chatwoot.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-candyai-internal-secret",
  "Content-Type": "application/json",
};
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: corsHeaders }); }

async function getUserProfile(userId: string) {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const [{ data: authData }, { data: profile }] = await Promise.all([
    supabase.auth.admin.getUserById(userId),
    supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
  ]);
  return { authUser: authData.user, profile };
}

async function authorize(req: Request): Promise<string | null> {
  const internalSecret = Deno.env.get("CHATWOOT_INTERNAL_SECRET");
  if (internalSecret && req.headers.get("x-candyai-internal-secret") === internalSecret) return "internal";
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const claims = await verifyJWT(authHeader.slice(7));
  return claims?.sub ?? null;
}

async function syncProfile(userId: string) {
  const config = getChatwootConfig();
  const { authUser, profile } = await getUserProfile(userId);
  if (!authUser) throw new Error("User not found");
  const metadata = (profile ?? {}) as Record<string, unknown>;
  const email = authUser.email ?? (typeof metadata.email === "string" ? metadata.email : null);
  const name = typeof metadata.full_name === "string" ? metadata.full_name : typeof metadata.name === "string" ? metadata.name : email?.split("@")[0] ?? "CandyAI Customer";
  return upsertContact(config, {
    identifier: userId,
    name,
    email,
    phone_number: typeof metadata.phone === "string" ? metadata.phone : null,
    custom_attributes: {
      candyai_user_id: userId,
      candyai_plan: metadata.plan ?? "free",
      billing_status: metadata.billing_expires_at ? "active" : "trial",
      billing_expires_at: metadata.billing_expires_at ?? null,
      subscription_started_at: metadata.subscription_started_at ?? null,
      chats_limit: metadata.chats_limit ?? null,
      leads_limit: metadata.leads_limit ?? null,
      widget_sites_limit: metadata.widget_sites_limit ?? null,
    },
  });
}

async function syncTicket(userId: string, ticketId: string) {
  const config = getChatwootConfig();
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: ticket, error } = await supabase.from("tickets").select("*").eq("id", ticketId).eq("user_id", userId).single();
  if (error || !ticket) throw new Error("Ticket not found");
  const contact = await syncProfile(userId);
  const conversation = await createConversation(config, contact.id, `candyai-ticket:${ticket.id}`, { candyai_ticket_id: ticket.id, subject: ticket.subject, priority: ticket.priority, status: ticket.status });
  if (ticket.description) await sendMessage(config, conversation.id, ticket.description);
  return { contact, conversation };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await authorize(req);
  if (!auth) return json({ error: "Unauthorized" }, 401);
  try {
    const body = await req.json();
    const action = String(body?.action ?? "");
    if (action === "sync_profile") {
      const userId = auth === "internal" ? String(body.user_id ?? "") : auth;
      if (!userId) return json({ error: "user_id required" }, 400);
      return json({ contact: await syncProfile(userId) });
    }
    if (action === "sync_ticket") {
      const userId = auth === "internal" ? String(body.user_id ?? "") : auth;
      const ticketId = String(body.ticket_id ?? "");
      if (!userId || !ticketId) return json({ error: "user_id and ticket_id required" }, 400);
      return json(await syncTicket(userId, ticketId));
    }
    if (action === "create_conversation") {
      if (auth === "internal") return json({ error: "internal requests cannot create conversations" }, 403);
      const config = getChatwootConfig();
      const contact = await syncProfile(auth);
      const conversation = await createConversation(config, contact.id, `candyai:${auth}`, body.custom_attributes ?? {});
      return json({ contact, conversation });
    }
    if (action === "send_message") {
      if (auth === "internal") return json({ error: "internal requests cannot send messages" }, 403);
      const conversationId = Number(body.conversation_id), content = String(body.content ?? "").trim();
      if (!conversationId || !content) return json({ error: "conversation_id and content required" }, 400);
      return json({ message: await sendMessage(getChatwootConfig(), conversationId, content, Boolean(body.private)) });
    }
    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("chatwoot-sync error", error);
    return json({ error: error instanceof Error ? error.message : "Chatwoot integration failed" }, 500);
  }
});
