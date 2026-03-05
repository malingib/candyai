import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, demo, user_id } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let knowledgeContext = "";

    // If a user_id is provided, fetch their knowledge base entries for context
    if (user_id && !demo) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: kbEntries } = await supabase
          .from("knowledge_base")
          .select("title, content")
          .eq("user_id", user_id)
          .limit(50);

        if (kbEntries && kbEntries.length > 0) {
          knowledgeContext = "\n\nHere is the business's knowledge base. Use this to answer visitor questions accurately:\n\n" +
            kbEntries.map((e: any) => `### ${e.title}\n${e.content}`).join("\n\n");
        }
      } catch (e) {
        console.error("Failed to fetch knowledge base:", e);
      }
    }

    const systemPrompt = demo
      ? `You are a friendly demo AI agent for Mobiwave AI, a platform that lets Kenyan businesses add AI chat agents to their websites. 
         Answer questions about the product's features: lead capture, email integration, 24/7 AI support, analytics, easy embed.
         Be helpful, concise, and enthusiastic. Use simple language. Keep responses under 100 words.
         If asked about pricing, mention: Free (50 chats/mo), Starter (KES 1,500/mo), Growth (KES 3,500/mo), Enterprise (KES 8,000+/mo).
         Encourage visitors to sign up for free.`
      : `You are a helpful AI assistant for a business website. Answer questions accurately and concisely based on the context provided. 
         If a visitor asks for quotes, pricing, contact, or shows purchase intent, politely collect their name and email.
         Keep responses professional and under 150 words.
         If a visitor wants to speak to a human, let them know they can use the "Talk to Human" button below the chat.${knowledgeContext}`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "AI service unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
