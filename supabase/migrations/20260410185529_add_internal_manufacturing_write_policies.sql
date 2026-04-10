begin;

-- Helper: customer-org admin check
create or replace function public.is_org_admin(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organization_members om
    join public.organizations o
      on o.id = om.organization_id
    where om.organization_id = target_org_id
      and om.user_id = auth.uid()
      and om.role = 'admin'
      and o.organization_type = 'customer'
  );
$$;

revoke all on function public.is_org_admin(uuid) from public;
grant execute on function public.is_org_admin(uuid) to authenticated;


-- internal_resources
drop policy if exists internal_resources_insert on public.internal_resources;
create policy internal_resources_insert
  on public.internal_resources
  for insert
  to authenticated
  with check (
    public.is_org_admin(organization_id)
  );

drop policy if exists internal_resources_update on public.internal_resources;
create policy internal_resources_update
  on public.internal_resources
  for update
  to authenticated
  using (
    public.is_org_admin(organization_id)
  )
  with check (
    public.is_org_admin(organization_id)
  );

drop policy if exists internal_resources_delete on public.internal_resources;
create policy internal_resources_delete
  on public.internal_resources
  for delete
  to authenticated
  using (
    public.is_org_admin(organization_id)
  );


-- internal_capabilities
drop policy if exists internal_capabilities_insert on public.internal_capabilities;
create policy internal_capabilities_insert
  on public.internal_capabilities
  for insert
  to authenticated
  with check (
    public.is_org_admin(organization_id)
  );

drop policy if exists internal_capabilities_update on public.internal_capabilities;
create policy internal_capabilities_update
  on public.internal_capabilities
  for update
  to authenticated
  using (
    public.is_org_admin(organization_id)
  )
  with check (
    public.is_org_admin(organization_id)
  );

drop policy if exists internal_capabilities_delete on public.internal_capabilities;
create policy internal_capabilities_delete
  on public.internal_capabilities
  for delete
  to authenticated
  using (
    public.is_org_admin(organization_id)
  );


-- internal_resource_capabilities
drop policy if exists internal_resource_capabilities_insert on public.internal_resource_capabilities;
create policy internal_resource_capabilities_insert
  on public.internal_resource_capabilities
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.internal_resources r
      join public.internal_capabilities c
        on c.id = capability_id
      where r.id = resource_id
        and r.organization_id = c.organization_id
        and public.is_org_admin(r.organization_id)
    )
  );

drop policy if exists internal_resource_capabilities_update on public.internal_resource_capabilities;
create policy internal_resource_capabilities_update
  on public.internal_resource_capabilities
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.internal_resources r
      join public.internal_capabilities c
        on c.id = internal_resource_capabilities.capability_id
      where r.id = internal_resource_capabilities.resource_id
        and r.organization_id = c.organization_id
        and public.is_org_admin(r.organization_id)
    )
  )
  with check (
    exists (
      select 1
      from public.internal_resources r
      join public.internal_capabilities c
        on c.id = capability_id
      where r.id = resource_id
        and r.organization_id = c.organization_id
        and public.is_org_admin(r.organization_id)
    )
  );

drop policy if exists internal_resource_capabilities_delete on public.internal_resource_capabilities;
create policy internal_resource_capabilities_delete
  on public.internal_resource_capabilities
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.internal_resources r
      join public.internal_capabilities c
        on c.id = internal_resource_capabilities.capability_id
      where r.id = internal_resource_capabilities.resource_id
        and r.organization_id = c.organization_id
        and public.is_org_admin(r.organization_id)
    )
  );


-- internal_resource_connections
drop policy if exists internal_resource_connections_insert on public.internal_resource_connections;
create policy internal_resource_connections_insert
  on public.internal_resource_connections
  for insert
  to authenticated
  with check (
    public.is_org_admin(organization_id)
    and (
      resource_id is null
      or exists (
        select 1
        from public.internal_resources r
        where r.id = resource_id
          and r.organization_id = organization_id
      )
    )
  );

drop policy if exists internal_resource_connections_update on public.internal_resource_connections;
create policy internal_resource_connections_update
  on public.internal_resource_connections
  for update
  to authenticated
  using (
    public.is_org_admin(organization_id)
    and (
      resource_id is null
      or exists (
        select 1
        from public.internal_resources r
        where r.id = internal_resource_connections.resource_id
          and r.organization_id = internal_resource_connections.organization_id
      )
    )
  )
  with check (
    public.is_org_admin(organization_id)
    and (
      resource_id is null
      or exists (
        select 1
        from public.internal_resources r
        where r.id = resource_id
          and r.organization_id = organization_id
      )
    )
  );

drop policy if exists internal_resource_connections_delete on public.internal_resource_connections;
create policy internal_resource_connections_delete
  on public.internal_resource_connections
  for delete
  to authenticated
  using (
    public.is_org_admin(organization_id)
  );


-- internal_resource_status_events
drop policy if exists internal_resource_status_events_insert on public.internal_resource_status_events;
create policy internal_resource_status_events_insert
  on public.internal_resource_status_events
  for insert
  to authenticated
  with check (
    public.is_org_admin(organization_id)
    and exists (
      select 1
      from public.internal_resources r
      where r.id = resource_id
        and r.organization_id = organization_id
    )
  );

drop policy if exists internal_resource_status_events_update on public.internal_resource_status_events;
create policy internal_resource_status_events_update
  on public.internal_resource_status_events
  for update
  to authenticated
  using (
    public.is_org_admin(organization_id)
    and exists (
      select 1
      from public.internal_resources r
      where r.id = internal_resource_status_events.resource_id
        and r.organization_id = internal_resource_status_events.organization_id
    )
  )
  with check (
    public.is_org_admin(organization_id)
    and exists (
      select 1
      from public.internal_resources r
      where r.id = resource_id
        and r.organization_id = organization_id
    )
  );

drop policy if exists internal_resource_status_events_delete on public.internal_resource_status_events;
create policy internal_resource_status_events_delete
  on public.internal_resource_status_events
  for delete
  to authenticated
  using (
    public.is_org_admin(organization_id)
  );


-- internal_resource_constraints
drop policy if exists internal_resource_constraints_insert on public.internal_resource_constraints;
create policy internal_resource_constraints_insert
  on public.internal_resource_constraints
  for insert
  to authenticated
  with check (
    public.is_org_admin(organization_id)
    and exists (
      select 1
      from public.internal_resources r
      where r.id = resource_id
        and r.organization_id = organization_id
    )
  );

drop policy if exists internal_resource_constraints_update on public.internal_resource_constraints;
create policy internal_resource_constraints_update
  on public.internal_resource_constraints
  for update
  to authenticated
  using (
    public.is_org_admin(organization_id)
    and exists (
      select 1
      from public.internal_resources r
      where r.id = internal_resource_constraints.resource_id
        and r.organization_id = internal_resource_constraints.organization_id
    )
  )
  with check (
    public.is_org_admin(organization_id)
    and exists (
      select 1
      from public.internal_resources r
      where r.id = resource_id
        and r.organization_id = organization_id
    )
  );

drop policy if exists internal_resource_constraints_delete on public.internal_resource_constraints;
create policy internal_resource_constraints_delete
  on public.internal_resource_constraints
  for delete
  to authenticated
  using (
    public.is_org_admin(organization_id)
  );


-- internal_jobs
drop policy if exists internal_jobs_insert on public.internal_jobs;
create policy internal_jobs_insert
  on public.internal_jobs
  for insert
  to authenticated
  with check (
    public.is_org_admin(organization_id)
  );

drop policy if exists internal_jobs_update on public.internal_jobs;
create policy internal_jobs_update
  on public.internal_jobs
  for update
  to authenticated
  using (
    public.is_org_admin(organization_id)
  )
  with check (
    public.is_org_admin(organization_id)
  );

drop policy if exists internal_jobs_delete on public.internal_jobs;
create policy internal_jobs_delete
  on public.internal_jobs
  for delete
  to authenticated
  using (
    public.is_org_admin(organization_id)
  );


-- internal_job_operations
drop policy if exists internal_job_operations_insert on public.internal_job_operations;
create policy internal_job_operations_insert
  on public.internal_job_operations
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.internal_jobs j
      where j.id = job_id
        and j.organization_id = organization_id
        and public.is_org_admin(j.organization_id)
    )
    and (
      capability_id is null
      or exists (
        select 1
        from public.internal_capabilities c
        where c.id = capability_id
          and c.organization_id = organization_id
      )
    )
    and (
      predecessor_operation_id is null
      or exists (
        select 1
        from public.internal_job_operations p
        where p.id = predecessor_operation_id
          and p.organization_id = organization_id
      )
    )
  );

drop policy if exists internal_job_operations_update on public.internal_job_operations;
create policy internal_job_operations_update
  on public.internal_job_operations
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.internal_jobs j
      where j.id = internal_job_operations.job_id
        and j.organization_id = internal_job_operations.organization_id
        and public.is_org_admin(j.organization_id)
    )
  )
  with check (
    exists (
      select 1
      from public.internal_jobs j
      where j.id = job_id
        and j.organization_id = organization_id
        and public.is_org_admin(j.organization_id)
    )
    and (
      capability_id is null
      or exists (
        select 1
        from public.internal_capabilities c
        where c.id = capability_id
          and c.organization_id = organization_id
      )
    )
    and (
      predecessor_operation_id is null
      or exists (
        select 1
        from public.internal_job_operations p
        where p.id = predecessor_operation_id
          and p.organization_id = organization_id
      )
    )
  );

drop policy if exists internal_job_operations_delete on public.internal_job_operations;
create policy internal_job_operations_delete
  on public.internal_job_operations
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.internal_jobs j
      where j.id = internal_job_operations.job_id
        and j.organization_id = internal_job_operations.organization_id
        and public.is_org_admin(j.organization_id)
    )
  );


-- internal_operation_assignments
drop policy if exists internal_operation_assignments_insert on public.internal_operation_assignments;
create policy internal_operation_assignments_insert
  on public.internal_operation_assignments
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.internal_job_operations o
      where o.id = operation_id
        and o.organization_id = organization_id
    )
    and exists (
      select 1
      from public.internal_resources r
      where r.id = resource_id
        and r.organization_id = organization_id
    )
    and public.is_org_admin(organization_id)
  );

drop policy if exists internal_operation_assignments_update on public.internal_operation_assignments;
create policy internal_operation_assignments_update
  on public.internal_operation_assignments
  for update
  to authenticated
  using (
    public.is_org_admin(organization_id)
    and exists (
      select 1
      from public.internal_job_operations o
      where o.id = internal_operation_assignments.operation_id
        and o.organization_id = internal_operation_assignments.organization_id
    )
    and exists (
      select 1
      from public.internal_resources r
      where r.id = internal_operation_assignments.resource_id
        and r.organization_id = internal_operation_assignments.organization_id
    )
  )
  with check (
    public.is_org_admin(organization_id)
    and exists (
      select 1
      from public.internal_job_operations o
      where o.id = operation_id
        and o.organization_id = organization_id
    )
    and exists (
      select 1
      from public.internal_resources r
      where r.id = resource_id
        and r.organization_id = organization_id
    )
  );

drop policy if exists internal_operation_assignments_delete on public.internal_operation_assignments;
create policy internal_operation_assignments_delete
  on public.internal_operation_assignments
  for delete
  to authenticated
  using (
    public.is_org_admin(organization_id)
  );


-- internal_routing_decisions
drop policy if exists internal_routing_decisions_insert on public.internal_routing_decisions;
create policy internal_routing_decisions_insert
  on public.internal_routing_decisions
  for insert
  to authenticated
  with check (
    public.is_org_admin(organization_id)
    and exists (
      select 1
      from public.internal_jobs j
      where j.id = job_id
        and j.organization_id = organization_id
    )
  );

drop policy if exists internal_routing_decisions_update on public.internal_routing_decisions;
create policy internal_routing_decisions_update
  on public.internal_routing_decisions
  for update
  to authenticated
  using (
    public.is_org_admin(organization_id)
    and exists (
      select 1
      from public.internal_jobs j
      where j.id = internal_routing_decisions.job_id
        and j.organization_id = internal_routing_decisions.organization_id
    )
  )
  with check (
    public.is_org_admin(organization_id)
    and exists (
      select 1
      from public.internal_jobs j
      where j.id = job_id
        and j.organization_id = organization_id
    )
  );

drop policy if exists internal_routing_decisions_delete on public.internal_routing_decisions;
create policy internal_routing_decisions_delete
  on public.internal_routing_decisions
  for delete
  to authenticated
  using (
    public.is_org_admin(organization_id)
  );

commit;