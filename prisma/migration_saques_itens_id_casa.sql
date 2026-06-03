-- ══════════════════════════════════════════════════════════════════
-- MIGRATION: saques_itens — id_contrato → id_casa
-- Tabela vazia (0 registros) — sem necessidade de migrar dados
-- ══════════════════════════════════════════════════════════════════

-- 1. Adicionar nova coluna (nullable primeiro)
ALTER TABLE public.saques_itens
  ADD COLUMN IF NOT EXISTS id_casa UUID REFERENCES public.casas_aposta(id);

-- 2. Remover coluna antiga
ALTER TABLE public.saques_itens
  DROP COLUMN IF EXISTS id_contrato CASCADE;

-- 3. Tornar id_casa NOT NULL
ALTER TABLE public.saques_itens
  ALTER COLUMN id_casa SET NOT NULL;

-- 4. Atualizar índices
DROP INDEX IF EXISTS public.idx_saques_itens_id_contrato;
CREATE INDEX IF NOT EXISTS idx_saques_itens_id_casa
  ON public.saques_itens (id_casa);
