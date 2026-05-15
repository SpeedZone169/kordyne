-- Register downloadable CAD connector ZIP packages for the downloads page.
-- The matching ZIP objects must be uploaded to the connector-distributions bucket.

begin;

with upserted_release as (
  insert into public.connector_distribution_releases (
    provider_key,
    version,
    storage_bucket,
    storage_path,
    file_name,
    mime_type,
    release_notes,
    is_active
  )
  values
    (
      'fusion',
      '0.1.0-preview.1',
      'connector-distributions',
      'fusion/kordyne-fusion-connector-0.1.0-preview.1.zip',
      'kordyne-fusion-connector-0.1.0-preview.1.zip',
      'application/zip',
      'Preview Fusion connector package registered for controlled organization downloads.',
      true
    ),
    (
      'inventor',
      '0.1.0-preview.1',
      'connector-distributions',
      'inventor/kordyne-inventor-connector-0.1.0-preview.1.zip',
      'kordyne-inventor-connector-0.1.0-preview.1.zip',
      'application/zip',
      'Preview Inventor connector package registered for controlled organization downloads.',
      true
    )
  on conflict (provider_key, version)
  do update set
    storage_bucket = excluded.storage_bucket,
    storage_path = excluded.storage_path,
    file_name = excluded.file_name,
    mime_type = excluded.mime_type,
    release_notes = excluded.release_notes,
    is_active = excluded.is_active,
    updated_at = now()
  returning id, provider_key
)
update public.organization_connector_entitlements entitlement
set
  current_release_id = upserted_release.id,
  updated_at = now()
from upserted_release
where entitlement.provider_key = upserted_release.provider_key
  and entitlement.current_release_id is null;

commit;
