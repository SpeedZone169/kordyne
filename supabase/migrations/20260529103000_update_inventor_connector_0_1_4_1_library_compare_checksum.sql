-- Update Inventor connector 0.1.4.1 beta checksum after adding the Library
-- two-part compare selection workflow to the same controlled beta installer.

begin;

update public.connector_distribution_releases
set
  size_bytes = 4620288,
  sha256_checksum = '4151CC37CDB171F65F05D38FC6550253B0644C5848BE92B2F0E11A7CF7D90AAB',
  release_notes = 'Inventor connector MSI patch keeps the 0.1.4 workflow, preserves the Onshape-matched connector shell, and adds Library two-part compare selection with a colored Inventor comparison assembly.',
  security_metadata = coalesce(security_metadata, '{}'::jsonb) || jsonb_build_object(
    'downloadable', true,
    'hotfix_reason', 'inventor_library_two_part_compare_selection',
    'corrected_checksum_at', now()
  ),
  updated_at = now()
where provider_key = 'inventor'
  and version = '0.1.4.1-beta'
  and package_format = 'msi';

commit;
