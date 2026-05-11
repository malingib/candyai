import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyTokenInRequest } from "../_shared/jwt-verify.ts";
import { multiRateLimit, rateLimitedResponse, logRequest } from "../_shared/rate-limit.ts";

// Function to verify HMAC signature
function verifyHmacSignature(payload: string, signature: string, secret: string): boolean {
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expected = "sha256=" + hmac.digest('hex');
  return expected === signature;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const rl = multiRateLimit(req, "github-webhook", { ip: { limit: 30, windowMs: 60_000 } });
  if (!rl.allowed) return rateLimitedResponse("github-webhook", rl.scope!, rl.ctx, corsHeaders);
  const tokenError = await verifyTokenInRequest(req, corsHeaders);
  if (tokenError) {
    logRequest({ function_name: "github-webhook", event_type: "unauthorized", status_code: 401, ctx: rl.ctx });
    return tokenError;
  }

  try {
    const event = req.headers.get("x-github-event");
    const payload = await req.json();

    if (event !== "pull_request" || !["opened", "synchronize"].includes(payload.action)) {
      return new Response(JSON.stringify({ message: "Ignored event" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pr = payload.pull_request;
    const repo = payload.repository;
    const repoFullName = repo.full_name;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: tokenRows, error: tokenErr } = await supabaseAdmin
      .from("github_tokens")
      .select("*")
      .contains("repos", [repoFullName]);

    if (tokenErr || !tokenRows || tokenRows.length === 0) {
      console.log("No matching token for repo:", repoFullName);
      return new Response(JSON.stringify({ message: "No token configured for this repo" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokenRow = tokenRows[0];
    // For security, we should use the encrypted token from the database
    // The GitHub token should be retrieved through the database with proper decryption
    const githubToken = tokenRow.token;

    // Fetch the PR diff
    const diffResp = await fetch(pr.diff_url, {
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: "application/vnd.github.v3.diff",
      },
    });

    if (!diffResp.ok) {
      const errText = await diffResp.text();
      console.error("Failed to fetch diff:", diffResp.status, errText);
      return new Response(JSON.stringify({ error: "Failed to fetch PR diff" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let diff = await diffResp.text();
    if (diff.length > 15000) {
      diff = diff.slice(0, 15000) + "\n\n... [diff truncated]";
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert code reviewer. Analyze the pull request diff and provide a concise, actionable review. Focus on:
1. **Bugs & Logic Errors** - potential runtime issues
2. **Security** - vulnerabilities, injection, auth issues
3. **Performance** - inefficiencies, N+1 queries
4. **Code Quality** - readability, naming, duplication
5. **Best Practices** - patterns, error handling

Format as markdown. Be specific with line references. If the code looks good, say so briefly. Keep under 800 words.`,
          },
          {
            role: "user",
            content: `PR: ${pr.title}\nDescription: ${pr.body || "No description"}\n\nDiff:\n\`\`\`diff\n${diff}\n\`\`\``,
          },
        ],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI review failed:", aiResp.status, errText);
      return new Response(
        JSON.stringify({ error: "AI review failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResp.json();
    const reviewBody = aiData.choices?.[0]?.message?.content || "Unable to generate review.";

    // Post the review as a PR comment
    const commentResp = await fetch(
      `https://api.github.com/repos/${repoFullName}/issues/${pr.number}/comments`,
      {
        method: "POST",
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          body: `## 🤖 Mobiwave AI Code Review\n\n${reviewBody}\n\n---\n*Automated review by [Mobiwave AI](https://candyai.lovable.app)*`,
        }),
      }
    );

    if (!commentResp.ok) {
      const errText = await commentResp.text();
      console.error("Failed to post comment:", commentResp.status, errText);
      return new Response(JSON.stringify({ error: "Failed to post review comment" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await commentResp.text();

    // Log the review to github_reviews table
    await supabaseAdmin.from("github_reviews").insert({
      user_id: tokenRow.user_id,
      repo: repoFullName,
      pr_number: pr.number,
      pr_title: pr.title || "",
      review_body: reviewBody,
    });

    return new Response(
      JSON.stringify({ success: true, pr: pr.number, repo: repoFullName }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});