begin;

create table if not exists public.internal_connector_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider_key text not null check (
    provider_key = any (
      array[
        'formlabs'::text,
        'markforged'::text,
        'ultimaker'::text,
        'stratasys'::text,
        'hp'::text,
        'mtconnect'::text,
        'opc_ua'::text,
        'manual'::text,
        'other'::text
      ]
    )
  ),
  display_name text not null,
  client_id text not null,
  client_secret_ciphertext text not null,
  client_secret_iv text not null,
  client_secret_tag text not null,
  last_tested_at timestamp with time zone null,
  last_test_status text null check (
    last_test_status is null
    or last_test_status = any (array['ok'::text, 'error'::text, 'pending'::text])
  ),
  last_test_error text null,
  created_by_user_id uuid null references auth.users(id) on delete set null,
  updated_by_user_id uuid null references auth.users(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (organization_id, provider_key, display_name)
);

create index if not exists internal_connector_profiles_organization_id_idx
  on public.internal_connector_profiles (organization_id);

alter table public.internal_connector_profiles enable row level security;

drop policy if exists internal_connector_profiles_select_admin on public.internal_connector_profiles;
create policy internal_connector_profiles_select_admin
  on public.internal_connector_profiles
  for select
  using (
    exists (
      select 1
      from public.organization_members om
      where om.organization_id = internal_connector_profiles.organization_id
        and om.user_id = auth.uid()
        and om.role = 'admin'
    )
  );

drop policy if exists internal_connector_profiles_insert_admin on public.internal_connector_profiles;
create policy internal_connector_profiles_insert_admin
  on public.internal_connector_profiles
  for insert
  with check (
    exists (
      select 1
      from public.organization_members om
      where om.organization_id = internal_connector_profiles.organization_id
        and om.user_id = auth.uid()
        and om.role = 'admin'
    )
  );

drop policy if exists internal_connector_profiles_update_admin on public.internal_connector_profiles;
create policy internal_connector_profiles_update_admin
  on public.internal_connector_profiles
  for update
  using (
    exists (
      select 1
      from public.organization_members om
      where om.organization_id = internal_connector_profiles.organization_id
        and om.user_id = auth.uid()
        and om.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.organization_members om
      where om.organization_id = internal_connector_profiles.organization_id
        and om.user_id = auth.uid()
        and om.role = 'admin'
    )
  );

drop policy if exists internal_connector_profiles_delete_admin on public.internal_connector_profiles;
create policy internal_connector_profiles_delete_admin
  on public.internal_connector_profiles
  for delete
  using (
    exists (
      select 1
      from public.organization_members om
      where om.organization_id = internal_connector_profiles.organization_id
        and om.user_id = auth.uid()
        and om.role = 'admin'
    )
  );

alter table public.internal_resource_connections
  add column if not exists credential_profile_id uuid null references public.internal_connector_profiles(id) on delete set null;

create index if not exists internal_resource_connections_credential_profile_id_idx
  on public.internal_resource_connections (credential_profile_id);

commit;