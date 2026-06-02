-- ============================================================================
-- Migration 0002 — Pipeline de apuração
-- import_rows -> daily_production (agregação) -> commission_ledger (cascata)
--
-- REGRA DE DISTRIBUIÇÃO (resposta do cliente):
--   REV = sempre % ; CPA = fixo OU % .
--   O % incide sobre o BRUTO DA CASA (não sobre o valor do pai).
--   Cada nó GANHA = (valor do nó) - (valor do filho imediato na cadeia).
--   A agência recebe o bruto integral e ganha = bruto - valor do filho do topo.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Colunas normalizadas no staging (o parser do app preenche via csv_mappings)
-- ----------------------------------------------------------------------------
alter table import_rows
  add column if not exists registrations  int,
  add column if not exists ftd_count      int,
  add column if not exists ftd_amount     numeric(18,2),
  add column if not exists deposit_amount numeric(18,2),
  add column if not exists cpa_count      int,
  add column if not exists cpa_amount     numeric(18,2),   -- só se a casa enviar o valor
  add column if not exists rev_amount     numeric(18,2);

-- ----------------------------------------------------------------------------
-- 2. AGREGAÇÃO: import_rows (de um lote) -> daily_production
--    Soma por (subid, dia) DENTRO do lote; faz UPSERT com REPLACE por chave
--    (re-subir o mesmo período sobrescreve, não acumula). Resolve subid->afiliado.
--    Roda como service_role (security definer) -> ignora RLS.
-- ----------------------------------------------------------------------------
create or replace function app.aggregate_import_batch(p_batch_id uuid)
returns int
language plpgsql security definer set search_path = public, app
as $$
declare
  v_tenant uuid;
  v_house  uuid;
  v_rows   int;
begin
  select tenant_id, house_id into v_tenant, v_house
    from import_batches where id = p_batch_id;
  if v_tenant is null then
    raise exception 'lote % inexistente', p_batch_id;
  end if;

  insert into daily_production as dp (
    tenant_id, house_id, subid, prod_date, membership_id, membership_path,
    registrations, ftd_count, ftd_amount, deposit_amount,
    cpa_count, cpa_amount, rev_amount, last_import_batch_id, computed_at)
  select
    v_tenant, v_house, ir.subid, ir.prod_date,
    ahl.membership_id, m.node_path,
    coalesce(sum(ir.registrations),0),
    coalesce(sum(ir.ftd_count),0),
    coalesce(sum(ir.ftd_amount),0),
    coalesce(sum(ir.deposit_amount),0),
    coalesce(sum(ir.cpa_count),0),
    nullif(coalesce(sum(ir.cpa_amount),0),0),   -- null = casa não enviou valor de CPA
    coalesce(sum(ir.rev_amount),0),
    p_batch_id, now()
  from import_rows ir
  left join affiliate_house_links ahl
    on ahl.tenant_id = v_tenant and ahl.house_id = v_house and ahl.subid = ir.subid
  left join memberships m on m.id = ahl.membership_id
  where ir.import_batch_id = p_batch_id
    and ir.parse_status <> 'error'
    and ir.subid is not null
    and ir.prod_date is not null
  group by ir.subid, ir.prod_date, ahl.membership_id, m.node_path
  on conflict (tenant_id, house_id, subid, prod_date) do update set
    registrations       = excluded.registrations,
    ftd_count           = excluded.ftd_count,
    ftd_amount          = excluded.ftd_amount,
    deposit_amount      = excluded.deposit_amount,
    cpa_count           = excluded.cpa_count,
    cpa_amount          = excluded.cpa_amount,
    rev_amount          = excluded.rev_amount,
    membership_id       = excluded.membership_id,
    membership_path     = excluded.membership_path,
    last_import_batch_id= excluded.last_import_batch_id,
    computed_at         = now();

  get diagnostics v_rows = row_count;

  -- contabiliza órfãos (subid sem afiliado) no lote
  update import_batches set
    rows_orphan = (select count(*) from daily_production
                    where last_import_batch_id = p_batch_id and membership_id is null)
  where id = p_batch_id;

  return v_rows;
end $$;

-- ----------------------------------------------------------------------------
-- 3. APURAÇÃO: uma linha de daily_production -> commission_ledger
--    Idempotente. Não recalcula produção com comissão já PAGA (reversão = Fase 6).
-- ----------------------------------------------------------------------------
create or replace function app.compute_commission_for_production(p_production_id uuid)
returns void
language plpgsql security definer set search_path = public, app
as $$
declare
  r           record;            -- linha de produção
  v_period    date;
  v_gross_cpa numeric(18,2) := 0;
  v_house_cpa_rate numeric(18,2);
  v_gross_rev numeric(18,2) := 0;
  node        record;            -- nó da cadeia
  a           record;            -- assignment do nó
  v_v         numeric(18,2);     -- valor que o nó recebe
  child_cpa   numeric(18,2) := 0;
  child_rev   numeric(18,2) := 0;
  net         numeric(18,2);
  is_agency   boolean;
begin
  select * into r from daily_production where id = p_production_id;
  if not found or r.membership_id is null then
    return;   -- inexistente ou ÓRFÃO: não apura (admin trata o órfão antes)
  end if;

  if exists (select 1 from commission_ledger
             where production_id = p_production_id and status = 'paid') then
    raise notice 'produção % já tem comissão paga; recálculo ignorado', p_production_id;
    return;
  end if;

  -- idempotência: limpa apuração anterior ainda não paga
  delete from commission_ledger
   where production_id = p_production_id and status in ('pending','qualified');

  v_period    := date_trunc('month', r.prod_date)::date;
  v_gross_rev := coalesce(r.rev_amount, 0);

  -- BRUTO CPA: valor do feed se existir; senão count × taxa do deal
  -- (deal específico do afiliado tem prioridade sobre o default da casa)
  if r.cpa_amount is not null then
    v_gross_cpa := r.cpa_amount;
  else
    select hd.cpa_amount into v_house_cpa_rate
      from house_deals hd
     where hd.tenant_id = r.tenant_id
       and hd.house_id  = r.house_id
       and (hd.membership_id = r.membership_id or hd.membership_id is null)
       and hd.deal_type in ('cpa','hybrid')
       and hd.valid_from <= r.prod_date
       and (hd.valid_to is null or hd.valid_to > r.prod_date)
     order by hd.membership_id nulls last, hd.valid_from desc
     limit 1;
    v_gross_cpa := coalesce(v_house_cpa_rate,0) * coalesce(r.cpa_count,0);
  end if;

  -- percorre do afiliado (folha) até a agência (raiz): ancestrais + o próprio
  for node in
    select m.id, m.role, m.node_path
      from memberships m
     where m.tenant_id = r.tenant_id
       and m.node_path @> r.membership_path     -- ancestral-ou-igual do afiliado
     order by nlevel(m.node_path) desc            -- mais profundo primeiro
  loop
    is_agency := (node.role = 'agency_admin');

    ------------------------------------------------ CPA
    if v_gross_cpa > 0 then
      if is_agency then
        v_v := v_gross_cpa;                       -- agência recebe o bruto
      else
        select value_type, value into a
          from commission_assignments
         where tenant_id = r.tenant_id and membership_id = node.id
           and house_id = r.house_id and basis = 'cpa'
           and valid_from <= r.prod_date
           and (valid_to is null or valid_to > r.prod_date)
         order by valid_from desc limit 1;
        if not found then
          v_v := 0;                               -- gap de config: nó não recebe
        elsif a.value_type = 'fixed' then
          v_v := round(a.value * coalesce(r.cpa_count,0), 2);
        else
          v_v := round(a.value * v_gross_cpa, 2); -- pct sobre o bruto
        end if;
      end if;
      net := v_v - child_cpa;
      if net <> 0 then
        insert into commission_ledger(tenant_id,production_id,house_id,membership_id,
               membership_path,basis,amount,agency_gross,prod_date,period,status)
        values (r.tenant_id,p_production_id,r.house_id,node.id,node.node_path,
               'cpa',net,v_gross_cpa,r.prod_date,v_period,'pending');
      end if;
      child_cpa := v_v;
    end if;

    ------------------------------------------------ REVSHARE (sempre %)
    if v_gross_rev > 0 then
      if is_agency then
        v_v := v_gross_rev;
      else
        select value_type, value into a
          from commission_assignments
         where tenant_id = r.tenant_id and membership_id = node.id
           and house_id = r.house_id and basis = 'revshare'
           and valid_from <= r.prod_date
           and (valid_to is null or valid_to > r.prod_date)
         order by valid_from desc limit 1;
        if not found then
          v_v := 0;
        elsif a.value_type = 'pct' then
          v_v := round(a.value * v_gross_rev, 2);
        else
          v_v := round(a.value, 2);               -- fixed em rev (incomum, mas suportado)
        end if;
      end if;
      net := v_v - child_rev;
      if net <> 0 then
        insert into commission_ledger(tenant_id,production_id,house_id,membership_id,
               membership_path,basis,amount,agency_gross,prod_date,period,status)
        values (r.tenant_id,p_production_id,r.house_id,node.id,node.node_path,
               'revshare',net,v_gross_rev,r.prod_date,v_period,'pending');
      end if;
      child_rev := v_v;
    end if;

  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 4. WRAPPER: apura todas as produções tocadas por um lote
-- ----------------------------------------------------------------------------
create or replace function app.compute_commission_for_batch(p_batch_id uuid)
returns int
language plpgsql security definer set search_path = public, app
as $$
declare pid uuid; n int := 0;
begin
  for pid in
    select id from daily_production
     where last_import_batch_id = p_batch_id and membership_id is not null
  loop
    perform app.compute_commission_for_production(pid);
    n := n + 1;
  end loop;
  return n;
end $$;

-- ============================================================================
-- FLUXO COMPLETO DE UM IMPORT (chamado pelo worker / Edge Function):
--   1. cria import_batches (status 'uploaded')
--   2. parser do app lê o CSV, aplica csv_mappings, grava import_rows normalizado
--   3. select app.aggregate_import_batch(:batch)        -> daily_production
--   4. select app.compute_commission_for_batch(:batch)  -> commission_ledger
--   5. update import_batches set status='committed', committed_at=now()
--
-- VALIDAÇÃO RECOMENDADA (antes de produção): garantir, por (produção), que
--   SUM(ledger.amount por basis) = agency_gross  (a soma da cascata fecha no bruto).
--   Se não fechar -> assignment mal configurado (ex.: filho recebe mais que o pai).
-- ============================================================================
