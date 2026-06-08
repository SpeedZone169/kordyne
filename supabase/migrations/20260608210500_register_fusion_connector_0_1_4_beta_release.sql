-- Register Fusion connector 0.1.4 beta release.
-- Design/functionality pass: refreshed Kordyne connector UI, memory-only
-- browser session restore, publish/library polish, explicit recent sorting,
-- and latest local installer package.

begin;

update public.connector_distribution_releases
set
  is_active = false,
  security_metadata = coalesce(security_metadata, '{}'::jsonb) || jsonb_build_object(
    'downloadable', false,
    'replaced_by_version', '0.1.4-beta'
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
    '0.1.4-beta',
    'msi',
    'connector-distributions',
    'fusion/kordyne-fusion-installer-0.1.4-beta.msi',
    'kordyne-fusion-installer-0.1.4-beta.msi',
    'application/x-msi',
    126976,
    '861E6A2D3484D8C448942F365329AD0AB8158E02960B04004608E22EC67306B7',
    'Fusion connector beta refresh aligns the panel with the finished Inventor/Onshape connector design, keeps browser-login tokens in the current Fusion session only, improves publish progress and library selection workflows, refreshes the library after publish, and sorts recent Vault parts by latest family/revision activity.',
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
        'browser_session_storage_current_fusion_panel',
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
