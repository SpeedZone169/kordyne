-- Register Inventor connector 0.1.4.7 beta release.
-- This patch finishes a small visual pass after 0.1.4.6: publish progress
-- percentage visibility, cleaner rounded button painting, thinner action
-- icons, better spacing between status pills and expansion controls, and
-- stronger Vault thumbnail preference for Inventor library rows.

begin;

update public.connector_distribution_releases
set
  is_active = false,
  security_metadata = coalesce(security_metadata, '{}'::jsonb) || jsonb_build_object(
    'downloadable', false,
    'replaced_by_version', '0.1.4.7-beta'
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
    '0.1.4.7-beta',
    'msi',
    'connector-distributions',
    'inventor/Kordyne-Inventor-Connector-0.1.4.7-beta.msi',
    'Kordyne-Inventor-Connector-0.1.4.7-beta.msi',
    'application/x-msi',
    1478656,
    '677CC128A1CB90B6428813CB53D96A2A8627F8AEB6B601EA061B3E19637A3E47',
    'Inventor connector beta visual patch keeps the publish percentage visible, custom-paints rounded action buttons to avoid missing corners, thins compact action icons, gives status pills more space from expansion controls, and improves Vault thumbnail selection for real preview images.',
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
