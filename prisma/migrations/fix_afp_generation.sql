-- Fix: geração automática de AFP em contratos
--
-- Contexto do bug (2026-06-11):
--   * trg_contratos_gera_afp estava DESABILITADO porque fn_gera_afp sobrescrevia
--     incondicionalmente o AFP, destruindo AFPs customizados ("Definir AFP" na UI).
--   * O código (rotas admin/gerar-afp, gerente e intermediário) chama a RPC
--     generate_unique_afp, que nunca foi criada no banco.
--   * Resultado: criar contrato sem AFP violava o NOT NULL de contratos.afp.
--
-- Este script:
--   1. Cria public.generate_unique_afp() — RPC callable que gera AFP único [A-Z0-9]{8}
--   2. Corrige fn_gera_afp para respeitar AFP fornecido (só gera quando NULL)
--   3. Reabilita o trigger trg_contratos_gera_afp como rede de segurança

-- 1. RPC esperada pelo código da aplicação
CREATE OR REPLACE FUNCTION public.generate_unique_afp()
RETURNS varchar
LANGUAGE plpgsql
AS $$
DECLARE
  novo_afp VARCHAR(8);
  existe   BOOLEAN;
BEGIN
  LOOP
    novo_afp := array_to_string(
      ARRAY(
        SELECT substring('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', floor(random() * 36)::int + 1, 1)
        FROM generate_series(1, 8)
      ),
      ''
    );

    SELECT EXISTS (
      SELECT 1 FROM public.contratos WHERE afp = novo_afp
    ) INTO existe;

    EXIT WHEN NOT existe;
  END LOOP;

  RETURN novo_afp;
END;
$$;

-- 2. Trigger function: só gera AFP quando não foi fornecido
CREATE OR REPLACE FUNCTION public.fn_gera_afp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.afp IS NULL OR NEW.afp = '' THEN
    NEW.afp := public.generate_unique_afp();
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Reabilita o trigger (estava com tgenabled = 'D')
ALTER TABLE public.contratos ENABLE TRIGGER trg_contratos_gera_afp;
