create table if not exists public.internal_schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  resource_id uuid not null references public.internal_resources(id) on delete cascade,
  block_type text not null,
  title text not null,
  notes text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default true,
  entered_by_user_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint internal_schedule_blocks_block_type_check check (
    block_type in ('maintenance', 'downtime', 'holiday', 'internal_hold', 'other')
  ),
  constraint internal_schedule_blocks_date_order_check check (ends_at > starts_at)
);

create index if not exists internal_schedule_blocks_org_idx
  on public.internal_schedule_blocks (organization_id);

create index if not exists internal_schedule_blocks_resource_idx
  on public.internal_schedule_blocks (resource_id);

create index if not exists internal_schedule_blocks_starts_at_idx
  on public.internal_schedule_blocks (starts_at);

alter table public.internal_schedule_blocks enable row level security;

drop policy if exists internal_schedule_blocks_select on public.internal_schedule_blocks;
create policy internal_schedule_blocks_select
on public.internal_schedule_blocks
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    join public.organizations o on o.id = om.organization_id
    where om.organization_id = internal_schedule_blocks.organization_id
      and om.user_id = auth.uid()
      and o.organization_type = 'customer'
  )
);

drop policy if exists internal_schedule_blocks_insert on public.internal_schedule_blocks;
create policy internal_schedule_blocks_insert
on public.internal_schedule_blocks
for insert
to authenticated
with check (
  exists (
    select 1
    from public.organization_members om
    join public.organizations o on o.id = om.organization_id
    where om.organization_id = internal_schedule_blocks.organization_id
      and om.user_id = auth.uid()
      and om.role = 'admin'
      and o.organization_type = 'customer'
  )
);

drop policy if exists internal_schedule_blocks_update on public.internal_schedule_blocks;
create policy internal_schedule_blocks_update
on public.internal_schedule_blocks
for update
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    join public.organizations o on o.id = om.organization_id
    where om.organization_id = internal_schedule_blocks.organization_id
      and om.user_id = auth.uid()
      and om.role = 'admin'
      and o.organization_type = 'customer'
  )
)
with check (
  exists (
    select 1
    from public.organization_members om
    join public.organizations o on o.id = om.organization_id
    where om.organization_id = internal_schedule_blocks.organization_id
      and om.user_id = auth.uid()
      and om.role = 'admin'
      and o.organization_type = 'customer'
  )
);

drop policy if exists internal_schedule_blocks_delete on public.internal_schedule_blocks;
create policy internal_schedule_blocks_delete
on public.internal_schedule_blocks
for delete
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    join public.organizations o on o.id = om.organization_id
    where om.organization_id = internal_schedule_blocks.organization_id
      and om.user_id = auth.uid()
      and om.role = 'admin'
      and o.organization_type = 'customer'
  )
);

revoke truncate on table public.internal_schedule_blocks from authenticated, anon;
revoke references on table public.internal_schedule_blocks from authenticated, anon;