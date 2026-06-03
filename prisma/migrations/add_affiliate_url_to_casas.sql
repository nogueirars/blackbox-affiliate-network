-- Add affiliate_url column to casas_aposta
ALTER TABLE public.casas_aposta
  ADD COLUMN IF NOT EXISTS affiliate_url TEXT;
