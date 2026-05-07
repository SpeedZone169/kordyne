-- Seed Inventor design connector profile + connector for the Test organization.
-- Safe to run more than once.

begin;

with inventor_profile as (
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
    'inventor',
    'Inventor Test Profile',
    'inventor-local-client',
    'oauth_authorization_code',
    'succeeded',
    '48879a91-551e-4384-8b41-7825a5405f30'::uuid,
    '48879a91-551e-4384-8b41-7825a5405f30'::uuid
  where not exists (
    select 1
    from public.internal_connector_profiles
    where organization_id = 'f869fc5e-e48d-47ad-8723-80ed3cf21efb'::uuid
      and provider_key = 'inventor'
      and display_name = 'Inventor Test Profile'
  )
  returning id
),
selected_profile as (
  select id
  from inventor_profile

  union all

  select id
  from public.internal_connector_profiles
  where organization_id = 'f869fc5e-e48d-47ad-8723-80ed3cf21efb'::uuid
    and provider_key = 'inventor'
    and display_name = 'Inventor Test Profile'
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
  'inventor',
  selected_profile.id,
  'Inventor Main Test',
  'bidirectional',
  'project',
  'inventor-demo',
  'Inventor Demo Project',
  true
from selected_profile
where not exists (
  select 1
  from public.design_connectors
  where organization_id = 'f869fc5e-e48d-47ad-8723-80ed3cf21efb'::uuid
    and provider_key = 'inventor'
    and display_name = 'Inventor Main Test'
);

commit;
