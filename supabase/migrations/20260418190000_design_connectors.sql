create table if not exists public.design_connectors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider_key text not null,
  credential_profile_id uuid not null references public.internal_connector_profiles(id) on delete cascade,
  display_name text not null,
  connection_mode text not null default 'bidirectional',
  sync_scope_type text not null,
  sync_scope_external_id text null,
  sync_scope_label text null,
  is_enabled boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  last_sync_at timestamptz null,
  last_sync_status text null,
  last_error text null,
  created_by_user_id uuid null references public.profiles(user_id) on delete set null,
  updated_by_user_id uuid null references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.part_source_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider_key text not null,
  credential_profile_id uuid null references public.internal_connector_profiles(id) on delete set null,
  design_connector_id uuid null references public.design_connectors(id) on delete set null,
  part_family_id uuid null references public.part_families(id) on delete cascade,
  part_id uuid null references public.parts(id) on delete cascade,
  external_workspace_id text null,
  external_project_id text null,
  external_document_id text null,
  external_item_id text null,
  external_version_id text null,
  external_revision_id text null,
  external_name text null,
  external_url text null,
  sync_mode text not null default 'manual',
  is_bidirectional boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  last_sync_at timestamptz null,
  last_sync_status text null,
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.design_sync_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider_key text not null,
  design_connector_id uuid null references public.design_connectors(id) on delete set null,
  credential_profile_id uuid null references public.internal_connector_profiles(id) on delete set null,
  run_type text not null,
  direction text not null,
  target_ref text null,
  status text not null,
  summary jsonb not null default '{}'::jsonb,
  error_message text null,
  started_at timestamptz not null default now(),
  completed_at timestamptz null,
  triggered_by_user_id uuid null references public.profiles(user_id) on delete set null
);

create table if not exists public.design_sync_run_items (
  id uuid primary key default gen_random_uuid(),
  sync_run_id uuid not null references public.design_sync_runs(id) on delete cascade,
  part_family_id uuid null references public.part_families(id) on delete set null,
  part_id uuid null references public.parts(id) on delete set null,
  part_source_link_id uuid null references public.part_source_links(id) on delete set null,
  external_ref text null,
  action text not null,
  status text not null,
  message text null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.design_connector_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider_key text not null,
  design_connector_id uuid null references public.design_connectors(id) on delete set null,
  credential_profile_id uuid null references public.internal_connector_profiles(id) on delete set null,
  actor_user_id uuid null references public.profiles(user_id) on delete set null,
  event_type text not null,
  target_type text null,
  target_id text null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);