-- Register Inventor connector 0.1.4.6 beta release.
-- This patch tightens the Inventor connector toward the finished Onshape
-- interaction model: clearer line icons, visible expansion controls, selected
-- compare buttons, pull busy feedback, safer thumbnail application, and
-- publish progress that stays in view.

begin;

update public.connector_distribution_releases
set
  is_active = false,
  security_metadata = coalesce(security_metadata, '{}'::jsonb) || jsonb_build_object(
    'downloadable', false,
    'replaced_by_version', '0.1.4.6-beta'
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
    '0.1.4.6-beta',
    'msi',
    'connector-distributions',
    'inventor/Kordyne-Inventor-Connector-0.1.4.6-beta.msi',
    'Kordyne-Inventor-Connector-0.1.4.6-beta.msi',
    'application/x-msi',
    1478656,
    '787339B8AB2C93EA9F7F8FA518D094EDB465922DEC4DC8BA6D1CEA87D5BBC0B2',
    'Inventor connector beta refresh aligns more closely with the Onshape connector: clearer Connect and Library icons, visible expansion controls, selected compare buttons across duplicate revision rows, pull busy feedback, safer Vault thumbnail display, cleaner rounded corners, and publish progress that scrolls into view when publishing starts.',
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
