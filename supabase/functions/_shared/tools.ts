import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface ToolParameter {
  type: string;
  description: string;
  enum?: string[];
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, ToolParameter>;
      required?: string[];
    };
  };
}

export type ToolHandler = (args: Record<string, unknown>, ctx: ToolContext) => Promise<string>;

export interface ToolContext {
  userId: string;
  supabaseUrl: string;
  supabaseKey: string;
}

const supabase = (ctx: ToolContext) =>
  createClient(ctx.supabaseUrl, ctx.supabaseKey);

const handlers: Record<string, ToolHandler> = {
  get_analytics: async (_args, ctx) => {
    const { data } = await supabase(ctx)
      .from("conversations")
      .select("id, created_at, sentiment")
      .eq("user_id", ctx.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (!data || data.length === 0) return "No conversation data available.";
    const total = data.length;
    const positive = data.filter((c: { sentiment?: string }) => c.sentiment === "positive").length;
    const negative = data.filter((c: { sentiment?: string }) => c.sentiment === "negative").length;
    const neutral = data.filter((c: { sentiment?: string }) => c.sentiment === "neutral").length;
    return `Analytics (last ${total} conversations): ${positive} positive, ${neutral} neutral, ${negative} negative.`;
  },

  get_tickets: async (_args, ctx) => {
    const { data } = await supabase(ctx)
      .from("tickets")
      .select("id, subject, status, priority, created_at")
      .eq("user_id", ctx.userId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (!data || data.length === 0) return "No tickets found.";
    return data.map((t: { subject?: string; status?: string; priority?: string }) =>
      `- ${t.subject ?? "Untitled"} [${t.status ?? "unknown"}] priority: ${t.priority ?? "none"}`
    ).join("\n");
  },

  get_contacts: async (_args, ctx) => {
    const { data } = await supabase(ctx)
      .from("leads")
      .select("email, phone, created_at")
      .eq("user_id", ctx.userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (!data || data.length === 0) return "No contacts/leads found.";
    return data.map((l: { email?: string; phone?: string }) =>
      `- ${l.email ?? "no email"} / ${l.phone ?? "no phone"}`
    ).join("\n");
  },

  get_billing_info: async (_args, ctx) => {
    const { data: profile } = await supabase(ctx)
      .from("profiles")
      .select("plan")
      .eq("user_id", ctx.userId)
      .single();
    if (!profile) return "No billing info found.";
    const { data: plan } = await supabase(ctx)
      .from("billing_plans")
      .select("display_name, amount_kes, chats_limit")
      .eq("plan", profile.plan)
      .maybeSingle();
    if (!plan) return `Current plan: ${profile.plan}.`;
    return `Current plan: ${plan.display_name} (KES ${plan.amount_kes}/mo, ${plan.chats_limit} chats/mo).`;
  },
};

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "get_analytics",
      description: "Get conversation analytics summary (positive/neutral/negative sentiment counts)",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_tickets",
      description: "Get recent support tickets",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_contacts",
      description: "Get recent contacts/leads with email and phone",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_billing_info",
      description: "Get current billing plan and usage info",
      parameters: { type: "object", properties: {} },
    },
  },
];

export async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<string> {
  const handler = handlers[toolName];
  if (!handler) return `Error: unknown tool "${toolName}"`;
  try {
    return await handler(args, ctx);
  } catch (e) {
    console.error(`Tool ${toolName} error:`, e);
    return `Error executing ${toolName}: ${e instanceof Error ? e.message : "Unknown error"}`;
  }
}
