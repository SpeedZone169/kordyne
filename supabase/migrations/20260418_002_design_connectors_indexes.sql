create unique index if not exists design_connectors_org_display_name_unique
  on public.design_connectors (organization_id, display_name);

create index if not exists design_connectors_organization_id_idx
  on public.design_connectors (organization_id);

create index if not exists design_connectors_provider_key_idx
  on public.design_connectors (provider_key);

create index if not exists design_connectors_credential_profile_id_idx
  on public.design_connectors (credential_profile_id);

create index if not exists part_source_links_organization_id_idx
  on public.part_source_links (organization_id);

create index if not exists part_source_links_provider_key_idx
  on public.part_source_links (provider_key);

create index if not exists part_source_links_part_family_id_idx
  on public.part_source_links (part_family_id);

create index if not exists part_source_links_part_id_idx
  on public.part_source_links (part_id);

create index if not exists part_source_links_design_connector_id_idx
  on public.part_source_links (design_connector_id);

create index if not exists part_source_links_external_document_id_idx
  on public.part_source_links (external_document_id);

create index if not exists part_source_links_external_item_id_idx
  on public.part_source_links (external_item_id);

create index if not exists part_source_links_external_version_id_idx
  on public.part_source_links (external_version_id);

create index if not exists design_sync_runs_organization_id_idx
  on public.design_sync_runs (organization_id);

create index if not exists design_sync_runs_design_connector_id_idx
  on public.design_sync_runs (design_connector_id);

create index if not exists design_sync_runs_status_idx
  on public.design_sync_runs (status);

create index if not exists design_sync_runs_started_at_idx
  on public.design_sync_runs (started_at desc);

create index if not exists design_sync_run_items_sync_run_id_idx
  on public.design_sync_run_items (sync_run_id);

create index if not exists design_sync_run_items_part_id_idx
  on public.design_sync_run_items (part_id);

create index if not exists design_sync_run_items_part_source_link_id_idx
  on public.design_sync_run_items (part_source_link_id);

create index if not exists design_connector_audit_events_organization_id_idx
  on public.design_connector_audit_events (organization_id);

create index if not exists design_connector_audit_events_provider_key_idx
  on public.design_connector_audit_events (provider_key);

create index if not exists design_connector_audit_events_created_at_idx
  on public.design_connector_audit_events (created_at desc);