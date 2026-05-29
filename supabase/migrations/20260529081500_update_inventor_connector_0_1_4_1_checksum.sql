-- Update Inventor connector 0.1.4.1 beta checksum after rebuilding the same
-- patch release with the WinForms transparent icon-control load fix.

begin;

update public.connector_distribution_releases
set
  size_bytes = 4616192,
  sha256_checksum = '2F1918B2E21167D3A95384578ED9857BA209FA6280855393D1BA84740998474A',
  release_notes = 'Inventor connector MSI patch keeps the 0.1.4 workflow and updates the panel shell with Onshape-matched line icons, safer responsive label sizing, a cleaner Connect card, a dockable panel that preserves user width changes, and a WinForms icon-control load fix.',
  security_metadata = coalesce(security_metadata, '{}'::jsonb) || jsonb_build_object(
    'downloadable', true,
    'hotfix_reason', 'winforms_transparent_icon_control_load_fix',
    'corrected_checksum_at', now()
  ),
  updated_at = now()
where provider_key = 'inventor'
  and version = '0.1.4.1-beta'
  and package_format = 'msi';

commit;
