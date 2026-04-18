alter table public.design_connectors enable row level security;
alter table public.part_source_links enable row level security;
alter table public.design_sync_runs enable row level security;
alter table public.design_sync_run_items enable row level security;
alter table public.design_connector_audit_events enable row level security;

create policy design_connectors_select
  on public.design_connectors
  for select
  to public
  using (is_org_member(organization_id));

create policy design_connectors_insert
  on public.design_connectors
  for insert
  to authenticated
  with check (is_org_admin(organization_id));

create policy design_connectors_update
  on public.design_connectors
  for update
  to authenticated
  using (is_org_admin(organization_id))
  with check (is_org_admin(organization_id));

create policy design_connectors_delete
  on public.design_connectors
  for delete
  to authenticated
  using (is_org_admin(organization_id));

create policy part_source_links_select
  on public.part_source_links
  for select
  to public
  using (is_org_member(organization_id));

create policy part_source_links_insert
  on public.part_source_links
  for insert
  to authenticated
  with check (is_org_admin(organization_id));

create policy part_source_links_update
  on public.part_source_links
  for update
  to authenticated
  using (is_org_admin(organization_id))
  with check (is_org_admin(organization_id));

create policy part_source_links_delete
  on public.part_source_links
  for delete
  to authenticated
  using (is_org_admin(organization_id));

create policy design_sync_runs_select
  on public.design_sync_runs
  for select
  to public
  using (is_org_member(organization_id));

create policy design_sync_runs_insert
  on public.design_sync_runs
  for insert
  to authenticated
  with check (is_org_admin(organization_id));

create policy design_sync_runs_update
  on public.design_sync_runs
  for update
  to authenticated
  using (is_org_admin(organization_id))
  with check (is_org_admin(organization_id));

create policy design_sync_runs_delete
  on public.design_sync_runs
  for delete
  to authenticated
  using (is_org_admin(organization_id));

create policy design_connector_audit_events_select
  on public.design_connector_audit_events
  for select
  to public
  using (is_org_member(organization_id));

create policy design_connector_audit_events_insert
  on public.design_connector_audit_events
  for insert
  to authenticated
  with check (is_org_admin(organization_id));

create policy design_connector_audit_events_update
  on public.design_connector_audit_events
  for update
  to authenticated
  using (is_org_admin(organization_id))
  with check (is_org_admin(organization_id));

create policy design_connector_audit_events_delete
  on public.design_connector_audit_events
  for delete
  to authenticated
  using (is_org_admin(organization_id));

create policy design_sync_run_items_select
  on public.design_sync_run_items
  for select
  to public
  using (
    exists (
      select 1
      from public.design_sync_runs r
      where r.id = design_sync_run_items.sync_run_id
        and is_org_member(r.organization_id)
    )
  );

create policy design_sync_run_items_insert
  on public.design_sync_run_items
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.design_sync_runs r
      where r.id = design_sync_run_items.sync_run_id
        and is_org_admin(r.organization_id)
    )
  );

create policy design_sync_run_items_update
  on public.design_sync_run_items
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.design_sync_runs r
      where r.id = design_sync_run_items.sync_run_id
        and is_org_admin(r.organization_id)
    )
  )
  with check (
    exists (
      select 1
      from public.design_sync_runs r
      where r.id = design_sync_run_items.sync_run_id
        and is_org_admin(r.organization_id)
    )
  );

create policy design_sync_run_items_delete
  on public.design_sync_run_items
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.design_sync_runs r
      where r.id = design_sync_run_items.sync_run_id
        and is_org_admin(r.organization_id)
    )
  );