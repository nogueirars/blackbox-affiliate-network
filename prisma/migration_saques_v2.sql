-- ══════════════════════════════════════════════════════════════════
-- MIGRATION: saques v2 — multi-casa + saques_itens
-- Rodar ANTES de: npx prisma generate
-- ══════════════════════════════════════════════════════════════════

-- 1. Novo valor no enum (deve ser fora de transação em PG < 12;
--    em PG 14+ pode ficar aqui mas não pode ser usada na mesma tx)
ALTER TYPE public.saque_status ADD VALUE IF NOT EXISTS 'AGUARDANDO_LIBERACAO'
  BEFORE 'AGUARDANDO_NF';

-- 2. Adicionar novas colunas em saques (nullable primeiro para compatibilidade)
ALTER TABLE public.saques
  ADD COLUMN IF NOT EXISTS cnpj         VARCHAR(18)    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS razao_social VARCHAR(200),
  ADD COLUMN IF NOT EXISTS telefone     VARCHAR(20),
  ADD COLUMN IF NOT EXISTS montante     DECIMAL(15, 2);

-- 3. Migrar valor → montante para rows existentes
UPDATE public.saques
SET montante = valor
WHERE montante IS NULL;

-- 4. Tornar montante NOT NULL (todos os rows já têm valor após step 3)
ALTER TABLE public.saques
  ALTER COLUMN montante SET NOT NULL;

-- 5. Remover DEFAULT vazio do cnpj (novo código sempre passa cnpj)
ALTER TABLE public.saques
  ALTER COLUMN cnpj DROP DEFAULT;

-- 6. Criar tabela saques_itens
CREATE TABLE IF NOT EXISTS public.saques_itens (
  id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  id_saque    UUID           NOT NULL REFERENCES public.saques(id) ON DELETE CASCADE,
  id_contrato UUID           NOT NULL REFERENCES public.contratos(id),
  montante    DECIMAL(15, 2) NOT NULL CHECK (montante >= 0),
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- 7. Migrar dados existentes — cada saque antigo tinha 1 contrato
INSERT INTO public.saques_itens (id_saque, id_contrato, montante)
SELECT s.id, s.id_contrato, s.valor
FROM public.saques s
WHERE s.id_contrato IS NOT NULL
ON CONFLICT DO NOTHING;

-- 8. Remover colunas deprecated de saques
ALTER TABLE public.saques
  DROP COLUMN IF EXISTS id_contrato CASCADE,
  DROP COLUMN IF EXISTS pix_key_type CASCADE,
  DROP COLUMN IF EXISTS valor CASCADE;

-- 9. Indexes
CREATE INDEX IF NOT EXISTS idx_saques_itens_id_saque
  ON public.saques_itens (id_saque);

CREATE INDEX IF NOT EXISTS idx_saques_itens_id_contrato
  ON public.saques_itens (id_contrato);

-- 10. Row Level Security (herda configuração do schema — ajustar se necessário)
ALTER TABLE public.saques_itens ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO (opcional — rodar separado após migração)
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'saques' AND table_schema = 'public';
-- SELECT COUNT(*) FROM public.saques_itens;
-- ══════════════════════════════════════════════════════════════════
