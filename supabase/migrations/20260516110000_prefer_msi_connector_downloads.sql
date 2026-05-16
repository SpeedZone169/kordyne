-- Prefer signed MSI installers for desktop connector downloads.
-- ZIP artifacts may remain in storage, but they are not active customer downloads.

begin;

alter table public.connector_distribution_releases
add column if not exists sha256_checksum text;

alter table public.connector_distribution_releases
add column if not exists signature_subject text;

alter table public.connector_distribution_releases
add column if not exists signature_thumbprint text;

alter table public.connector_distribution_releases
add column if not exists security_metadata jsonb not null default '{}'::jsonb;

alter table public.connector_distribution_releases
drop constraint if exists connector_distribution_releases_sha256_checksum_check;

alter table public.connector_distribution_releases
add constraint connector_distribution_releases_sha256_checksum_check
check (sha256_checksum is null or sha256_checksum ~ '^[A-Fa-f0-9]{64}$');

update public.connector_distribution_releases
set
  is_active = false,
  security_metadata = coalesce(security_metadata, '{}'::jsonb) || jsonb_build_object(
    'downloadable', false,
    'replaced_by_format', 'msi'
  ),
  updated_at = now()
where provider_key in ('fusion', 'inventor')
  and package_format = 'zip';

update public.connector_distribution_releases
set
  is_active = true,
  security_metadata = coalesce(security_metadata, '{}'::jsonb) || jsonb_build_object(
    'downloadable', true,
    'requires_authenticode', true,
    'requires_signed_runtime', true,
    'requires_sha256_checksum', true,
    'allows_static_secrets', false,
    'token_storage', jsonb_build_array(
      'windows_dpapi',
      'credential_manager',
      'encrypted_oauth_vault'
    ),
    'controlled_release_required', true,
    'supplier_audit_gate_required', true
  ),
  updated_at = now()
where provider_key in ('fusion', 'inventor')
  and package_format = 'msi';

with active_msi_releases as (
  select distinct on (provider_key)
    id,
    provider_key
  from public.connector_distribution_releases
  where provider_key in ('fusion', 'inventor')
    and package_format = 'msi'
    and is_active = true
  order by provider_key, created_at desc, version desc
)
update public.organization_connector_entitlements entitlement
set
  current_release_id = active_msi_releases.id,
  updated_at = now()
from active_msi_releases
where entitlement.provider_key = active_msi_releases.provider_key;

commit;
