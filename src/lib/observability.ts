/**
 * Provider-agnostic error reporting.
 *
 * - ALWAYS emits a single structured JSON line so platform log drains (Vercel,
 *   Datadog, etc.) can index errors instead of them being swallowed by empty
 *   `catch {}` blocks.
 * - Forwards to Sentry IF it is installed and initialised. Sentry registers
 *   itself by setting `globalThis.__roamioSentry` from sentry.server.config.ts /
 *   sentry.client.config.ts (see those files). We never statically import
 *   @sentry/nextjs, so the app builds whether or not Sentry is installed.
 *
 * To activate Sentry: `npm i @sentry/nextjs`, then keep the provided
 * sentry.*.config.ts + instrumentation.ts files. Until then, structured logging
 * is fully active.
 */

type Context = Record<string, unknown>;

interface SentryLike {
  captureException: (e: unknown, hint?: { extra?: Context }) => void;
  captureMessage?: (msg: string, ctx?: Context) => void;
}

function sentry(): SentryLike | null {
  const s = (globalThis as { __roamioSentry?: SentryLike }).__roamioSentry;
  return s && typeof s.captureException === "function" ? s : null;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * Next.js implements redirect(), notFound(), and dynamic-rendering bail-outs by
 * THROWING sentinel "errors" that the framework catches itself. They carry a
 * `digest` marker. These are control flow, not failures — they must propagate
 * untouched and must never be logged/sent to Sentry (otherwise every dynamic
 * page renders a false-positive "error" at build + runtime).
 */
export function isNextControlFlow(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  if (typeof digest !== "string") return false;
  return (
    digest === "DYNAMIC_SERVER_USAGE" ||
    digest === "NEXT_NOT_FOUND" ||
    digest.startsWith("NEXT_REDIRECT")
  );
}

/** Report a caught error with optional structured context. */
export function reportError(error: unknown, context: Context = {}): void {
  if (isNextControlFlow(error)) return; // framework control flow, not an error
  const err = toError(error);
  try {
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        level: "error",
        ts: new Date().toISOString(),
        name: err.name,
        message: err.message,
        stack: err.stack,
        ...context,
      })
    );
  } catch {
    // eslint-disable-next-line no-console
    console.error("reportError serialisation failed", err.message);
  }
  const s = sentry();
  if (s) {
    try {
      s.captureException(err, { extra: context });
    } catch {
      /* never let reporting throw */
    }
  }
}

/** Report a non-fatal warning/event. */
export function reportWarning(message: string, context: Context = {}): void {
  // eslint-disable-next-line no-console
  console.warn(
    JSON.stringify({ level: "warn", ts: new Date().toISOString(), message, ...context })
  );
  const s = sentry();
  if (s?.captureMessage) {
    try {
      s.captureMessage(message, context);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Run a promise, returning `fallback` on failure while reporting the error
 * (replaces the silent `try/catch {}` helpers across server components).
 */
export async function safeAsync<T>(
  p: Promise<T>,
  fallback: T,
  context: Context = {}
): Promise<T> {
  try {
    return await p;
  } catch (e) {
    // Let Next's redirect/notFound/dynamic bail-outs propagate to the framework;
    // swallowing them would break dynamic detection and navigation.
    if (isNextControlFlow(e)) throw e;
    reportError(e, { source: "safeAsync", ...context });
    return fallback;
  }
}
