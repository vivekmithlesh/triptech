-- =============================================================================
-- Migration 0003 — Shared, DB-backed AI rate limiting + daily cost cap
-- IDEMPOTENT: safe to re-run.
--
-- Replaces the per-process in-memory Map in src/app/api/assistant/route.ts,
-- which is unsafe on serverless (each instance had its own counter, so the
-- effective limit was ~20 * instances and reset on every cold start).
--
-- record_ai_usage() is SECURITY DEFINER and derives the user from auth.uid()
-- itself (the caller cannot spoof a different user). It atomically rolls the
-- per-window + per-day counters under a row lock and returns whether the call
-- is allowed. The table is RLS-locked so clients cannot read or tamper with it.
-- =============================================================================

create table if not exists public.ai_usage (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  day            date        not null default (now() at time zone 'utc')::date,
  daily_count    int         not null default 0,
  window_start   timestamptz not null default now(),
  window_count   int         not null default 0,
  total_messages bigint      not null default 0,
  updated_at     timestamptz not null default now()
);

alter table public.ai_usage enable row level security;

-- No client policies: only record_ai_usage() (SECURITY DEFINER) and the
-- service role touch this table. Lock out the PostgREST roles entirely.
revoke all on public.ai_usage from anon, authenticated;

create or replace function public.record_ai_usage(
  p_max_per_window int,
  p_max_per_day    int,
  p_window_minutes int
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid        := auth.uid();
  v_now    timestamptz := now();
  v_today  date        := (v_now at time zone 'utc')::date;
  v_window interval    := make_interval(mins => greatest(p_window_minutes, 1));
  v_row    public.ai_usage;
  v_retry_day    int;
  v_retry_window int;
begin
  if v_uid is null then
    return jsonb_build_object('allowed', false, 'reason', 'unauthenticated');
  end if;

  insert into public.ai_usage (user_id, day, window_start)
  values (v_uid, v_today, v_now)
  on conflict (user_id) do nothing;

  select * into v_row from public.ai_usage where user_id = v_uid for update;

  -- Roll the daily counter at the UTC date boundary.
  if v_row.day <> v_today then
    v_row.day := v_today;
    v_row.daily_count := 0;
  end if;

  -- Roll the sliding window when it has elapsed.
  if v_now - v_row.window_start >= v_window then
    v_row.window_start := v_now;
    v_row.window_count := 0;
  end if;

  v_retry_window := greatest(
    extract(epoch from (v_row.window_start + v_window - v_now))::int, 1);
  v_retry_day := greatest(
    extract(epoch from (date_trunc('day', v_now) + interval '1 day' - v_now))::int, 1);

  -- Daily cap.
  if v_row.daily_count >= p_max_per_day then
    update public.ai_usage
      set window_start = v_row.window_start, window_count = v_row.window_count,
          day = v_row.day, updated_at = v_now
      where user_id = v_uid;
    return jsonb_build_object(
      'allowed', false, 'reason', 'daily',
      'daily_count', v_row.daily_count, 'retry_after_seconds', v_retry_day);
  end if;

  -- Per-window cap.
  if v_row.window_count >= p_max_per_window then
    update public.ai_usage
      set window_start = v_row.window_start, window_count = v_row.window_count,
          day = v_row.day, updated_at = v_now
      where user_id = v_uid;
    return jsonb_build_object(
      'allowed', false, 'reason', 'window',
      'window_count', v_row.window_count, 'retry_after_seconds', v_retry_window);
  end if;

  -- Allowed: record the message.
  update public.ai_usage
    set day            = v_today,
        daily_count    = v_row.daily_count + 1,
        window_start   = v_row.window_start,
        window_count   = v_row.window_count + 1,
        total_messages = v_row.total_messages + 1,
        updated_at     = v_now
    where user_id = v_uid;

  return jsonb_build_object(
    'allowed', true,
    'daily_count', v_row.daily_count + 1,
    'window_count', v_row.window_count + 1);
end;
$$;

revoke all on function public.record_ai_usage(int, int, int) from anon, public;
grant execute on function public.record_ai_usage(int, int, int) to authenticated;

-- =============================================================================
-- END 0003
-- =============================================================================
