-- ============================================================================
-- Migration 0003 — Duas aprovações DISTINTAS
--   (1) Aprovação de CADASTRO  -> memberships.status  (quem indicou aprova)
--   (2) Qualificação de COMISSÃO -> commission_ledger.status (regra financeira)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. APROVAÇÃO DE CADASTRO
--    Regra: o PAI DIRETO (quem indicou) ou a AGÊNCIA aprova/bloqueia o membro.
--    Via função security definer (não abrimos UPDATE amplo no RLS de memberships).
-- ----------------------------------------------------------------------------
create or replace function app.approve_member(
  p_member_id uuid,
  p_action    text default 'approve'   -- 'approve' | 'block'
) returns void
language plpgsql security definer set search_path = public, app
as $$
declare
  m       record;
  caller  record;
begin
  select * into m from memberships where id = p_member_id;
  if not found then raise exception 'membro % inexistente', p_member_id; end if;

  if m.tenant_id <> app.current_tenant_id() then
    raise exception 'membro fora do tenant ativo';
  end if;

  select * into caller from app.current_membership();

  -- autoridade: agência (super) OU o pai direto do membro
  if not (app.is_agency_admin() or m.parent_id = caller.membership_id) then
    raise exception 'apenas o indicador (pai direto) ou a agencia podem aprovar este cadastro';
  end if;

  if p_action = 'approve' then
    update memberships set status = 'active',  updated_at = now() where id = p_member_id;
  elsif p_action = 'block' then
    update memberships set status = 'blocked', updated_at = now() where id = p_member_id;
  else
    raise exception 'acao invalida: %', p_action;
  end if;

  insert into audit_log(tenant_id, actor_user_id, action, entity, entity_id, after)
  values (m.tenant_id, auth.uid(), 'membership.'||p_action, 'memberships', p_member_id::text,
          jsonb_build_object('status', case when p_action='approve' then 'active' else 'blocked' end,
                             'approved_by', caller.membership_id));
end $$;

-- ----------------------------------------------------------------------------
-- 2. QUALIFICAÇÃO DE COMISSÃO (separada da aprovação de cadastro)
--    Promove pending -> qualified SOMENTE quando:
--      (a) o AFILIADO que produziu está 'active' (cadastro aprovado), E
--      (b) o BENEFICIÁRIO do lançamento está 'active', E
--      (c) passou a janela de retenção (hold) sem estorno.
--    p_hold_days = 0  -> libera assim que o cadastro está aprovado.
--    Rodar via job agendado (n8n) por tenant, ou sob demanda.
-- ----------------------------------------------------------------------------
create or replace function app.qualify_due_commissions(
  p_tenant    uuid,
  p_hold_days int  default 0,
  p_as_of     date default current_date
) returns int
language plpgsql security definer set search_path = public, app
as $$
declare n int;
begin
  update commission_ledger l
     set status = 'qualified'
    from daily_production dp
   where l.production_id = dp.id
     and l.tenant_id = p_tenant
     and l.status = 'pending'
     and (l.prod_date + make_interval(days => p_hold_days))::date <= p_as_of
     and exists (select 1 from memberships mb where mb.id = l.membership_id  and mb.status = 'active') -- beneficiário ativo
     and exists (select 1 from memberships ma where ma.id = dp.membership_id and ma.status = 'active') -- afiliado produtor ativo (cadastro aprovado)
     -- TODO Fase 6: AND NOT EXISTS (estorno/chargeback referente a esta produção)
  ;
  get diagnostics n = row_count;
  return n;
end $$;

-- ============================================================================
-- DEPENDÊNCIA ABERTA: p_hold_days (janela de retenção) é decisão de negócio.
--   0  = paga assim que o cadastro é aprovado (sem proteção a estorno)
--   >0 = segura N dias após a produção (proteção a chargeback)
--   Pode virar config por casa (algumas estornam mais que outras).
-- Pagamento (qualified -> paid) é controlado pela AGÊNCIA na Fase 4, nunca pelo indicador.
-- ============================================================================
