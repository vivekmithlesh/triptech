# Error Monitoring

Roamio uses a provider-agnostic reporter at `src/lib/observability.ts`:

- `reportError(error, context)` — always emits a structured JSON log line (indexed
  by Vercel/Datadog/any log drain) and forwards to Sentry **if** it's installed.
- `reportWarning(message, context)` — non-fatal events.
- `safeAsync(promise, fallback, context)` — replaces the old silent `try/catch {}`
  helpers in server components (dashboard, home, journal).

**Structured logging is active right now** with zero extra setup. The steps below
upgrade it to full Sentry capture (client + server + API routes).

## Activate Sentry (one-time)

1. Install the SDK:
   ```bash
   npm i @sentry/nextjs
   ```
2. Rename the provided templates (kept as `.example` so the project builds without
   the package installed):
   ```bash
   mv sentry.client.config.ts.example sentry.client.config.ts
   mv sentry.server.config.ts.example sentry.server.config.ts
   mv sentry.edge.config.ts.example   sentry.edge.config.ts
   mv instrumentation.ts.example      instrumentation.ts
   ```
3. Enable the instrumentation hook in `next.config.mjs` (Next 14):
   ```js
   const nextConfig = {
     experimental: { instrumentationHook: true },
     images: { /* ...existing... */ },
   };
   ```
   (Optional) wrap the export with `withSentryConfig` for source maps — see the
   Sentry docs. Not required for capture to work.
4. Set env vars (`.env.local` + Vercel): `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`,
   `SENTRY_ENVIRONMENT`.

The config templates set `globalThis.__roamioSentry = Sentry` after `init()`, so
`reportError`/`reportWarning` automatically forward to Sentry once activated — no
call-site changes needed.

## Verify

- Visit `/api/health/error?token=...` is **not** shipped (no debug error route by
  design). Instead, trigger the existing error boundary or throw in a server action
  in a staging build and confirm the event appears in Sentry + in the JSON logs.
- In logs, look for lines like:
  `{"level":"error","ts":"...","name":"Error","message":"...","source":"..."}`
