-- Migration: create activity_log table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.activity_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  actor_name  TEXT,
  actor_email TEXT,
  action      TEXT        NOT NULL,
  entity_type TEXT        NOT NULL,
  entity_id   TEXT        NOT NULL,
  details     JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS activity_log_entity_idx    ON public.activity_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS activity_log_actor_idx     ON public.activity_log (actor_id);
CREATE INDEX IF NOT EXISTS activity_log_created_idx   ON public.activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_action_idx    ON public.activity_log (action);

-- RLS: somente admins leem; inserts via service role
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins can read activity_log"
  ON public.activity_log FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
