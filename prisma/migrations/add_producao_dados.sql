-- Migration: create producao_dados table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.producao_dados (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  data             DATE         NOT NULL,
  id_casa          UUID         NOT NULL REFERENCES public.casas_aposta(id) ON UPDATE NO ACTION,
  id_usuario       UUID         NOT NULL REFERENCES public.users(id)        ON UPDATE NO ACTION,
  cadastros        INTEGER      NOT NULL DEFAULT 0,
  ftds             INTEGER      NOT NULL DEFAULT 0,
  valor_depositos  DECIMAL(14,2) NOT NULL DEFAULT 0,
  redepositos      INTEGER      NOT NULL DEFAULT 0,
  valor_redepositos DECIMAL(14,2) NOT NULL DEFAULT 0,
  total_depositos  INTEGER      NOT NULL DEFAULT 0,
  cpas             INTEGER      NOT NULL DEFAULT 0,
  ngr              DECIMAL(14,2) NOT NULL DEFAULT 0,
  receita_cpa      DECIMAL(14,2) NOT NULL DEFAULT 0,
  receita_rev      DECIMAL(14,2) NOT NULL DEFAULT 0,
  receita_bruta    DECIMAL(14,2) NOT NULL DEFAULT 0,
  origem           TEXT         NOT NULL DEFAULT 'API',
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ,
  UNIQUE (data, id_casa, id_usuario)
);

CREATE INDEX IF NOT EXISTS idx_producao_dados_data     ON public.producao_dados (data DESC);
CREATE INDEX IF NOT EXISTS idx_producao_dados_usuario  ON public.producao_dados (id_usuario);
CREATE INDEX IF NOT EXISTS idx_producao_dados_casa     ON public.producao_dados (id_casa);
