begin;

-- 1) internal_resources
create table if not exists public.internal_resources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  name text not null,
  resource_type text not null,
  service_domain text not null,
  status_source text not null default 'manual',
  current_status text not null default 'idle',
  location_label text,
  timezone text,
  active boolean not null default true,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint internal_resources_resource_type_check
    check (
      resource_type in (
        'printer',
        'cnc_machine',
        'cad_seat',
        'scanner',
        'sheet_metal_machine',
        'composites_cell',
        'inspection_station',
        'finishing_station',
        'oven',
        'manual_cell',
        'operator',
        'work_center'
      )
    ),

  constraint internal_resources_service_domain_check
    check (
      service_domain in (
        'additive',
        'cnc',
        'cad',
        'scanning',
        'composites',
        'sheet_metal',
        'qa',
        'finishing',
        'assembly',
        'general'
      )
    ),

  constraint internal_resources_status_source_check
    check (
      status_source in (
        'manual',
        'vendor_api',
        'mtconnect',
        'opc_ua',
        'hybrid'
      )
    ),

  constraint internal_resources_current_status_check
    check (
      current_status in (
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

create index if not exists internal_resources_organization_id_idx
  on public.internal_resources (organization_id);

create index if not exists internal_resources_service_domain_idx
  on public.internal_resources (service_domain);

create index if not exists internal_resources_active_idx
  on public.internal_resources (active);

create unique index if not exists internal_resources_org_name_unique
  on public.internal_resources (organization_id, name);


-- 2) internal_capabilities
create table if not exists public.internal_capabilities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  service_domain text not null,
  code text not null,
  name text not null,
  description text,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint internal_capabilities_service_domain_check
    check (
      service_domain in (
        'additive',
        'cnc',
        'cad',
        'scanning',
        'composites',
        'sheet_metal',
        'qa',
        'finishing',
        'assembly',
        'general'
      )
    )
);

create index if not exists internal_capabilities_organization_id_idx
  on public.internal_capabilities (organization_id);

create index if not exists internal_capabilities_service_domain_idx
  on public.internal_capabilities (service_domain);

create unique index if not exists internal_capabilities_org_code_unique
  on public.internal_capabilities (organization_id, code);


-- 3) internal_resource_capabilities
create table if not exists public.internal_resource_capabilities (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.internal_resources(id) on delete cascade,
  capability_id uuid not null references public.internal_capabilities(id) on delete cascade,
  priority_rank integer,
  throughput_units_per_hour numeric(12,2),
  setup_minutes integer,
  run_minutes_per_unit numeric(12,4),
  minimum_batch_qty integer,
  maximum_batch_qty integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint internal_resource_capabilities_priority_rank_check
    check (priority_rank is null or priority_rank >= 1),

  constraint internal_resource_capabilities_throughput_check
    check (throughput_units_per_hour is null or throughput_units_per_hour >= 0),

  constraint internal_resource_capabilities_setup_minutes_check
    check (setup_minutes is null or setup_minutes >= 0),

  constraint internal_resource_capabilities_run_minutes_per_unit_check
    check (run_minutes_per_unit is null or run_minutes_per_unit >= 0),

  constraint internal_resource_capabilities_minimum_batch_qty_check
    check (minimum_batch_qty is null or minimum_batch_qty >= 1),

  constraint internal_resource_capabilities_maximum_batch_qty_check
    check (maximum_batch_qty is null or maximum_batch_qty >= 1),

  constraint internal_resource_capabilities_batch_order_check
    check (
      minimum_batch_qty is null
      or maximum_batch_qty is null
      or minimum_batch_qty <= maximum_batch_qty
    )
);

create unique index if not exists internal_resource_capabilities_resource_capability_unique
  on public.internal_resource_capabilities (resource_id, capability_id);

create index if not exists internal_resource_capabilities_resource_id_idx
  on public.internal_resource_capabilities (resource_id);

create index if not exists internal_resource_capabilities_capability_id_idx
  on public.internal_resource_capabilities (capability_id);


-- 4) enable RLS
alter table public.internal_resources enable row level security;
alter table public.internal_capabilities enable row level security;
alter table public.internal_resource_capabilities enable row level security;

-- read-only select policies for org members
drop policy if exists internal_resources_select on public.internal_resources;
create policy internal_resources_select
  on public.internal_resources
  for select
  using (public.is_org_member(organization_id));

drop policy if exists internal_capabilities_select on public.internal_capabilities;
create policy internal_capabilities_select
  on public.internal_capabilities
  for select
  using (public.is_org_member(organization_id));

drop policy if exists internal_resource_capabilities_select on public.internal_resource_capabilities;
create policy internal_resource_capabilities_select
  on public.internal_resource_capabilities
  for select
  using (
    exists (
      select 1
      from public.internal_resources r
      where r.id = internal_resource_capabilities.resource_id
        and public.is_org_member(r.organization_id)
    )
  );

commit;