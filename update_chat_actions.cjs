const fs = require('fs');
let content = fs.readFileSync('supabase/functions/chat/index.ts', 'utf8');

const oldAsyncTasks = `    // Perform critical async tasks before closing connection if possible
    // or use EdgeRuntime.waitUntil for Deno/Supabase if available
    if (!safeDemo && safeConversationId) {
      const lastMsg = truncatedMessages[truncatedMessages.length - 1];
      if (lastMsg && lastMsg.role === "user") {
        const apiKey = Deno.env.get("LOVABLE_API_KEY");
        if (apiKey) {
          // Fire and forget sentiment analysis - but in Deno we should ideally wait
          // or use a separate worker/queue for production reliability.
          // For now we attempt it without blocking the main response.
          (async () => {
            try {
              const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                  model: "google/gemini-2.0-flash",
                  messages: [
                    { role: "system", content: "Classify the sentiment of the following user message as 'positive', 'neutral', or 'negative'. Reply with ONLY the one-word label." },
                    { role: "user", content: lastMsg.content }
                  ],
                  temperature: 0,
                }),
              });
              if (r.ok) {
                const d = await r.json();
                const sentiment = d.choices[0].message.content.toLowerCase().trim();
                if (['positive', 'neutral', 'negative'].includes(sentiment)) {
                  await supabase.from("conversations").update({ sentiment }).eq("id", safeConversationId);
                }
              }
            } catch (e) {
              console.error("Sentiment analysis failed:", e);
            }
          })();
        }
      }
    }`;

const newAsyncTasks = `    // Perform critical async tasks (Sentiment, Lead extraction, Ticket creation)
    if (!safeDemo && safeConversationId) {
      const lastMsg = truncatedMessages[truncatedMessages.length - 1];
      if (lastMsg && lastMsg.role === "user") {
        const apiKey = Deno.env.get("LOVABLE_API_KEY");
        if (apiKey) {
          (async () => {
            try {
              // Analyze message for Sentiment, Leads, and Issues in one pass
              const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": \`Bearer \${apiKey}\`,
                },
                body: JSON.stringify({
                  model: "google/gemini-2.0-flash",
                  messages: [
                    {
                      role: "system",
                      content: \`Extract information from the user message.
                      Reply with a JSON object containing:
                      - sentiment: "positive" | "neutral" | "negative"
                      - leads: object with optional name, email, phone
                      - is_issue: boolean (true if user reports a problem/bug/complaint)
                      Only include fields that are found. No explanation.\`
                    },
                    { role: "user", content: lastMsg.content }
                  ],
                  temperature: 0,
                  response_format: { type: "json_object" }
                }),
              });

              if (r.ok) {
                const data = await r.json();
                const analysis = JSON.parse(data.choices[0].message.content);

                // 1. Update Sentiment
                if (analysis.sentiment) {
                  await supabase.from("conversations").update({ sentiment: analysis.sentiment }).eq("id", safeConversationId);
                }

                // 2. Fluid Lead Capture
                if (analysis.leads && (analysis.leads.name || analysis.leads.email || analysis.leads.phone)) {
                  const { data: profile } = await supabase.from("profiles").select("user_id").eq("user_id", effectiveUserId).single();
                  if (profile) {
                    await supabase.from("leads").upsert({
                      user_id: profile.user_id,
                      conversation_id: safeConversationId,
                      name: analysis.leads.name,
                      email: analysis.leads.email,
                      phone: analysis.leads.phone,
                      notes: "Extracted from chat context."
                    }, { onConflict: 'conversation_id' });
                  }
                }

                // 3. Action AI: Auto-create Ticket
                if (analysis.is_issue) {
                  const adminKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
                  const internalUrl = Deno.env.get("SUPABASE_URL");
                  if (adminKey && internalUrl) {
                    await fetch(\`\${internalUrl}/functions/v1/auto-create-ticket\`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: \`Bearer \${adminKey}\`,
                        apikey: adminKey,
                      },
                      body: JSON.stringify({
                        conversation_id: safeConversationId,
                        message: lastMsg.content
                      }),
                    });
                  }
                }
              }
            } catch (e) {
              console.error("Async background tasks failed:", e);
            }
          })();
        }
      }
    }`;

content = content.replace(oldAsyncTasks, newAsyncTasks);
fs.writeFileSync('supabase/functions/chat/index.ts', content);
