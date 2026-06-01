-- Register Inventor connector 0.1.5.0 beta release.
-- Final Inventor beta candidate for the current design/functionality pass:
-- includes the primary publish button state, safe no-document publish guard,
-- UI-thread thumbnail rendering, and cover-filled Vault preview thumbnails.

begin;

update public.connector_distribution_releases
set
  is_active = false,
  security_metadata = coalesce(security_metadata, '{}'::jsonb) || jsonb_build_object(
    'downloadable', false,
    'replaced_by_version', '0.1.5.0-beta'
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
    '0.1.5.0-beta',
    'msi',
    'connector-distributions',
    'inventor/Kordyne-Inventor-Connector-0.1.5.0-beta.msi',
    'Kordyne-Inventor-Connector-0.1.5.0-beta.msi',
    'application/x-msi',
    1478656,
    '3D262D22A7B51BD991E03163A6EC6909ACE0D833E878C449902D2CDF87026163',
    'Final Inventor connector beta candidate for this pass. Keeps Publish package to Kordyne visually primary while safely refusing publish without an active document, renders downloaded Vault thumbnails on the WinForms UI thread, and fills library thumbnail tiles with cover-cropped real preview images.',
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
