-- Register Inventor connector 0.1.5.3 beta release.
-- Security pass: restrict connector API/browser/download endpoints to trusted
-- Kordyne/Supabase HTTPS hosts and keep bounded upload/download sizes.

begin;

update public.connector_distribution_releases
set
  is_active = false,
  security_metadata = coalesce(security_metadata, '{}'::jsonb) || jsonb_build_object(
    'downloadable', false,
    'replaced_by_version', '0.1.5.3-beta'
  ),
  updated_at = now()
where provider_key = 'inventor'
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
    'inventor',
    '0.1.5.3-beta',
    'msi',
    'connector-distributions',
    'inventor/Kordyne-Inventor-Connector-0.1.5.3-beta.msi',
    'Kordyne-Inventor-Connector-0.1.5.3-beta.msi',
    'application/x-msi',
    1482752,
    'BA3C8BD2DE9127AF9767F05D1A5702BA10F9509CFEC0DB9EAE658DE5866B83ED',
    'Inventor connector beta security pass restricts API/browser/download destinations to trusted HTTPS Kordyne and Supabase hosts, adds bounded upload/download handling, and preserves the final polished connector UI.',
    true,
    jsonb_build_object(
      'downloadable', true,
      'requires_authenticode', true,
      'requires_signed_runtime', true,
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
