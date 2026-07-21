-- Enable SolidWorks as a browser-login design connector runtime.
-- Seed the preview runtime only for the current Kordyne test organization.

begin;

alter table public.design_app_login_links
drop constraint if exists design_app_login_links_client_type_check;

alter table public.design_app_login_links
add constraint design_app_login_links_client_type_check
check (client_type in ('fusion', 'inventor', 'onshape', 'solidworks'));

insert into public.organization_connector_entitlements (
  organization_id,
  provider_key,
  is_enabled,
  allowed_runtime_roles
)
values (
  'f869fc5e-e48d-47ad-8723-80ed3cf21efb',
  'solidworks',
  true,
  array['admin', 'engineer']::text[]
)
on conflict (organization_id, provider_key)
do update set
  is_enabled = excluded.is_enabled,
  allowed_runtime_roles = excluded.allowed_runtime_roles,
  updated_at = now();

with solidworks_profile as (
  insert into public.internal_connector_profiles (
    organization_id,
    provider_key,
    display_name,
    client_id,
    auth_mode,
    last_test_status,
    created_by_user_id,
    updated_by_user_id
  )
  select
    'f869fc5e-e48d-47ad-8723-80ed3cf21efb'::uuid,
    'solidworks',
    'SolidWorks Test Profile',
    'solidworks-local-client',
    'oauth_authorization_code',
    'succeeded',
    '48879a91-551e-4384-8b41-7825a5405f30'::uuid,
    '48879a91-551e-4384-8b41-7825a5405f30'::uuid
  where not exists (
    select 1
    from public.internal_connector_profiles
    where organization_id = 'f869fc5e-e48d-47ad-8723-80ed3cf21efb'::uuid
      and provider_key = 'solidworks'
      and display_name = 'SolidWorks Test Profile'
  )
  returning id
),
selected_profile as (
  select id
  from solidworks_profile

  union all

  select id
  from public.internal_connector_profiles
  where organization_id = 'f869fc5e-e48d-47ad-8723-80ed3cf21efb'::uuid
    and provider_key = 'solidworks'
    and display_name = 'SolidWorks Test Profile'
  limit 1
)
insert into public.design_connectors (
  organization_id,
  provider_key,
  credential_profile_id,
  display_name,
  connection_mode,
  sync_scope_type,
  sync_scope_external_id,
  sync_scope_label,
  is_enabled
)
select
  'f869fc5e-e48d-47ad-8723-80ed3cf21efb'::uuid,
  'solidworks',
  selected_profile.id,
  'SolidWorks Main Test',
  'bidirectional',
  'project',
  'solidworks-demo',
  'SolidWorks Demo Project',
  true
from selected_profile
where not exists (
  select 1
  from public.design_connectors
  where organization_id = 'f869fc5e-e48d-47ad-8723-80ed3cf21efb'::uuid
    and provider_key = 'solidworks'
    and display_name = 'SolidWorks Main Test'
);

commit;
