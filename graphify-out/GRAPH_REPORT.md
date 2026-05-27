# Graph Report - candyai  (2026-05-28)

## Corpus Check
- 145 files · ~122,289 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 401 nodes · 430 edges · 16 communities detected
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 25|Community 25]]

## God Nodes (most connected - your core abstractions)
1. `toast()` - 20 edges
2. `buildWebsiteData()` - 8 edges
3. `render()` - 7 edges
4. `multiRateLimit()` - 5 edges
5. `searchKnowledgeBase()` - 5 edges
6. `isQdrantConfigured()` - 5 edges
7. `ensureConversation()` - 5 edges
8. `subscribeRealtime()` - 5 edges
9. `toggle()` - 5 edges
10. `ErrorBoundary` - 5 edges

## Surprising Connections (you probably didn't know these)
- `toast()` --calls--> `handleDelete()`  [INFERRED]
  src/hooks/use-toast.ts → src/pages/dashboard/Tickets.tsx
- `getEmbedding()` --calls--> `searchKnowledgeBase()`  [INFERRED]
  supabase/functions/_shared/embeddings.ts → supabase/functions/_shared/vector-search.ts
- `getEmbedding()` --calls--> `searchKnowledgeBase()`  [INFERRED]
  supabase/functions/_shared/ai.ts → supabase/functions/_shared/vector-search.ts
- `verifyJWT()` --calls--> `ensureAdmin()`  [INFERRED]
  supabase/functions/_shared/jwt-verify.ts → supabase/functions/admin-control/index.ts
- `toast()` --calls--> `handleAuth()`  [INFERRED]
  src/hooks/use-toast.ts → src/pages/Auth.tsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (14): timingSafeEqual(), toHex(), verifyGithubSignature(), verifyJWT(), verifyTokenInRequest(), admin(), check(), getClientIp() (+6 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (25): openCreate(), remove(), reset(), save(), handleConvertToTicket(), handleReplyChange(), handleSendReply(), sendTyping() (+17 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (13): sanitizeMessages(), getOverlap(), smartChunk(), getEmbedding(), getEmbedding(), errorResponse(), jsonResponse(), sanitize() (+5 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (10): buildTenderAvailabilityResponse(), buildWebsiteOverviewResponse(), callGatewayStream(), callProviderWithFallbackStream(), extractTenderLines(), extractWebsiteSections(), getPreferredModels(), sanitizeAssistantContent() (+2 more)

### Community 4 - "Community 4"
Cohesion: 0.17
Nodes (19): closeLeadForm(), ensureConversation(), escapeHtml(), init(), launcherMarkup(), persistMessage(), postWidget(), render() (+11 more)

### Community 5 - "Community 5"
Cohesion: 0.17
Nodes (6): ProtectedRoute(), useAuth(), useIsAdmin(), UserOnlyRoute(), isLikelyStaleChunkError(), tryRecoverFromStaleChunk()

### Community 6 - "Community 6"
Cohesion: 0.33
Nodes (10): beginSupabaseDebug(), createId(), emit(), finishSupabaseDebug(), formatError(), getSupabaseClient(), logSupabaseDebug(), pushEntry() (+2 more)

### Community 7 - "Community 7"
Cohesion: 0.36
Nodes (8): buildWebsiteData(), discoverPages(), ensureWebsiteData(), extractMeta(), extractTitle(), fetchText(), pageLabel(), stripHtml()

### Community 8 - "Community 8"
Cohesion: 0.29
Nodes (6): ensureAdmin(), fetchBillingPlan(), processUser(), reactivateUserAccess(), validPlan(), isUuid()

### Community 9 - "Community 9"
Cohesion: 0.22
Nodes (2): callGatewayWithFallback(), getPreferredModels()

### Community 10 - "Community 10"
Cohesion: 0.22
Nodes (2): runAction(), runBulkAction()

### Community 12 - "Community 12"
Cohesion: 0.48
Nodes (5): handleCreate(), handleDelete(), handleUpdate(), notifyEmail(), resetForm()

### Community 13 - "Community 13"
Cohesion: 0.43
Nodes (5): computeSla(), formatDuration(), minutesBetween(), iconFor(), SlaBadge()

### Community 14 - "Community 14"
Cohesion: 0.6
Nodes (5): isQdrantConfigured(), qdrantDeleteCollection(), qdrantEnsureCollection(), qdrantSearch(), qdrantUpsert()

### Community 15 - "Community 15"
Cohesion: 0.33
Nodes (1): ErrorBoundary

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (2): formatCycleResetDate(), getCycleResetAt()

## Knowledge Gaps
- **Thin community `Community 9`** (10 nodes): `callGatewayWithFallback()`, `getPreferredModels()`, `getProviderConfig()`, `sanitizeMessages()`, `getPlanLimits()`, `executeToolCall()`, `supabase()`, `index.ts`, `rate-limit-plan.ts`, `tools.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 10`** (10 nodes): `accountStatus()`, `callAdminControl()`, `clearSelection()`, `csvEscape()`, `exportCsv()`, `runAction()`, `runBulkAction()`, `selectVisibleUsers()`, `toggleUserSelection()`, `Admin.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (6 nodes): `ErrorBoundary`, `.componentDidCatch()`, `.constructor()`, `.getDerivedStateFromError()`, `.render()`, `ErrorBoundary.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (3 nodes): `formatCycleResetDate()`, `getCycleResetAt()`, `billing-cycle.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `toast()` connect `Community 1` to `Community 12`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Are the 17 inferred relationships involving `toast()` (e.g. with `handleAuth()` and `handleSave()`) actually correct?**
  _`toast()` has 17 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `searchKnowledgeBase()` (e.g. with `getEmbedding()` and `getEmbedding()`) actually correct?**
  _`searchKnowledgeBase()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._