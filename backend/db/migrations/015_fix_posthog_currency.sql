-- Fix: PostHog revenue was being double-converted from local currency to USD.
-- RevenueCat sends properties.revenue already in USD, so the conversion was wrong.
-- Wipe all PostHog cache rows + sync_log so the next sync does a full 30-day re-fetch
-- with the corrected code (no currency conversion).
-- Safe to re-run: deletes are idempotent (0 rows on subsequent runs).

DO $$
BEGIN
  -- Only run if there are PostHog rows that might have bad data
  IF EXISTS (SELECT 1 FROM metrics_cache WHERE platform = 'posthog' LIMIT 1) THEN
    DELETE FROM metrics_cache WHERE platform = 'posthog';
    DELETE FROM sync_log WHERE platform = 'posthog';
    RAISE NOTICE 'Cleared PostHog cache for currency fix';
  END IF;
END $$;
