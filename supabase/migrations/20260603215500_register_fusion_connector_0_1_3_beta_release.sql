-- Register Fusion connector 0.1.3 beta release.
-- Hotfix: browser-login verifier polling, automatic startup, dedicated Fusion
-- Kordyne toolbar tab/panel, and refreshed add-in icon assets.

begin;

update public.connector_distribution_releases
set
  is_active = false,
  security_metadata = coalesce(security_metadata, '{}'::jsonb) || jsonb_build_object(
    'downloadable', false,
    'replaced_by_version', '0.1.3-beta'
  ),
  updated_at = now()
where provider_key = 'fusion'
  and package_format = 'msi'
  and is_active = true;

with upserted_release as (
  insert into public.connector_distribution_releases (
    provider_key,
    version,
    package_format,
    storage_bucket,
    storage_path,
    file_name,
    mime_type,
    size_bytes,
    sha256_checksum,
    release_notes,
    is_active,
    security_metadata
  )
  values (
    'fusion',
    '0.1.3-beta',
    'msi',
    'connector-distributions',
    'fusion/kordyne-fusion-installer-0.1.3-beta.msi',
    'kordyne-fusion-installer-0.1.3-beta.msi',
    'application/x-msi',
    352256,
    'B896EB3A9EB83DDA0BFE26FCB0522AA2AF7173C8EAF08701592633589B4CCC1A',
    'Fusion connector beta hotfix stores the browser-login verifier required by Kordyne handoff polling, auto-loads the connector, adds a dedicated Fusion Kordyne toolbar tab and panel, and refreshes the Fusion add-in icon assets.',
    true,
    jsonb_build_object(
      'downloadable', true,
      'requires_authenticode', false,
      'authenticode_status', 'not_signed_beta',
      'code_signing_required_before_enterprise_release', true,
      'requires_sha256_checksum', true,
      'allows_static_secrets', false,
      'api_endpoint_allowlist', jsonb_build_array(
        'https://www.kordyne.com'
      ),
      'download_host_allowlist', jsonb_build_array(
        'www.kordyne.com',
        'kordyne.com',
        '*.supabase.co',
        '*.supabase.in'
      ),
      'token_storage', jsonb_build_array(
        'memory_only_connector_session',
        'encrypted_handoff_record',
        'one_time_login_code'
      ),
      'controlled_release_required', true,
      'supplier_audit_gate_required', true
    )
  )
  on conflict (provider_key, version, package_format)
  do update set
    storage_bucket = excluded.storage_bucket,
    storage_path = excluded.storage_path,
    file_name = excluded.file_name,
    mime_type = excluded.mime_type,
    size_bytes = excluded.size_bytes,
    sha256_checksum = excluded.sha256_checksum,
    release_notes = excluded.release_notes,
    is_active = excluded.is_active,
    security_metadata = excluded.security_metadata,
    updated_at = now()
  returning id, provider_key
)
update public.organization_connector_entitlements entitlement
set
  current_release_id = upserted_release.id,
  updated_at = now()
from upserted_release
where entitlement.provider_key = upserted_release.provider_key;

commit;
