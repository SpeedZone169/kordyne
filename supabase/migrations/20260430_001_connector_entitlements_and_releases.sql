begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'connector-distributions',
  'connector-distributions',
  false,
  104857600,
  array['application/zip']
)
on conflict (id) do nothing;

create table if not exists public.connector_distribution_releases (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null,
  version text not null,
  storage_bucket text not null default 'connector-distributions',
  storage_path text not null,
  file_name text not null,
  mime_type text not null default 'application/zip',
  size_bytes bigint,
  release_notes text,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (provider_key, version)
);

create table if not exists public.organization_connector_entitlements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider_key text not null,
  is_enabled boolean not null default false,
  allowed_runtime_roles text[] not null default array['admin','engineer']::text[],
  current_release_id uuid null references public.connector_distribution_releases(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (organization_id, provider_key)
);

alter table public.connector_distribution_releases enable row level security;
alter table public.organization_connector_entitlements enable row level security;

drop policy if exists "connector releases authenticated read" on public.connector_distribution_releases;
create policy "connector releases authenticated read"
on public.connector_distribution_releases
for select
to authenticated
using (is_active = true);

drop policy if exists "connector entitlements org members read" on public.organization_connector_entitlements;
create policy "connector entitlements org members read"
on public.organization_connector_entitlements
for select
to authenticated
using (public.is_org_member(organization_id));

drop policy if exists "connector entitlements org admins insert" on public.organization_connector_entitlements;
create policy "connector entitlements org admins insert"
on public.organization_connector_entitlements
for insert
to authenticated
with check (public.is_org_admin(organization_id));

drop policy if exists "connector entitlements org admins update" on public.organization_connector_entitlements;
create policy "connector entitlements org admins update"
on public.organization_connector_entitlements
for update
to authenticated
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

drop policy if exists "connector entitlements org admins delete" on public.organization_connector_entitlements;
create policy "connector entitlements org admins delete"
on public.organization_connector_entitlements
for delete
to authenticated
using (public.is_org_admin(organization_id));

commit;