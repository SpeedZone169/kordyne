-- Register Inventor connector 0.1.4.8 beta release.
-- This patch blocks publish progress when no Inventor document is active,
-- improves publish status alignment, preserves real Vault thumbnail fallbacks
-- from Inventor source-link metadata, gives library status pills more room, and
-- refreshes the ribbon icon from the new Kordyne mark.

begin;

update public.connector_distribution_releases
set
  is_active = false,
  security_metadata = coalesce(security_metadata, '{}'::jsonb) || jsonb_build_object(
    'downloadable', false,
    'replaced_by_version', '0.1.4.8-beta'
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
    '0.1.4.8-beta',
    'msi',
    'connector-distributions',
    'inventor/Kordyne-Inventor-Connector-0.1.4.8-beta.msi',
    'Kordyne-Inventor-Connector-0.1.4.8-beta.msi',
    'application/x-msi',
    1478656,
    '27CBEE2B6AF0EC86AFDE2B12AF77590C0E994D94999CE1AD6E3A2655BB1227D4',
    'Inventor connector beta patch stops publish progress from starting without an active document, tightens publish status alignment, restores real Vault thumbnail fallbacks from Inventor source metadata, improves status-pill spacing on library and revision cards, and updates the ribbon icon to the new Kordyne mark.',
    true,
    jsonb_build_object(
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
