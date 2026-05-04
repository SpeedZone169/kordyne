-- Add Inventor as an allowed design-app browser login client
-- and enable Inventor runtime entitlement for the current test org.

begin;

-- 1) Allow browser-login handoff rows for both Fusion and Inventor.
alter table public.design_app_login_links
drop constraint if exists design_app_login_links_client_type_check;

alter table public.design_app_login_links
add constraint design_app_login_links_client_type_check
check (client_type in ('fusion', 'inventor'));

-- 2) Enable Inventor connector runtime access for the current test org.
-- Runtime access remains backend-enforced by provider_key + org entitlement + role.
insert into public.organization_connector_entitlements (
  organization_id,
  provider_key,
  is_enabled,
  allowed_runtime_roles
)
values (
  'f869fc5e-e48d-47ad-8723-80ed3cf21efb',
  'inventor',
  true,
  array['admin', 'engineer']::text[]
)
on conflict (organization_id, provider_key)
do update set
  is_enabled = excluded.is_enabled,
  allowed_runtime_roles = excluded.allowed_runtime_roles,
  updated_at = now();

commit;