-- Fix: PostHog revenue was being double-converted from local currency to USD.
-- RevenueCat sends properties.revenue already in USD, so the conversion was wrong.
-- Wipe all PostHog cache rows + sync_log so the next sync does a full 30-day re-fetch
-- with the corrected code (no currency conversion).

DELETE FROM metrics_cache WHERE platform = 'posthog';
DELETE FROM sync_log WHERE platform = 'posthog';
