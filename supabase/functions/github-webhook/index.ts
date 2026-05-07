import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { chatWithFallback } from "../_shared/llm-fallback.ts";
import { cacheGet, cachePut, guardrailOutput, hmacHex, logAudit, moderateInput, timingSafeEqual } from "../_shared/enterprise-security.ts";
import { sha256Hex } from "../_shared/cache-key.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-github-event, x-hub-signature-256",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const raw = await req.text();
    const secret = Deno.env.get("GITHUB_WEBHOOK_SECRET") || "";
    const signature = req.headers.get("x-hub-signature-256") || "";
    if (!secret || !signature) {
      return new Response(JSON.stringify({ error: "Webhook secret/signature missing" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const expected = `sha256=${await hmacHex(secret, raw)}`;
    if (!timingSafeEqual(expected, signature)) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = req.headers.get("x-github-event");
    const payload = JSON.parse(raw);

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
      .select("id, user_id, encrypted_token, repos")
      .contains("repos", [repoFullName]);

    if (tokenErr || !tokenRows || tokenRows.length === 0) {
      console.log("No matching token for repo:", repoFullName);
      return new Response(JSON.stringify({ message: "No token configured for this repo" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokenRow = tokenRows[0];
    if (!tokenRow.encrypted_token) {
      await logAudit({
        userId: tokenRow.user_id,
        type: "github_token_missing_encrypted_value",
        severity: "high",
        source: "github-webhook",
        metadata: { repo: repoFullName },
      });
      return new Response(JSON.stringify({ error: "GitHub token is not encrypted/configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: githubToken, error: decryptErr } = await supabaseAdmin.rpc("decrypt_github_token_func", {
      encrypted_token: tokenRow.encrypted_token,
    });
    if (decryptErr || !githubToken) {
      console.error("Failed to decrypt GitHub token:", decryptErr);
      return new Response(JSON.stringify({ error: "GitHub token unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const mod = await moderateInput(diff);
    if (!mod.ok) {
      await logAudit({
        userId: tokenRow.user_id,
        type: "github_review_blocked",
        severity: "high",
        source: "github-webhook",
        metadata: { repo: repoFullName, pr: pr.number, reason: mod.reason },
      });
      return new Response(JSON.stringify({ error: "Diff blocked by safety policy" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cacheKey = await sha256Hex(`${repoFullName}|${pr.number}|${diff}`);
    const cachedReview = await cacheGet(tokenRow.user_id, cacheKey);
    let reviewBody = cachedReview;
    let provider = "cache";
    if (!reviewBody) {
      const { response: aiResp, provider: usedProvider } = await chatWithFallback({
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
      stream: false,
      });
      provider = usedProvider;
      console.log("github-webhook provider:", provider);

      const aiData = await aiResp.json();
      reviewBody = aiData.choices?.[0]?.message?.content || "Unable to generate review.";
      reviewBody = guardrailOutput(reviewBody);
      await cachePut(tokenRow.user_id, cacheKey, provider, reviewBody, Math.ceil(reviewBody.length / 4), 600);
    }

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
    await logAudit({
      userId: tokenRow.user_id,
      type: "github_review_posted",
      severity: "info",
      source: "github-webhook",
      metadata: { repo: repoFullName, pr: pr.number, provider },
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
