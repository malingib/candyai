# Graph Report - candyai  (2026-05-21)

## Corpus Check
- 137 files · ~118,149 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 364 nodes · 381 edges · 13 communities detected
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 21|Community 21]]

## God Nodes (most connected - your core abstractions)
1. `toast()` - 19 edges
2. `buildWebsiteData()` - 8 edges
3. `render()` - 7 edges
4. `multiRateLimit()` - 5 edges
5. `ensureConversation()` - 5 edges
6. `subscribeRealtime()` - 5 edges
7. `toggle()` - 5 edges
8. `ErrorBoundary` - 5 edges
9. `reactivateUserAccess()` - 4 edges
10. `stripHtml()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `toast()` --calls--> `handleDelete()`  [INFERRED]
  src/hooks/use-toast.ts → src/pages/dashboard/Tickets.tsx
- `verifyJWT()` --calls--> `ensureAdmin()`  [INFERRED]
  supabase/functions/_shared/jwt-verify.ts → supabase/functions/admin-control/index.ts
- `toast()` --calls--> `handleAuth()`  [INFERRED]
  src/hooks/use-toast.ts → src/pages/Auth.tsx
- `toast()` --calls--> `handleSave()`  [INFERRED]
  src/hooks/use-toast.ts → src/pages/dashboard/KnowledgeBase.tsx
- `toast()` --calls--> `handleCrawl()`  [INFERRED]
  src/hooks/use-toast.ts → src/pages/dashboard/KnowledgeBase.tsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (16): callGatewayWithFallback(), getPreferredModels(), timingSafeEqual(), toHex(), verifyGithubSignature(), verifyJWT(), verifyTokenInRequest(), admin() (+8 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (24): openCreate(), remove(), reset(), save(), handleConvertToTicket(), handleReplyChange(), handleSendReply(), sendTyping() (+16 more)

### Community 2 - "Community 2"
Cohesion: 0.17
Nodes (19): closeLeadForm(), ensureConversation(), escapeHtml(), init(), launcherMarkup(), persistMessage(), postWidget(), render() (+11 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (8): buildWebsiteOverviewResponse(), callGatewayStream(), callProviderWithFallbackStream(), extractWebsiteSections(), getPreferredModels(), sanitizeAssistantContent(), sanitizeSseLine(), toSseResponse()

### Community 4 - "Community 4"
Cohesion: 0.13
Nodes (10): ensureAdmin(), fetchBillingPlan(), processUser(), reactivateUserAccess(), validPlan(), sanitizeMessages(), errorResponse(), isUuid() (+2 more)

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
Cohesion: 0.22
Nodes (2): runAction(), runBulkAction()

### Community 9 - "Community 9"
Cohesion: 0.48
Nodes (5): handleCreate(), handleDelete(), handleUpdate(), notifyEmail(), resetForm()

### Community 10 - "Community 10"
Cohesion: 0.43
Nodes (5): computeSla(), formatDuration(), minutesBetween(), iconFor(), SlaBadge()

### Community 11 - "Community 11"
Cohesion: 0.33
Nodes (1): ErrorBoundary

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (2): formatCycleResetDate(), getCycleResetAt()

## Knowledge Gaps
- **Thin community `Community 8`** (10 nodes): `accountStatus()`, `callAdminControl()`, `clearSelection()`, `csvEscape()`, `exportCsv()`, `runAction()`, `runBulkAction()`, `selectVisibleUsers()`, `toggleUserSelection()`, `Admin.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 11`** (6 nodes): `ErrorBoundary`, `.componentDidCatch()`, `.constructor()`, `.getDerivedStateFromError()`, `.render()`, `ErrorBoundary.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (3 nodes): `formatCycleResetDate()`, `getCycleResetAt()`, `billing-cycle.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `toast()` connect `Community 1` to `Community 9`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Are the 16 inferred relationships involving `toast()` (e.g. with `handleAuth()` and `handleSave()`) actually correct?**
  _`toast()` has 16 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._