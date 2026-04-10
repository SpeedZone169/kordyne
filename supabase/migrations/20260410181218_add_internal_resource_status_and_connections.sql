begin;

-- 1) internal_resource_connections
create table if not exists public.internal_resource_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  resource_id uuid references public.internal_resources(id) on delete set null,
  provider_key text not null,
  connection_mode text not null,
  display_name text not null,
  vault_secret_name text,
  vault_secret_id text,
  base_url text,
  external_resource_id text,
  sync_enabled boolean not null default true,
  last_sync_at timestamptz,
  last_sync_status text,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint internal_resource_connections_provider_key_check
    check (
      provider_key in (
        'formlabs',
        'markforged',
        'ultimaker',
        'stratasys',
        'hp',
        'mtconnect',
        'opc_ua',
        'manual',
        'other'
      )
    ),

  constraint internal_resource_connections_connection_mode_check
    check (
      connection_mode in (
        'api_key',
        'oauth',
        'agent_url',
        'manual'
      )
    ),

  constraint internal_resource_connections_last_sync_status_check
    check (
      last_sync_status is null
      or last_sync_status in (
        'ok',
        'error',
        'disabled',
        'pending'
      )
    )
);

create index if not exists internal_resource_connections_organization_id_idx
  on public.internal_resource_connections (organization_id);

create index if not exists internal_resource_connections_resource_id_idx
  on public.internal_resource_connections (resource_id);

create index if not exists internal_resource_connections_provider_key_idx
  on public.internal_resource_connections (provider_key);

create unique index if not exists internal_resource_connections_org_display_name_unique
  on public.internal_resource_connections (organization_id, display_name);


-- 2) internal_resource_status_events
create table if not exists public.internal_resource_status_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  resource_id uuid not null references public.internal_resources(id) on delete cascade,
  source text not null,
  status text not null,
  reason_code text,
  reason_detail text,
  effective_at timestamptz not null default now(),
  entered_by_user_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint internal_resource_status_events_source_check
    check (
      source in (
        'manual',
        'integration_sync',
        'system'
      )
    ),

  constraint internal_resource_status_events_status_check
    check (
      status in (
        'idle',
        'queued',
        'running',
        'paused',
        'blocked',
        'maintenance',
        'offline',
        'complete'
      )
    )
);

create index if not exists internal_resource_status_events_organization_id_idx
  on public.internal_resource_status_events (organization_id);

create index if not exists internal_resource_status_events_resource_id_idx
  on public.internal_resource_status_events (resource_id);

create index if not exists internal_resource_status_events_effective_at_idx
  on public.internal_resource_status_events (effective_at desc);

create index if not exists internal_resource_status_events_resource_effective_at_idx
  on public.internal_resource_status_events (resource_id, effective_at desc);


-- 3) internal_resource_constraints
create table if not exists public.internal_resource_constraints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  resource_id uuid not null references public.internal_resources(id) on delete cascade,
  constraint_type text not null,
  constraint_value jsonb not null,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint internal_resource_constraints_constraint_type_check
    check (
      constraint_type in (
        'materials',
        'max_build_volume',
        'max_part_size',
        'tolerance',
        'max_part_weight',
        'certification',
        'shift_rule',
        'custom'
      )
    )
);

create index if not exists internal_resource_constraints_organization_id_idx
  on public.internal_resource_constraints (organization_id);

create index if not exists internal_resource_constraints_resource_id_idx
  on public.internal_resource_constraints (resource_id);

create index if not exists internal_resource_constraints_constraint_type_idx
  on public.internal_resource_constraints (constraint_type);


-- 4) enable RLS
alter table public.internal_resource_connections enable row level security;
alter table public.internal_resource_status_events enable row level security;
alter table public.internal_resource_constraints enable row level security;

-- 5) read-only select policies for org members
drop policy if exists internal_resource_connections_select on public.internal_resource_connections;
create policy internal_resource_connections_select
  on public.internal_resource_connections
  for select
  using (public.is_org_member(organization_id));

drop policy if exists internal_resource_status_events_select on public.internal_resource_status_events;
create policy internal_resource_status_events_select
  on public.internal_resource_status_events
  for select
  using (public.is_org_member(organization_id));

drop policy if exists internal_resource_constraints_select on public.internal_resource_constraints;
create policy internal_resource_constraints_select
  on public.internal_resource_constraints
  for select
  using (public.is_org_member(organization_id));

commit;