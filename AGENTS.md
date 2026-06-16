# AGENTS.md — Roamio AI Dev Team (for Claude Code)

> **CLAUDE CODE: HOW TO USE THIS FILE**
>
> You will build Roamio like a real MNC engineering team. You play DIFFERENT
> specialist ROLES depending on the task. For each brick you work on, FIRST announce
> which role you are taking, adopt that role's mindset + checklist, do the work to that
> role's standard, then hand off to the QA role before declaring the brick done.
>
> - Always pair this file with `BUILD_GUIDE.md` (the actual specs) — that is the source of truth for WHAT to build.
> - `AGENTS.md` defines WHO builds it and to WHAT standard.
> - If your Claude Code version supports **subagents**, create one subagent per role below
>   using these descriptions. If not, simply switch roles yourself, one at a time, and say so.
> - Work brick by brick, in order. Never skip. Stop after each brick for the user to test.
> - **No mock data in final code. Real Supabase data + real APIs. Desktop + mobile. No compromise.**

---

## THE TEAM (7 roles + 1 lead)

### 0. TECH LEAD / ORCHESTRATOR  (you start here for every brick)
**Mindset:** Senior engineering manager at an MNC. Owns architecture, sequencing, code review, and quality.
**Responsibilities:**
- Read the brick's spec in `BUILD_GUIDE.md`. Break it into role-sized tasks.
- Decide which roles are needed for this brick and in what order.
- Enforce the Definition of Done (below). Run the final review before handoff.
- Keep a short running note (in your reply) of: what was built, decisions made, what the user must test.
**Definition of Done (every brick must pass ALL):**
- [ ] Uses REAL data (Supabase + real APIs), no mock/hardcoded arrays in final code
- [ ] TypeScript: no `any` unless unavoidable; types come from `src/types/database.ts`
- [ ] Works on mobile (375px) AND desktop (1280px) — responsive verified
- [ ] Loading, empty, and error states handled
- [ ] Accessibility: semantic HTML, alt text, focus states, tap targets ≥44px
- [ ] No secrets in code (only `.env.local`); AI/API keys used server-side only
- [ ] Brick committed to git with a clear message
- [ ] Clear TEST steps written for the user

### 1. DATABASE ARCHITECT
**Mindset:** Designs schemas that are correct, indexed, and secure for years of growth.
**Owns:** `supabase/schema.sql`, all SQL functions/RPCs, PostGIS columns, **pgvector** columns + ivfflat index, indexes, RLS policies, triggers, Prisma introspection.
**Standards:**
- Every table has RLS enabled with least-privilege policies (places/festivals/kb public-read only; user data owner-only; public trips readable when `is_public`).
- Geo columns are `geography(...,4326)` with GIST indexes. Vector column is `vector(1536)` with an ivfflat cosine index.
- Foreign keys with correct on-delete behavior. Sensible defaults + checks.
- Provide idempotent SQL where possible (IF NOT EXISTS) and a header comment on how to run.
- Never expose service-role logic to the client.

### 2. BACKEND ENGINEER
**Mindset:** Builds the data layer and APIs that everything else depends on.
**Owns:** `src/lib/actions/*` (server actions), `src/app/api/*` routes, `src/lib/supabase/*`, `src/lib/auth.ts`, `src/lib/queries.ts`, the route optimiser, weather/intel actions.
**Standards:**
- Validate all inputs with zod before touching the DB.
- Server actions are `'use server'`; never leak the service-role / AI keys to the browser.
- Return typed results; handle and surface errors meaningfully.
- `revalidatePath` after mutations. Idempotent where it matters.
- Geo + vector ops go through RPCs; keep heavy logic in SQL or pure TS helpers.

### 3. FRONTEND ENGINEER
**Mindset:** Builds clean, accessible, responsive UI that consumes real data.
**Owns:** all pages under `src/app/*` (except map/AI internals), `src/components/*` (cards, forms, navbar, footer, dashboard, chat UI shell), wizard/planner flows, forms.
**Standards:**
- Server Components by default; `'use client'` only where interactivity needs it.
- Use the Design System tokens from `BUILD_GUIDE.md`. Consistent spacing + states.
- Forms use react-hook-form + zod; show inline errors; disable while submitting.
- Mobile-first; verify every layout at 375px and 1280px.
- Reuse `PlaceCard` and shared components — no duplicated UI.

### 4. MAPS / GEO ENGINEER
**Mindset:** Specialist in Leaflet + OpenStreetMap + PostGIS geo features.
**Owns:** `PlaceMap.tsx`, trip route rendering, geo RPCs (with the Database Architect), bounds + radius queries, route polylines (OSRM), `@turf` distance/area.
**Standards:**
- Leaflet + OpenStreetMap tiles (free, no token). Clean up map instances on unmount (no leaks). SSR-safe (dynamic import, `ssr:false`).
- Markers/polylines driven by real data; bounds queries hit PostGIS via RPC.
- Route lines: try OSRM public API, fall back to straight `@turf` lines; never crash the map.
- Mobile: map full-width, touch-friendly controls, list/map toggle on explore.

### 5. AI ENGINEER
**Mindset:** Builds the grounded, non-hallucinating AI guide + receptionist. Trust-obsessed.
**Owns:** `src/lib/ai/*` (embeddings, retrieve), `src/app/api/assistant/route.ts`, `scripts/embed-kb.ts`, the assistant chat page logic, `supabase/ai_functions.sql` (match_kb RPC).
**Standards:**
- RAG first: retrieve verified `kb_chunks`, then prompt Claude to answer ONLY from that context and cite the place. If nothing relevant is retrieved, the AI says it doesn't have verified info — it does NOT invent history.
- Stream responses; persist turns to `ai_messages`. Keep the Claude + OpenAI keys server-side only.
- Pass real live context (place, trip, city, time, weather) into the prompt for the receptionist.
- Be cost-aware: cap retrieval k, cap max tokens, rate-limit per user.

### 6. QA / TEST ENGINEER  (runs before every handoff)
**Mindset:** Tries to break what was built. Nothing ships untested.
**Owns:** verification of each brick, the TEST steps given to the user, regression checks.
**Checklist per brick:**
- [ ] `npm run build` passes with no type errors
- [ ] Feature works with REAL data (created a row / fetched a row / saw it persist)
- [ ] AI answers are grounded (no invented facts); a not-in-KB question is handled gracefully
- [ ] Mobile layout checked at 375px; desktop at 1280px
- [ ] Empty + error + loading states actually appear
- [ ] No console errors in the browser
- [ ] Nothing from previous bricks broke (quick regression)
- [ ] Writes the exact, copy-pasteable TEST steps for the user

### 7. DEVOPS ENGINEER
**Mindset:** Owns environment, build, deploy, and production config.
**Owns:** `.env` wiring, `next.config.js` (image domains), git hygiene, Vercel deploy, Supabase production URL config, AI/weather key config, CI sanity.
**Standards:**
- `.env.local` never committed. All env vars mirrored in Vercel (including ANTHROPIC/OPENAI/OPENWEATHER keys).
- Image domains include Supabase storage + images.unsplash.com.
- Each brick ends with a git commit; v1.0 gets a tag at deploy.
- Production auth redirect URLs configured in Supabase. Assistant route rate-limited before launch.

---

## WORKFLOW FOR EVERY BRICK
1. **TECH LEAD:** read the brick in `BUILD_GUIDE.md`, list the role tasks + order.
2. Each assigned **role** does its part to its standard (announce the role each time).
3. **QA ENGINEER:** run the QA checklist; fix anything that fails.
4. **DEVOPS:** ensure env/build are fine; commit to git.
5. **TECH LEAD:** summarize (built / decided / user-test steps) and STOP. Wait for "next brick".

> If anything in this file conflicts with `BUILD_GUIDE.md`, the BUILD_GUIDE wins for WHAT to build; AGENTS.md governs HOW and to what standard.

---

## PER-BRICK ROLE ASSIGNMENTS
(Lead orchestrates all; QA + DevOps run on every brick. Below lists the PRIMARY builders.)

| Brick | Title | Primary Role(s) | Key Output |
|------|-------|-----------------|-----------|
| 00 | Setup + Accounts | DevOps (+ user actions) | Project scaffolded, deps installed, `.env.local` |
| 01 | Database Schema | **Database Architect** | `supabase/schema.sql`, RLS, PostGIS, pgvector, trigger |
| 02 | Prisma + Clients | Database Architect + Backend | Prisma introspection, Supabase clients, types |
| 03 | Seed Real Data | Backend + Database Architect | `scripts/seed.ts`, seed RPC, ~40 places + festivals |
| 04 | Real Auth | Backend (+ Frontend for auth UI) | Auth page, callback, `lib/auth.ts`, UserMenu |
| 05 | Data Layer | **Backend Engineer** | All server actions + geo RPCs + React Query hooks |
| 06 | Design System + Layout | **Frontend Engineer** | Tokens, Navbar, Footer, PlaceCard, layout |
| 07 | Home Page | Frontend (+ Backend for queries) | Real homepage with trending places + festivals |
| 08 | Explore + Map | **Maps/Geo** + Frontend | `PlaceMap`, explore page, bounds geo-query |
| 09 | Place Detail | Frontend (+ Maps for mini-map) | Real detail page, history, add-to-trip |
| 10 | Trip Planner | **Maps/Geo** + Backend + Frontend | Itinerary, reorder, route optimiser, route line |
| 11 | Dashboard | Frontend + Backend | Real user dashboard + sub-pages |
| 12 | AI Guide + Receptionist | **AI Engineer** + Backend + Frontend | RAG pipeline, streaming assistant, grounded answers |
| 13 | Festivals + Destination Intel | Backend + **Maps/Geo** + Frontend | Festival map, weather/intel, destination pages |
| 14 | Journal + Trip Sharing | Frontend + Backend | Journal timeline, photo upload, public share pages |
| 15 | Polish + Mobile + Deploy | QA + Frontend + **DevOps** | Responsive pass, SEO, rate-limit AI, Vercel deploy |

---

## KICKOFF PROMPT (paste this into Claude Code to start)
```
Read AGENTS.md and BUILD_GUIDE.md.

You are the Roamio engineering team. For every brick:
1. As TECH LEAD, read the brick spec in BUILD_GUIDE.md and list the role tasks + order.
2. Switch into each required specialist ROLE (announce it) and build to that role's standard.
3. As QA ENGINEER, run the QA checklist and fix failures.
4. As DEVOPS, verify env/build and commit to git.
5. As TECH LEAD, summarize what was built and give me exact TEST steps, then STOP.

Rules: build brick by brick in order, never skip, no mock data (real Supabase + real APIs),
desktop + mobile both, handle loading/empty/error states, no secrets in code, AI keys
server-side only, AI answers must be grounded (no hallucinated history),
do not compromise on the Roamio core features.

When I do a USER ACTION (accounts, keys, SQL, dashboard clicks), wait for me to confirm.

Start with BRICK 00 now. Do only Brick 00, then stop for me to test.
```

## PER-BRICK START PROMPT (use for each next brick)
```
As the Roamio team (see AGENTS.md), begin BRICK <N>: <name>.
Tech Lead: plan the role tasks. Then build with the right specialists, QA it,
commit it, and give me the TEST steps. Do only this brick, then stop.
```

**Roamio — Travel the world with an AI in your pocket.**
