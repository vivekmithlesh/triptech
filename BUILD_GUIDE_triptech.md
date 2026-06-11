# Roamio — Production Build Guide (for Claude Code)

> **CLAUDE CODE: READ THIS FIRST**
>
> You are building **Roamio** — a real, production-ready, AI-powered travel companion app.
> This is NOT a mock/demo. Every page must use REAL data from a real database and real APIs.
> Build it **brick by brick, in order**. Do ONLY the brick the user names, finish it
> completely, then STOP and tell the user the exact TEST steps. Wait for "next brick".
>
> **Hard rules — never compromise on these:**
> - NO mock data, NO hardcoded fake arrays in final pages. Data comes from Supabase + real APIs.
> - Every feature listed in "CORE FEATURES" below MUST exist by the end.
> - Must work fully on BOTH desktop AND mobile (responsive, tested at 375px and 1280px).
> - Real auth, real place data, real AI (Claude API), real maps + geo-search (PostGIS).
> - Clean, typed, no `any` where avoidable. Handle loading + error + empty states everywhere.
> - The aesthetic is premium, warm and map-first — NOT a plain template.
>
> **What you (Claude Code) DO:** write all code/files, run terminal commands, fix errors,
> explain each step briefly.
> **What you do NOT do (the user does these — marked "USER ACTION"):** create accounts,
> click dashboard buttons, paste secret keys into .env.local, run SQL in the Supabase SQL
> Editor. When a brick needs a USER ACTION, STOP and tell the user clearly.

---

## CORE IDEA (never lose sight of this)
Roamio is an **AI travel companion** that plans your trip, guides you like a local, and
helps you the moment you land somewhere new. Drop a destination, get a smart day-by-day
itinerary on a map, tap any monument to learn its history, and ask an AI guide anything —
all in one app. Its signature feature is the **AI Receptionist + Smart Route Planner**:
tell it where you're going and for how long, and it builds the optimal trip.

## CORE FEATURES (all must exist by the end)
1. Explore map — discover the best places, cafes, hotels, attractions near any point (real, from DB + Places API)
2. Smart multi-day route planner — add places, get an optimised day-by-day itinerary on a map
3. Place Detail "Monument Wikipedia" — tap a place for history, hours, photos, ratings
4. AI Guide + Receptionist — conversational AI (Claude API), grounded in verified data (RAG), voice optional
5. Destination intelligence — weather, best season, active festivals, safety status per destination
6. Festival calendar — world festivals with dates + linked trip ideas
7. Personal dashboard — upcoming trips, saved places, journal, alerts
8. Travel journal — auto trip timeline, photo upload, ratings, "colourless" minimal mode
9. Trip sharing — beautiful shareable itinerary links (growth loop + SEO)
10. Trending destinations — most-saved places, live-updated

## TECH STACK (do not substitute without asking)
Next.js 14 (App Router) + TypeScript · Supabase (Postgres + PostGIS + pgvector + Auth + Storage) ·
Prisma · Tailwind + shadcn/ui · Leaflet + react-leaflet + @turf/turf (free maps, OpenStreetMap) ·
Anthropic Claude API (AI guide/receptionist) · OpenAI embeddings (RAG) ·
framer-motion · React Query · OpenWeather API · Vercel.

> AI note: the AI features run through Next.js **server actions / route handlers** that call the
> Claude API server-side (never expose the key to the browser). RAG uses Supabase `pgvector`.
> No separate Python service needed for v1 — keep it all in Next.js to stay simple and deployable.

## DESIGN SYSTEM (apply everywhere)
- Colors: deep `#13343B`, primary green `#0F9E75`, light `#D4F0E6`, teal `#0F6E56`,
  pale `#9FE1CB`, accent `#5DCAA5`, sky `#378ADD`, sand `#E9C46A`, ink `#0B1F24`
- Font: DM Sans (or Inter). Mood: warm, premium, map-first, wander-inspiring. Generous spacing.
- Every interactive element: hover + focus + active states. Mobile tap targets ≥ 44px.
- Light theme for app pages; rich imagery for hero and place pages.

## BUILD ORDER (NEVER skip — each brick depends on the previous)
```
00 Setup + accounts            08 Explore Map + geo-search (PostGIS)
01 Database schema (PostGIS +   09 Place Detail (real)
   pgvector)                    10 Trip Planner + route optimiser
02 Prisma + Supabase clients    11 Dashboard (real user data)
03 Seed real data (places)      12 AI Guide + Receptionist (Claude + RAG)
04 Real Auth                    13 Festivals + Destination Intelligence
05 Data layer (server actions)  14 Travel Journal + Trip Sharing
06 Design system + layout       15 Polish + Mobile + Deploy
07 Home page (real trending)
```

---

# BRICK 00 — Setup + Accounts

**USER ACTION (browser):**
1. supabase.com → sign in with GitHub → New Project `roamio`, region Singapore/Mumbai, save DB password.
2. vercel.com → sign in with GitHub (used in Brick 15).
3. console.anthropic.com → get an API key (for the AI guide, used in Brick 12).
4. platform.openai.com → get an API key (for embeddings/RAG, used in Brick 12).
5. openweathermap.org → free API key (used in Brick 13).
(No map account needed — Leaflet + OpenStreetMap is free and keyless.)

**Claude Code — run:**
```bash
npx create-next-app@latest roamio --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd roamio
npm install @supabase/supabase-js @supabase/ssr
npm install prisma @prisma/client
npm install leaflet react-leaflet @turf/turf
npm install @anthropic-ai/sdk openai
npm install lucide-react framer-motion clsx tailwind-merge
npm install react-hook-form zod @hookform/resolvers
npm install @tanstack/react-query recharts react-hot-toast date-fns
npm install -D @types/leaflet tsx
npx shadcn@latest init   # Default style, Slate, CSS variables = Yes
npx shadcn@latest add button input card badge dialog sheet tabs select slider progress avatar dropdown-menu accordion sonner skeleton calendar textarea
npm run dev
```

**USER ACTION — create `.env.local` with YOUR values:**
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=...        # Settings -> Database -> pooler URI (6543) + ?pgbouncer=true
DIRECT_URL=...          # direct URI (5432)
ANTHROPIC_API_KEY=...   # Claude API (Brick 12)
OPENAI_API_KEY=...      # embeddings for RAG (Brick 12)
OPENWEATHER_API_KEY=... # destination weather (Brick 13)
# No map token needed! Leaflet + OpenStreetMap is free, no key required.
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**TEST:** localhost:3000 runs clean. `git init && git add . && git commit -m "brick 00"`.

---

# BRICK 01 — Database Schema (PostGIS + pgvector)

**USER ACTION:** Supabase → Database → Extensions → enable **postgis** AND **vector**.

**Claude Code — create `supabase/schema.sql`** (full Postgres + PostGIS + pgvector):
- `profiles` (id refs auth.users, full_name, avatar_url, home_currency default 'INR', preferences jsonb, tripcoins int default 0, created_at)
- `places` (id, name, description, category check [cafe/restaurant/hotel/monument/attraction/viewpoint/beach/park/museum/market], city, state, country, `location geography(Point,4326)`, rating numeric, review_count int, price_level int check 1..4, opening_hours jsonb, is_historic bool, cover_image, images text[], external_ids jsonb, created_at)
- `kb_chunks` (id, place_id refs places null, content text, source text, `embedding vector(1536)`, verified bool default false, created_at) — the AI knowledge base for RAG
- `trips` (id, user_id, title, destination, start_date, end_date, days int, route_geojson jsonb, cover_image, is_public bool default false, share_slug text unique, created_at)
- `trip_items` (id, trip_id, place_id, day_number int, order_index int, arrival_time time, notes, created_at)
- `saved_places` (id, user_id, place_id, unique(user_id,place_id), created_at)
- `journal_entries` (id, user_id, trip_id null, place_id null, body text, rating int, photo_urls text[], visited_at, created_at)
- `festivals` (id, name, description, `location geography(Point,4326)`, city, country, start_date, end_date, significance text, partner_discount jsonb null, created_at)
- `ai_messages` (id, user_id, trip_id null, role check [user/assistant], content text, context jsonb, created_at) — chat history for the AI guide
- `alerts` (id, user_id, type check [festival/price_drop/best_time], filters jsonb, created_at)

Also: GIST indexes on `places.location` + `festivals.location`; btree on `places(category,city,rating desc)` + `trip_items(trip_id,day_number,order_index)`; ivfflat index on `kb_chunks.embedding` (vector_cosine_ops, lists=100); trigger `handle_new_user` → profiles row on new auth.users; RLS on every table (profiles read-all/update-own; places + festivals select by anyone, no public write; kb_chunks select by anyone, no public write; trips select-own OR is_public, CUD own; trip_items/saved_places/journal_entries/ai_messages/alerts own only). Header comment on how to run.

**USER ACTION:** SQL Editor → paste → RUN. Confirm 11 tables + both extensions on.

**TEST:** tables exist, PostGIS + vector on, no errors. `git commit -m "brick 01"`.

---

# BRICK 02 — Prisma + Supabase Clients
**Claude Code:** `prisma/schema.prisma` (postgresql, DATABASE_URL + directUrl); user runs `npx prisma db pull` then `npx prisma generate` (PostGIS + vector cols stay Unsupported). `src/lib/supabase/client.ts`, `server.ts`, `middleware.ts` + `src/middleware.ts`, `src/types/database.ts` (Profile, Place with location `{lat,lng}`, Trip, TripItem, SavedPlace, JournalEntry, Festival, AiMessage + union/enum types).
**TEST:** `prisma db pull` connects, `generate` clean, dev clean. `git commit -m "brick 02"`.

---

# BRICK 03 — Seed Real Data (places)
**Claude Code:** `scripts/seed.ts` (+ `scripts/reset.ts`) using SERVICE_ROLE + dotenv. 3 profiles; ~40 realistic places with accurate lat/lng across popular Indian + global destinations (Jaipur forts, Delhi monuments, Goa beaches, Manali, Varanasi ghats, Bangkok temples, Bali, Paris, Switzerland viewpoints) covering all categories; real Unsplash cover images; `location` via RPC `insert_place` (`ST_SetSRID(ST_MakePoint(lng,lat),4326)`) — provide SQL in `supabase/seed_functions.sql`. Also seed ~10 festivals (Holi, Diwali, La Tomatina, Oktoberfest, Songkran, Carnival) and ~15 `kb_chunks` of verified place history (embeddings generated in Brick 12, leave embedding null for now). Print summary.
**USER ACTION:** run that SQL function, then `npx tsx scripts/seed.ts`.
**TEST:** ~40 place rows with non-null location, ~10 festivals. `git commit -m "brick 03"`.

---

# BRICK 04 — Real Authentication
**USER ACTION:** Supabase → Auth → Providers → enable Email (+ Google optional). URL Config → add localhost:3000.
**Claude Code:** `src/app/auth/page.tsx` (split screen, Login|Sign Up, real signUp with metadata + onboarding preferences capture, signInWithPassword → /dashboard, Google OAuth), `auth/callback/route.ts`, `auth/signout/route.ts`, `src/lib/auth.ts` (getUser, requireUser), `src/components/UserMenu.tsx`. Real Supabase calls only.
**TEST:** signup→confirm→login→/dashboard; auth.users + profiles row created. `git commit -m "brick 04"`.

---

# BRICK 05 — Data Layer (Server Actions)
**Claude Code — `src/lib/actions/`:**
- `places.ts`: getPlaces(filters), getPlacesInBounds(bounds) [RPC ST_Within ST_MakeEnvelope], getPlacesNearby(lat,lng,km) [RPC ST_DWithin], getPlaceById(id), getPlacesByCategory(), getTrendingPlaces() [order by save count].
- `trips.ts`: getMyTrips, getTripById (with joined trip_items + places ordered by day/order), createTrip, addPlaceToTrip, removeTripItem, updateTrip, deleteTrip, getPublicTripBySlug(slug).
- `saved.ts`: toggleSaved, getSavedPlaces. `journal.ts`: createEntry, getMyJournal. `profile.ts`: getMyProfile, updateProfile. `festivals.ts`: getFestivals, getUpcomingFestivals.
- `src/lib/queries.ts`: React Query hooks. For EVERY PostGIS op give SQL; collect in `supabase/functions.sql`. revalidatePath after mutations.
**USER ACTION:** run `supabase/functions.sql`.
**TEST:** functions run; getPlaces returns ~40; getTrendingPlaces works; `npm run build` clean. `git commit -m "brick 05"`.

---

# BRICK 06 — Design System + Layout
**Claude Code:** tailwind brand colors + DM Sans; globals.css utility classes; `src/lib/utils.ts` (formatRating/priceLevel/getCategoryIcon/cn); `src/lib/constants.ts` (categories, popular destinations, vibes, budget bands); `Navbar.tsx` (logo, Explore/Trips/Festivals/Journal, UserMenu, AI Guide button, mobile Sheet); `Footer.tsx`; `PlaceCard.tsx` (REUSABLE, real Place, working Save heart, → /place/[id]); `layout.tsx` (Navbar, Footer, Toaster, React Query provider, metadata).
**TEST:** navbar reflects real auth; PlaceCard real data. `git commit -m "brick 06"`.

---

# BRICK 07 — Home Page (real trending)
**Claude Code — `src/app/page.tsx` Server Component.** Strong warm hero with destination search → /explore. Fetch getTrendingPlaces({limit:8}) + getUpcomingFestivals(3) + real stats. Sections: Hero (`<DestinationSearch/>` client → /explore), Browse by Category (real counts), AI Guide spotlight (→ /assistant), Trending Places (8 real cards), "Plan a trip in 60 seconds" how-it-works, Festival strip (real upcoming), Travel-journal teaser, Testimonials. Server Component; client only for interactive bits; empty state; responsive + framer-motion.
**TEST:** real trending places + festivals; card → /place/[real-id]. `git commit -m "brick 07"`.

---

# BRICK 08 — Explore Map + geo-search (real PostGIS)
**Claude Code:** `PlaceMap.tsx` (react-leaflet + OpenStreetMap tiles, category markers, moveend→onBoundsChange, popup with mini PlaceCard); `src/app/explore/page.tsx` (filters from URL: category, price, rating, historic-only; getPlaces on change; getPlacesInBounds on map move debounced 400ms; list 40% + map 60%; mobile list + Map toggle sheet; filter bar + More Filters Sheet; URL sync; real count; hover↔marker; "Add to trip" quick action on each card; skeletons; empty state). All from DB.
**TEST:** real markers+cards; filters re-query; pan fetches by bounds; mobile toggle. `git commit -m "brick 08"`.

---

# BRICK 09 — Place Detail (real "Monument Wikipedia")
**Claude Code — `src/app/place/[id]/page.tsx`:** getPlaceById; notFound if null; breadcrumb; gallery from real images; Save/Share; LEFT: badges (category, historic), title, address, rating + review_count, price level, description, opening hours, history section (from kb_chunks for this place), Location map on real coords, Nearby places (real), Similar (real). RIGHT sticky: "Add to a trip" (select/create trip → addPlaceToTrip), "Ask the AI guide about this place" (→ /assistant pre-seeded with place context), best-time-to-visit. Mobile sticky bar. generateMetadata for SEO.
**TEST:** real data; add-to-trip inserts a trip_item; Save toggles. `git commit -m "brick 09"`.

---

# BRICK 10 — Trip Planner + route optimiser
**Claude Code — `src/app/trip/[id]/page.tsx`:** requires login; getTripById with items. LEFT: day-by-day list of trip_items (drag to reorder within/between days using @dnd-kit or native DnD; updates order_index/day_number), each item shows place, arrival_time, remove. RIGHT: `PlaceMap` showing the route — fetch an ordered polyline by connecting items per day (use OSRM public routing API `router.project-osrm.org` for the line, or straight lines as fallback), numbered markers, each day a different colour. Top bar: trip title, dates, days, "Optimise route" button.
**Route optimiser:** server action `optimiseTrip(tripId)` — fetch all item coords, build a distance matrix (haversine via @turf/distance), run a simple **nearest-neighbour + 2-opt** heuristic to order places and split across `days` evenly by count/time, respecting opening_hours where present; write back day_number + order_index + route_geojson. Keep it deterministic and fast (no external solver needed for v1).
**TEST:** add places from /place pages → see them here; reorder persists; "Optimise" reorders sensibly and redraws the route. `git commit -m "brick 10"`.

---

# BRICK 11 — Dashboard (real user data)
**Claude Code:** `dashboard/layout.tsx` (sidebar + mobile bottom tabs, requireUser); `dashboard/page.tsx` (real stat cards: trips, saved places, journal entries, tripcoins; upcoming trip card with mini-map; saved places grid; recent journal; quick actions: New Trip, Explore, Ask AI); `dashboard/trips/page.tsx` (all trips, create/delete); `dashboard/saved/page.tsx`; `dashboard/alerts/page.tsx` (create festival/best-time alerts). All real for logged-in user; empty states; responsive.
**TEST:** shows YOUR trips + saved places; create a trip; delete removes from DB. `git commit -m "brick 11"`.

---

# BRICK 12 — AI Guide + Receptionist (Claude API + RAG)
**USER ACTION:** confirm `ANTHROPIC_API_KEY` + `OPENAI_API_KEY` are in `.env.local`.
**Claude Code:**
- `src/lib/ai/embeddings.ts`: `embed(text)` via OpenAI `text-embedding-3-small` (1536 dims).
- `scripts/embed-kb.ts`: one-time — embed every `kb_chunks.content`, write the `embedding` vector. (User runs `npx tsx scripts/embed-kb.ts`.)
- `src/lib/ai/retrieve.ts`: `retrieveChunks(queryVec, k=6)` via RPC `match_kb` (pgvector `<=>` cosine, returns content + source) — SQL in `supabase/ai_functions.sql`.
- `src/app/api/assistant/route.ts` (route handler, server-only, **streams**): take user message + optional place/trip/location context; embed the question; retrieve top-k verified chunks; build a system prompt that says **answer ONLY from the provided context + cite the place, never invent history**; call Claude API with streaming; persist user + assistant turns to `ai_messages`.
- `src/app/assistant/page.tsx`: chat UI (message bubbles, streaming, suggested prompts like "I just landed in Jaipur, what now?", "Plan me 3 days in Goa", place-context chip when arriving from a Place page). Mobile-friendly, autoscroll, loading + error states.
- **Receptionist mode:** a "Just landed" button that asks for the current city and returns a grounded arrival brief (SIM, fair taxi, first food, nearest area to stay, safety) from kb_chunks + live context.
**USER ACTION:** run `supabase/ai_functions.sql`, then `npx tsx scripts/embed-kb.ts`.
**TEST:** ask about a seeded monument → answer is grounded + cites the place; ask something not in KB → it declines/says it doesn't have verified info (no hallucination); messages persist. `git commit -m "brick 12"`.

---

# BRICK 13 — Festivals + Destination Intelligence
**Claude Code:**
- `src/app/festivals/page.tsx`: festival calendar — list + a `PlaceMap` of festival locations from real `festivals` rows; each festival card → linked destination + "Plan a trip around this" (creates a trip seeded with that city + dates).
- `src/lib/actions/weather.ts`: `getDestinationIntel(city, lat, lng)` server action — OpenWeather current + forecast (server-side key), plus best-season hint + active festivals in that window from DB.
- `src/app/destination/[city]/page.tsx`: destination dashboard — current weather, 5-day forecast, best time to visit, active/upcoming festivals, top places (real, by city), a "safety status" placeholder badge (green default; wire a news source post-v1). generateMetadata for SEO.
- Alerts: a daily-style check (server action invoked from dashboard) that matches upcoming festivals to the user's saved destinations and shows a banner.
**USER ACTION:** confirm `OPENWEATHER_API_KEY` is set.
**TEST:** festivals render on map + list; destination page shows real weather + forecast; "plan a trip around this" creates a trip. `git commit -m "brick 13"`.

---

# BRICK 14 — Travel Journal + Trip Sharing
**Claude Code:**
- **Journal:** `src/app/journal/page.tsx` + `dashboard/journal` — auto timeline built from the user's trips + journal_entries; "Add memory" (body, rating, photo upload to Supabase Storage bucket `journal-photos`, link to place/trip); **colourless mode** toggle (CSS grayscale theme stored in profile preferences); "reunion" surfacing if a place_id repeats.
- **Sharing (growth + SEO):** when a trip `is_public` is toggled on, generate a `share_slug`; build a public, no-login page `src/app/t/[slug]/page.tsx` that renders the itinerary beautifully on a map with a subtle "Made with Roamio" mark + "Plan your own trip" CTA → /explore. `generateMetadata` + OG image for nice link previews. This is your viral loop AND your SEO surface.
**USER ACTION:** Supabase → Storage → bucket `journal-photos` (Public).
**TEST:** add a journal memory with a photo → persists + shows in timeline; toggle a trip public → /t/[slug] renders without login and looks great on mobile + link preview. `git commit -m "brick 14"`.

---

# BRICK 15 — Polish + Mobile + Deploy
**Claude Code:** mobile audit 375/768 (overflow, ≥44px taps, 1-col grids, sidebar→bottom tabs, explore list+map toggle, trip planner stacks, assistant chat full-height); skeletons + empty states + `error.tsx` + themed `not-found.tsx`; toasts; SEO (generateMetadata, sitemap.ts including public trips + destination pages, robots.ts, OG, image domains incl. images.unsplash.com + Supabase storage); Cmd+K palette over real places/destinations; rate-limit the assistant route (per-user, Redis or simple in-memory) so AI costs stay sane; `npm run build` fix all errors.
**USER ACTION — deploy:** push to GitHub; Vercel import; add ALL `.env.local` vars to Vercel; Deploy; Supabase Auth URL Config → add Vercel URL; set `NEXT_PUBLIC_APP_URL` to live URL.
**Claude Code — final:** pre-launch checklist for the live URL.
**TEST (live):** signup; explore + geo-search; add places to a trip; optimise route; ask the AI guide; festivals + weather; journal + public share link; all on mobile. `git tag v1.0 && git push --tags`.

---

# AFTER v1.0 (priority)
1. Expand the verified `kb_chunks` KB (more cities → better AI). 2. Voice (Whisper in + ElevenLabs out). 3. Real flight/hotel search (Amadeus) + bookings. 4. Offline mode (cache tiles + trip + recent AI answers). 5. Festival → booking deals with tourism boards. 6. **TripWallet — only with an RBI-licensed PPI partner; do NOT build raw FX yourself.** 7. Loyalty/TripCoins redemption. 8. Mobile app (React Native, reuse types + API). 9. Analytics (PostHog) + admin panel.

> Code is ~20%. The rest is the verified content KB, real users who love it, trust, and distribution.
> Win ONE traveller niche first (e.g. India backpackers), get 100 people who'd be sad if it vanished, then expand.

**Roamio — Travel the world with an AI in your pocket.**
