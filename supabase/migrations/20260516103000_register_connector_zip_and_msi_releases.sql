-- Register current ZIP and MSI connector artifacts in Supabase Storage.
-- Objects are expected in the private connector-distributions bucket.

begin;

update storage.buckets
set allowed_mime_types = array[
  'application/zip',
  'application/x-zip-compressed',
  'application/x-msi',
  'application/x-msdownload',
  'application/octet-stream'
]
where id = 'connector-distributions';

alter table public.connector_distribution_releases
add column if not exists package_format text not null default 'zip';

alter table public.connector_distribution_releases
drop constraint if exists connector_distribution_releases_package_format_check;

alter table public.connector_distribution_releases
add constraint connector_distribution_releases_package_format_check
check (package_format in ('zip', 'msi'));

alter table public.connector_distribution_releases
drop constraint if exists connector_distribution_releases_provider_key_version_key;

create unique index if not exists connector_distribution_releases_provider_version_format_key
on public.connector_distribution_releases (provider_key, version, package_format);

update public.connector_distribution_releases
set
  package_format = case
    when lower(file_name) like '%.msi' then 'msi'
    else 'zip'
  end,
  is_active = false,
  updated_at = now()
where provider_key in ('fusion', 'inventor')
  and storage_bucket = 'connector-distributions';

with upserted_release as (
  insert into public.connector_distribution_releases (
    provider_key,
    version,
    package_format,
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
      '0.1.0',
      'zip',
      'connector-distributions',
      'fusion/kordyne-fusion-installer-0.1.0.zip',
      'kordyne-fusion-installer-0.1.0.zip',
      'application/zip',
      'Fusion connector ZIP package registered for controlled organization downloads.',
      true
    ),
    (
      'fusion',
      '0.1.0',
      'msi',
      'connector-distributions',
      'fusion/kordyne-fusion-installer-0.1.0.msi',
      'kordyne-fusion-installer-0.1.0.msi',
      'application/x-msi',
      'Fusion connector MSI installer registered for controlled organization downloads.',
      true
    ),
    (
      'inventor',
      '0.1.0-alpha',
      'zip',
      'connector-distributions',
      'inventor/Kordyne-Inventor-Connector-0.1.0-alpha.zip',
      'Kordyne-Inventor-Connector-0.1.0-alpha.zip',
      'application/zip',
      'Inventor connector ZIP package registered for controlled organization downloads.',
      true
    ),
    (
      'inventor',
      '0.1.0-alpha',
      'msi',
      'connector-distributions',
      'inventor/Kordyne-Inventor-Connector-0.1.0-alpha.msi',
      'Kordyne-Inventor-Connector-0.1.0-alpha.msi',
      'application/x-msi',
      'Inventor connector MSI installer registered for controlled organization downloads.',
      true
    )
  on conflict (provider_key, version, package_format)
  do update set
    storage_bucket = excluded.storage_bucket,
    storage_path = excluded.storage_path,
    file_name = excluded.file_name,
    mime_type = excluded.mime_type,
    release_notes = excluded.release_notes,
    is_active = excluded.is_active,
    updated_at = now()
  returning id, provider_key, package_format
)
update public.organization_connector_entitlements entitlement
set
  current_release_id = upserted_release.id,
  updated_at = now()
from upserted_release
where entitlement.provider_key = upserted_release.provider_key
  and upserted_release.package_format = 'zip';

commit;
