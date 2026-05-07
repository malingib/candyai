# Graph Report - candyai  (2026-05-07)

## Corpus Check
- 123 files · ~104,192 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 272 nodes · 255 edges · 10 communities detected
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 12|Community 12]]

## God Nodes (most connected - your core abstractions)
1. `toast()` - 17 edges
2. `render()` - 6 edges
3. `verifyJWT()` - 5 edges
4. `subscribeRealtime()` - 5 edges
5. `toggle()` - 5 edges
6. `resolveRateLimitFailModeFromEnv()` - 4 edges
7. `runWithProvider()` - 4 edges
8. `chatWithFallback()` - 4 edges
9. `hmacHex()` - 4 edges
10. `ensureConversation()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `toast()` --calls--> `handleDelete()`  [INFERRED]
  src/hooks/use-toast.ts → src/pages/dashboard/Tickets.tsx
- `resolveRateLimitFailModeFromEnv()` --calls--> `resolveRateLimitFailMode()`  [INFERRED]
  supabase/functions/_shared/security-utils.ts → supabase/functions/_shared/enterprise-security.ts
- `toast()` --calls--> `handleAuth()`  [INFERRED]
  src/hooks/use-toast.ts → src/pages/Auth.tsx
- `toast()` --calls--> `handleSave()`  [INFERRED]
  src/hooks/use-toast.ts → src/pages/dashboard/KnowledgeBase.tsx
- `toast()` --calls--> `handleDelete()`  [INFERRED]
  src/hooks/use-toast.ts → src/pages/dashboard/KnowledgeBase.tsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (16): b64ToBytes(), bytesToHex(), distributedRateLimit(), encryptPII(), hmacHex(), modelReport(), parseVerifiedWidgetToken(), providerBlocked() (+8 more)

### Community 1 - "Community 1"
Cohesion: 0.1
Nodes (20): openCreate(), remove(), reset(), save(), handleConvertToTicket(), handleReplyChange(), handleSendReply(), sendTyping() (+12 more)

### Community 2 - "Community 2"
Cohesion: 0.19
Nodes (13): closeLeadForm(), ensureConversation(), escapeHtml(), launcherMarkup(), persistMessage(), postWidget(), render(), renderActions() (+5 more)

### Community 3 - "Community 3"
Cohesion: 0.25
Nodes (5): getJwks(), getSupabaseIssuerFromEnv(), toAudienceArray(), verifyJWT(), verifyTokenInRequest()

### Community 4 - "Community 4"
Cohesion: 0.22
Nodes (5): ProtectedRoute(), EmbedCode(), useToast(), useAuth(), Toaster()

### Community 5 - "Community 5"
Cohesion: 0.32
Nodes (4): clamp(), isAllowedOrigin(), normalizeOrigin(), sanitizeUserMessage()

### Community 6 - "Community 6"
Cohesion: 0.38
Nodes (3): isSensitiveRateLimitKey(), normalizeFailMode(), resolveRateLimitFailModeFromEnv()

### Community 7 - "Community 7"
Cohesion: 0.48
Nodes (5): handleCreate(), handleDelete(), handleUpdate(), notifyEmail(), resetForm()

### Community 8 - "Community 8"
Cohesion: 0.43
Nodes (5): computeSla(), formatDuration(), minutesBetween(), iconFor(), SlaBadge()

### Community 12 - "Community 12"
Cohesion: 0.83
Nodes (3): hmacSha256Hex(), timingSafeEqual(), verifyHmacSignature()

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `toast()` connect `Community 1` to `Community 7`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `useToast()` connect `Community 4` to `Community 1`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Are the 14 inferred relationships involving `toast()` (e.g. with `handleAuth()` and `handleSave()`) actually correct?**
  _`toast()` has 14 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._