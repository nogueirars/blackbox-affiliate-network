-- ============================================================================
-- SaaS White-Label de Afiliados de Apostas — Migration Fases 0 e 1 (REV. 2)
-- Postgres / Supabase. Multi-tenant, RLS por subtree (ltree).
--
-- GRÃO DO DADO (resposta A): o feed das casas vem por (subid, dia, casa).
-- Pode vir somado ou em várias linhas no mesmo dia -> somamos por (subid,dia).
-- NÃO há player-level. Fato canônico = `daily_production`.
-- REV (resposta B): valor JÁ vem da casa -> importado, não calculado.
-- CPA (resposta C): taxa por (casa, afiliado), com default por casa.
-- CPF (resposta E): um cadastro por CPF dentro do tenant.
-- Conta da casa (resposta F): por tenant (namespace de subid por tenant).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. EXTENSÕES
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "ltree";
create extension if not exists "pg_trgm";
create extension if not exists "citext";

create schema if not exists app;

-- ----------------------------------------------------------------------------
-- 1. TIPOS
-- ----------------------------------------------------------------------------
create type app.member_role     as enum ('agency_admin','intermediador','gerente','afiliado');
create type app.tenant_status    as enum ('active','suspended','trial','canceled');
create type app.member_status    as enum ('active','pending','blocked');
create type app.ingest_method    as enum ('csv','api','postback');
create type app.import_status     as enum ('uploaded','mapping','validating','ready','committed','failed');
create type app.deal_type        as enum ('cpa','revshare','hybrid','cpl');
create type app.value_type       as enum ('fixed','pct');
create type app.commission_basis as enum ('cpa','revshare','cpl');
create type app.ledger_status    as enum ('pending','qualified','reversed','paid');

-- ----------------------------------------------------------------------------
-- 2. FUNÇÕES DE CONTEXTO (base do RLS) — tenant_id vem do JWT
-- ----------------------------------------------------------------------------
create or replace function app.current_tenant_id()
returns uuid language sql stable as $$
  select nullif(
    (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id'), ''
  )::uuid
$$;

create or replace function app.current_membership()
returns table (membership_id uuid, role app.member_role, node_path ltree)
language sql stable security definer set search_path = public, app as $$
  select m.id, m.role, m.node_path
  from memberships m
  where m.user_id = auth.uid()
    and m.tenant_id = app.current_tenant_id()
    and m.status = 'active'
  limit 1
$$;

create or replace function app.current_path()
returns ltree language sql stable as $$ select node_path from app.current_membership() $$;

create or replace function app.is_agency_admin()
returns boolean language sql stable as $$
  select coalesce((select role = 'agency_admin' from app.current_membership()), false)
$$;

-- ----------------------------------------------------------------------------
-- 3. FASE 0 — FUNDAÇÃO
-- ----------------------------------------------------------------------------
create table tenants (
  id          uuid primary key default gen_random_uuid(),
  slug        citext not null unique,
  legal_name  text,
  status      app.tenant_status not null default 'trial',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table tenant_branding (
  tenant_id       uuid primary key references tenants(id) on delete cascade,
  company_name    text not null,
  logo_url        text,
  favicon_url     text,
  primary_color   text default '#0F172A',
  email_from      citext,
  whatsapp_sender text,
  updated_at      timestamptz not null default now()
);

create table tenant_domains (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  hostname    citext not null unique,
  is_primary  boolean not null default false,
  verified_at timestamptz,
  created_at  timestamptz not null default now()
);
create index idx_tenant_domains_tenant on tenant_domains(tenant_id);

create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  phone      text,
  created_at timestamptz not null default now()
);

-- Memberships = nós da hierarquia. CPF único por tenant (resposta E).
create table memberships (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete set null,
  role         app.member_role not null,
  parent_id    uuid references memberships(id) on delete restrict,
  node_path    ltree not null,
  display_name text not null,
  cpf          citext,
  status       app.member_status not null default 'pending',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint chk_agency_is_root check (
    (role = 'agency_admin' and parent_id is null) or
    (role <> 'agency_admin' and parent_id is not null)
  )
);
create unique index idx_memberships_user_tenant on memberships(user_id, tenant_id) where user_id is not null;
create unique index idx_memberships_cpf_tenant  on memberships(tenant_id, cpf) where cpf is not null;
create index idx_memberships_tenant on memberships(tenant_id);
create index idx_memberships_parent on memberships(parent_id);
create index idx_memberships_path_gist on memberships using gist (node_path);

create or replace function app.set_membership_path()
returns trigger language plpgsql as $$
declare
  parent_path ltree;
  self_label  text := 'n' || replace(new.id::text, '-', '_');
begin
  if new.parent_id is null then
    new.node_path := self_label::ltree;
  else
    select node_path into parent_path from memberships where id = new.parent_id;
    if parent_path is null then
      raise exception 'parent membership % sem node_path', new.parent_id;
    end if;
    new.node_path := parent_path || self_label::ltree;
  end if;
  return new;
end $$;
create trigger trg_membership_path
  before insert on memberships
  for each row execute function app.set_membership_path();

create table audit_log (
  id            bigint generated always as identity primary key,
  tenant_id     uuid not null,
  actor_user_id uuid,
  action        text not null,
  entity        text not null,
  entity_id     text,
  before        jsonb,
  after         jsonb,
  created_at    timestamptz not null default now()
);
create index idx_audit_tenant_created on audit_log(tenant_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 4. FASE 1 — CASAS, INGESTÃO, PRODUÇÃO DIÁRIA, COMISSÃO, LEDGER
-- ----------------------------------------------------------------------------

-- 4.1 Casas (por tenant — resposta F)
create table houses (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  name       text not null,
  slug       citext not null,
  logo_url   text,
  status     text not null default 'active',
  created_at timestamptz not null default now(),
  unique (tenant_id, slug)
);
create index idx_houses_tenant on houses(tenant_id);

-- 4.2 Conexão da casa (csv ativo no MVP; api/postback estruturados p/ Fase 3)
create table house_connections (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  house_id   uuid not null references houses(id) on delete cascade,
  method     app.ingest_method not null,
  config     jsonb not null default '{}',
  secret_ref text,                              -- referência no Supabase Vault
  status     text not null default 'inactive',
  created_at timestamptz not null default now(),
  unique (tenant_id, house_id, method)
);
create index idx_house_conn_tenant on house_connections(tenant_id);

-- 4.3 Mapeamento de CSV por casa (IA propõe, humano confirma, reusa)
create table csv_mappings (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  house_id       uuid not null references houses(id) on delete cascade,
  source_headers text[] not null,
  column_map     jsonb not null,                -- {"BTAG":"subid","Data":"prod_date","CPAs":"cpa_count","Rev":"rev_amount",...}
  confirmed_by   uuid references auth.users(id),
  confirmed_at   timestamptz,
  created_at     timestamptz not null default now(),
  unique (tenant_id, house_id)
);

-- 4.4 Lotes de importação
create table import_batches (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  house_id     uuid not null references houses(id) on delete cascade,
  filename     text not null,
  storage_path text,
  status       app.import_status not null default 'uploaded',
  period_from  date,
  period_to    date,
  rows_total   int default 0,
  rows_ok      int default 0,
  rows_error   int default 0,
  rows_orphan  int default 0,                    -- subids sem afiliado correspondente
  uploaded_by  uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  committed_at timestamptz
);
create index idx_import_tenant on import_batches(tenant_id, created_at desc);

-- 4.5 Linhas cruas do CSV (staging, auditoria, reagregação)
create table import_rows (
  id              bigint generated always as identity primary key,
  tenant_id       uuid not null references tenants(id) on delete cascade,
  import_batch_id uuid not null references import_batches(id) on delete cascade,
  house_id        uuid not null references houses(id) on delete cascade,
  raw             jsonb not null,                -- linha original
  subid           text,
  prod_date       date,
  parse_status    text not null default 'ok',    -- ok | error | orphan
  parse_error     text,
  created_at      timestamptz not null default now()
);
create index idx_import_rows_batch on import_rows(import_batch_id);
create index idx_import_rows_key on import_rows(tenant_id, house_id, subid, prod_date);

-- 4.6 Vínculo afiliado <-> casa: subid GERADO por nós (chave de conciliação)
create table affiliate_house_links (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  membership_id uuid not null references memberships(id) on delete cascade,
  house_id      uuid not null references houses(id) on delete cascade,
  subid         text not null,
  tracking_url  text,
  created_at    timestamptz not null default now(),
  unique (tenant_id, house_id, subid),
  unique (tenant_id, house_id, membership_id)
);
create index idx_ahl_subid on affiliate_house_links(tenant_id, house_id, subid);

-- 4.7 PRODUÇÃO DIÁRIA (fato canônico) — grão (tenant, casa, subid, dia)
--     Métricas somadas; REV importado da casa; CPA em contagem.
--     membership_path denormalizado p/ RLS de subtree rápido.
create table daily_production (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id) on delete cascade,
  house_id         uuid not null references houses(id) on delete cascade,
  subid            text not null,
  prod_date        date not null,
  membership_id    uuid references memberships(id),     -- resolvido pelo subid (null = órfão)
  membership_path  ltree,                                -- denorm; null se órfão
  -- métricas (resposta A: somadas por subid/dia)
  registrations    int           not null default 0,
  ftd_count        int           not null default 0,
  ftd_amount       numeric(18,2) not null default 0,
  deposit_amount   numeric(18,2) not null default 0,     -- total depositado
  cpa_count        int           not null default 0,
  cpa_amount       numeric(18,2),                         -- valor do CPA se a casa enviar (senão calculado pelo deal)
  rev_amount       numeric(18,2) not null default 0,      -- REV já vem da casa (resposta B)
  currency         char(3)       not null default 'BRL',
  last_import_batch_id uuid references import_batches(id),
  computed_at      timestamptz not null default now(),
  unique (tenant_id, house_id, subid, prod_date)          -- upsert/replace por chave
);
create index idx_dp_tenant_house_date on daily_production(tenant_id, house_id, prod_date);
create index idx_dp_membership on daily_production(tenant_id, membership_id, prod_date);
create index idx_dp_path_gist on daily_production using gist (membership_path);
create index idx_dp_orphan on daily_production(tenant_id) where membership_id is null;

-- 4.8 CAMADA A — Deal da casa (o que a casa paga à AGÊNCIA), versionado.
--     membership_id null = default da casa; preenchido = override por afiliado (resposta C).
create table house_deals (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references tenants(id) on delete cascade,
  house_id           uuid not null references houses(id) on delete cascade,
  membership_id      uuid references memberships(id) on delete cascade,
  deal_type          app.deal_type not null,
  cpa_amount         numeric(18,2),               -- R$ por CPA (cpa/hybrid)
  revshare_pct       numeric(7,4),                -- 0..1 (revshare/hybrid) — uso opcional, REV já importado
  cpl_amount         numeric(18,2),
  qualification      jsonb default '{}',          -- ex: {"min_ftd": 30}
  negative_carryover boolean not null default false,
  valid_from         timestamptz not null default now(),
  valid_to           timestamptz,
  created_by         uuid references auth.users(id),
  created_at         timestamptz not null default now(),
  constraint chk_deal_values check (
    (deal_type = 'cpa'      and cpa_amount is not null) or
    (deal_type = 'revshare' and revshare_pct is not null) or
    (deal_type = 'hybrid'   and cpa_amount is not null) or
    (deal_type = 'cpl'      and cpl_amount is not null)
  )
);
-- no máx 1 deal vigente por (tenant,casa,afiliado-ou-default)
create unique index uniq_house_deal_open
  on house_deals (tenant_id, house_id, coalesce(membership_id,'00000000-0000-0000-0000-000000000000'::uuid))
  where valid_to is null;
create index idx_house_deals_lookup on house_deals(tenant_id, house_id, membership_id, valid_from);

-- 4.9 CAMADA B — Distribuição interna (spread). Valor que o nó (filho) RECEBE.
create table commission_assignments (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  membership_id uuid not null references memberships(id) on delete cascade, -- quem recebe
  house_id      uuid not null references houses(id) on delete cascade,
  basis         app.commission_basis not null,    -- cpa | revshare | cpl
  value_type    app.value_type not null,          -- fixed (R$) ou pct
  value         numeric(18,4) not null,
  valid_from    timestamptz not null default now(),
  valid_to      timestamptz,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now()
);
create unique index uniq_assignment_open
  on commission_assignments(tenant_id, membership_id, house_id, basis) where valid_to is null;
create index idx_assignment_lookup on commission_assignments(tenant_id, house_id, membership_id);

-- 4.10 LEDGER de comissão (apuração append-only). Grão: (produção diária, nó, basis).
create table commission_ledger (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  production_id   uuid not null references daily_production(id) on delete restrict,
  house_id        uuid not null references houses(id) on delete restrict,
  membership_id   uuid not null references memberships(id) on delete restrict, -- beneficiário
  membership_path ltree not null,
  basis           app.commission_basis not null,
  amount          numeric(18,2) not null,            -- devido a este nó
  agency_gross    numeric(18,2),                     -- bruto da agência referente a esta produção
  prod_date       date not null,
  period          date not null,                     -- competência (1º dia do mês)
  status          app.ledger_status not null default 'pending',
  computed_at     timestamptz not null default now(),
  unique (production_id, membership_id, basis)        -- idempotência
);
create index idx_ledger_member_period on commission_ledger(tenant_id, membership_id, period);
create index idx_ledger_path_gist on commission_ledger using gist (membership_path);
create index idx_ledger_status on commission_ledger(tenant_id, status);

-- ----------------------------------------------------------------------------
-- 5. TRIGGERS updated_at
-- ----------------------------------------------------------------------------
create or replace function app.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger trg_tenants_touch     before update on tenants     for each row execute function app.touch_updated_at();
create trigger trg_memberships_touch before update on memberships for each row execute function app.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 6. RLS
-- ----------------------------------------------------------------------------
alter table tenants                enable row level security;
alter table tenant_branding        enable row level security;
alter table tenant_domains         enable row level security;
alter table profiles               enable row level security;
alter table memberships            enable row level security;
alter table audit_log              enable row level security;
alter table houses                 enable row level security;
alter table house_connections      enable row level security;
alter table csv_mappings           enable row level security;
alter table import_batches         enable row level security;
alter table import_rows            enable row level security;
alter table affiliate_house_links  enable row level security;
alter table daily_production       enable row level security;
alter table house_deals            enable row level security;
alter table commission_assignments enable row level security;
alter table commission_ledger      enable row level security;

create policy tenant_select on tenants for select using (id = app.current_tenant_id());

create policy branding_rw on tenant_branding for all
  using (tenant_id = app.current_tenant_id())
  with check (tenant_id = app.current_tenant_id() and app.is_agency_admin());

create policy domains_read on tenant_domains for select using (tenant_id = app.current_tenant_id());
create policy domains_write on tenant_domains for all
  using (tenant_id = app.current_tenant_id() and app.is_agency_admin())
  with check (tenant_id = app.current_tenant_id() and app.is_agency_admin());

create policy profiles_self on profiles for all using (id = auth.uid()) with check (id = auth.uid());

create policy memberships_subtree_select on memberships for select
  using (tenant_id = app.current_tenant_id() and node_path <@ app.current_path());
create policy memberships_admin_write on memberships for all
  using (tenant_id = app.current_tenant_id() and app.is_agency_admin())
  with check (tenant_id = app.current_tenant_id() and app.is_agency_admin());

create policy audit_admin_read on audit_log for select
  using (tenant_id = app.current_tenant_id() and app.is_agency_admin());

create policy houses_read on houses for select using (tenant_id = app.current_tenant_id());
create policy houses_write on houses for all
  using (tenant_id = app.current_tenant_id() and app.is_agency_admin())
  with check (tenant_id = app.current_tenant_id() and app.is_agency_admin());

create policy house_conn_admin on house_connections for all
  using (tenant_id = app.current_tenant_id() and app.is_agency_admin())
  with check (tenant_id = app.current_tenant_id() and app.is_agency_admin());
create policy csv_map_admin on csv_mappings for all
  using (tenant_id = app.current_tenant_id() and app.is_agency_admin())
  with check (tenant_id = app.current_tenant_id() and app.is_agency_admin());
create policy import_admin on import_batches for all
  using (tenant_id = app.current_tenant_id() and app.is_agency_admin())
  with check (tenant_id = app.current_tenant_id() and app.is_agency_admin());
create policy import_rows_admin on import_rows for all
  using (tenant_id = app.current_tenant_id() and app.is_agency_admin())
  with check (tenant_id = app.current_tenant_id() and app.is_agency_admin());

create policy ahl_subtree_read on affiliate_house_links for select
  using (tenant_id = app.current_tenant_id()
    and exists (select 1 from memberships m
                where m.id = affiliate_house_links.membership_id
                  and m.node_path <@ app.current_path()));
create policy ahl_admin_write on affiliate_house_links for all
  using (tenant_id = app.current_tenant_id() and app.is_agency_admin())
  with check (tenant_id = app.current_tenant_id() and app.is_agency_admin());

-- Produção: subtree pelo path denorm; órfãos (sem membership) só p/ admin
create policy dp_subtree_read on daily_production for select
  using (tenant_id = app.current_tenant_id()
    and ( (membership_path is not null and membership_path <@ app.current_path())
       or (membership_path is null and app.is_agency_admin()) ));
-- escrita de produção: service_role (worker de ingestão), sem policy p/ usuário

create policy deals_admin on house_deals for all
  using (tenant_id = app.current_tenant_id() and app.is_agency_admin())
  with check (tenant_id = app.current_tenant_id() and app.is_agency_admin());

create policy assign_subtree_read on commission_assignments for select
  using (tenant_id = app.current_tenant_id()
    and exists (select 1 from memberships m
                where m.id = commission_assignments.membership_id
                  and m.node_path <@ app.current_path()));
create policy assign_admin_write on commission_assignments for all
  using (tenant_id = app.current_tenant_id() and app.is_agency_admin())
  with check (tenant_id = app.current_tenant_id() and app.is_agency_admin());

create policy ledger_subtree_read on commission_ledger for select
  using (tenant_id = app.current_tenant_id() and membership_path <@ app.current_path());

-- ============================================================================
-- PENDENTE p/ a função de apuração (próximo passo): depende da Pergunta D
-- (modelo de distribuição: fixed vs pct, e regra de salto único agência->afiliado).
-- ============================================================================
