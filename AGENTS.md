# AGENTS.md

## Figma + Frontend Design System Rules (CandyAI)

These rules define how design work should be translated into code for this codebase.

### Component Organization

- IMPORTANT: Reuse primitives from `src/components/ui/` before creating new UI atoms.
- Dashboard-specific composition belongs in `src/components/dashboard/` and page orchestration in `src/pages/dashboard/`.
- Feature-level logic should remain in page components; shared presentational pieces should be extracted to `src/components/`.
- Use PascalCase component file names and named exports unless the route expects a default export.

### Routing and App Structure

- Route definitions live in `src/App.tsx`.
- Protected dashboard pages must be wrapped by `DashboardRoute` and use `useAuth` + `useIsAdmin` where role gating is needed.
- Avoid redirect thrash: do not add competing role redirects in both route wrappers and page body unless strictly required.

### Styling Rules

- IMPORTANT: Use Tailwind utility classes and existing shadcn patterns; avoid ad-hoc CSS files unless necessary.
- Prefer semantic tokens (`bg-background`, `text-muted-foreground`, `border-border`, etc.) over hardcoded colors.
- For high-emphasis dashboard surfaces, gradients and accent colors are allowed but must preserve readability and contrast.
- Keep spacing on Tailwind scale and preserve mobile-first responsive behavior.

### Data and State Patterns

- Use `supabase` from `src/integrations/supabase/client` for direct reads.
- Use `callAdminControl` style POST calls for privileged mutations via `supabase/functions/admin-control`.
- For bulk operations, compose repeated server calls client-side only when no dedicated bulk endpoint exists.
- Keep async state explicit: `isRefreshing`, `busyAction`, `statusMsg`, and deterministic loading states.

### Admin UX Conventions

- IMPORTANT: Admin pages should separate concerns into tabs/sections, not a single long stack.
- Include at minimum: analytics overview, user management, bulk actions, billing, and exports/reports.
- User management must support search/filter, row focus, and safe destructive-action affordances.
- Login-as-user (impersonation) must require explicit target identity fields and open in a new window.

### Figma MCP Integration Rules

The Figma MCP `create_design_system_rules` tool was unavailable in this session, so these rules were generated from codebase analysis.

Required flow for future Figma-driven tasks:

1. Run `get_design_context` for exact node(s).
2. If payload is large, run `get_metadata`, then narrow `get_design_context` calls.
3. Run `get_screenshot` for visual parity target.
4. Translate output to this repo conventions (React + TypeScript + shadcn + Tailwind).
5. Reuse existing UI primitives from `src/components/ui/`.
6. Validate desktop/mobile parity before completion.

### Asset Handling

- IMPORTANT: If Figma MCP returns localhost asset URLs, use them directly.
- Store static assets in `public/` unless an existing feature directory has an asset convention.
- Do not add new icon libraries for Figma work; prefer existing `lucide-react` usage and Figma-provided assets.

### Accessibility and Quality

- Preserve keyboard accessibility for interactive controls.
- Ensure actionable controls have clear labels and visible focus states.
- Use concise status surfaces for async operations (loading, success, error).
- Run `npm run build` after substantial UI changes; run lint when feasible and report unrelated existing lint debt separately.
