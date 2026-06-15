create table if not exists public.part_review_annotations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  part_id uuid not null references public.parts(id) on delete cascade,
  part_file_id uuid not null references public.part_files(id) on delete cascade,
  created_by uuid not null references public.profiles(user_id) on delete restrict,
  assigned_to uuid references public.profiles(user_id) on delete set null,
  title text not null,
  status text not null default 'open',
  severity text not null default 'info',
  category text not null default 'other',
  visibility text not null default 'internal',
  target_kind text not null default 'stl_surface_point',
  position jsonb not null,
  normal jsonb,
  camera jsonb,
  snapshot_url text,
  due_date date,
  source_annotation_id uuid references public.part_review_annotations(id) on delete set null,
  carried_forward_to_annotation_id uuid references public.part_review_annotations(id) on delete set null,
  resolved_by uuid references public.profiles(user_id) on delete set null,
  resolved_at timestamptz,
  reopened_by uuid references public.profiles(user_id) on delete set null,
  reopened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint part_review_annotations_title_length_check
    check (char_length(title) between 2 and 160),
  constraint part_review_annotations_status_check
    check (status in ('open', 'in_review', 'resolved', 'reopened')),
  constraint part_review_annotations_severity_check
    check (severity in ('info', 'question', 'issue', 'critical')),
  constraint part_review_annotations_category_check
    check (category in ('design', 'manufacturability', 'quality', 'supplier_question', 'internal_note', 'other')),
  constraint part_review_annotations_visibility_check
    check (visibility in ('internal', 'shared')),
  constraint part_review_annotations_target_kind_check
    check (target_kind in ('stl_surface_point', 'step_brep_face')),
  constraint part_review_annotations_position_check
    check (
      jsonb_typeof(position) = 'object'
      and position ? 'x'
      and position ? 'y'
      and position ? 'z'
    ),
  constraint part_review_annotations_normal_check
    check (
      normal is null
      or (
        jsonb_typeof(normal) = 'object'
        and normal ? 'x'
        and normal ? 'y'
        and normal ? 'z'
      )
    ),
  constraint part_review_annotations_camera_check
    check (camera is null or jsonb_typeof(camera) = 'object')
);

create table if not exists public.part_review_annotation_messages (
  id uuid primary key default gen_random_uuid(),
  annotation_id uuid not null references public.part_review_annotations(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references public.profiles(user_id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint part_review_annotation_messages_body_length_check
    check (char_length(body) between 1 and 4000)
);

create table if not exists public.part_review_annotation_events (
  id uuid primary key default gen_random_uuid(),
  annotation_id uuid not null references public.part_review_annotations(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid not null references public.profiles(user_id) on delete restrict,
  event_type text not null,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now(),
  constraint part_review_annotation_events_type_check
    check (event_type in ('created', 'message_added', 'status_changed', 'assigned', 'details_updated', 'carried_forward'))
);

create index if not exists idx_part_review_annotations_part_status
  on public.part_review_annotations (part_id, status, updated_at desc);

create index if not exists idx_part_review_annotations_file
  on public.part_review_annotations (part_file_id, created_at desc);

create index if not exists idx_part_review_annotations_assignee
  on public.part_review_annotations (assigned_to, status)
  where assigned_to is not null;

create index if not exists idx_part_review_annotation_messages_annotation
  on public.part_review_annotation_messages (annotation_id, created_at);

create index if not exists idx_part_review_annotation_events_annotation
  on public.part_review_annotation_events (annotation_id, created_at);

create or replace function public.part_review_annotations_set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.part_review_annotations_set_updated_at() from public;
revoke all on function public.part_review_annotations_set_updated_at() from anon;
revoke all on function public.part_review_annotations_set_updated_at() from authenticated;

drop trigger if exists set_part_review_annotations_updated_at on public.part_review_annotations;
create trigger set_part_review_annotations_updated_at
  before update on public.part_review_annotations
  for each row
  execute function public.part_review_annotations_set_updated_at();

drop trigger if exists set_part_review_annotation_messages_updated_at on public.part_review_annotation_messages;
create trigger set_part_review_annotation_messages_updated_at
  before update on public.part_review_annotation_messages
  for each row
  execute function public.part_review_annotations_set_updated_at();

alter table public.part_review_annotations enable row level security;
alter table public.part_review_annotation_messages enable row level security;
alter table public.part_review_annotation_events enable row level security;

create policy part_review_annotations_select
  on public.part_review_annotations
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.organization_members om
      where om.organization_id = part_review_annotations.organization_id
        and om.user_id = auth.uid()
    )
  );

create policy part_review_annotations_insert
  on public.part_review_annotations
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1
      from public.parts p
      join public.part_files pf
        on pf.part_id = p.id
      join public.organization_members om
        on om.organization_id = p.organization_id
      where p.id = part_review_annotations.part_id
        and pf.id = part_review_annotations.part_file_id
        and om.user_id = auth.uid()
        and om.organization_id = part_review_annotations.organization_id
    )
  );

create policy part_review_annotations_update
  on public.part_review_annotations
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.organization_members om
      where om.organization_id = part_review_annotations.organization_id
        and om.user_id = auth.uid()
        and (
          om.role in ('admin', 'engineer')
          or part_review_annotations.created_by = auth.uid()
          or part_review_annotations.assigned_to = auth.uid()
        )
    )
  )
  with check (
    exists (
      select 1
      from public.parts p
      join public.part_files pf
        on pf.part_id = p.id
      join public.organization_members om
        on om.organization_id = p.organization_id
      where p.id = part_review_annotations.part_id
        and pf.id = part_review_annotations.part_file_id
        and om.user_id = auth.uid()
        and om.organization_id = part_review_annotations.organization_id
        and (
          om.role in ('admin', 'engineer')
          or part_review_annotations.created_by = auth.uid()
          or part_review_annotations.assigned_to = auth.uid()
        )
    )
  );

create policy part_review_annotations_delete
  on public.part_review_annotations
  for delete
  to authenticated
  using (false);

create policy part_review_annotation_messages_select
  on public.part_review_annotation_messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.part_review_annotations pra
      join public.organization_members om
        on om.organization_id = pra.organization_id
      where pra.id = part_review_annotation_messages.annotation_id
        and om.user_id = auth.uid()
    )
  );

create policy part_review_annotation_messages_insert
  on public.part_review_annotation_messages
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1
      from public.part_review_annotations pra
      join public.organization_members om
        on om.organization_id = pra.organization_id
      where pra.id = part_review_annotation_messages.annotation_id
        and pra.organization_id = part_review_annotation_messages.organization_id
        and om.user_id = auth.uid()
    )
  );

create policy part_review_annotation_messages_update
  on public.part_review_annotation_messages
  for update
  to authenticated
  using (false)
  with check (false);

create policy part_review_annotation_messages_delete
  on public.part_review_annotation_messages
  for delete
  to authenticated
  using (false);

create policy part_review_annotation_events_select
  on public.part_review_annotation_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.organization_members om
      where om.organization_id = part_review_annotation_events.organization_id
        and om.user_id = auth.uid()
    )
  );

create policy part_review_annotation_events_insert
  on public.part_review_annotation_events
  for insert
  to authenticated
  with check (
    actor_id = auth.uid()
    and exists (
      select 1
      from public.part_review_annotations pra
      join public.organization_members om
        on om.organization_id = pra.organization_id
      where pra.id = part_review_annotation_events.annotation_id
        and pra.organization_id = part_review_annotation_events.organization_id
        and om.user_id = auth.uid()
    )
  );

create policy part_review_annotation_events_update
  on public.part_review_annotation_events
  for update
  to authenticated
  using (false)
  with check (false);

create policy part_review_annotation_events_delete
  on public.part_review_annotation_events
  for delete
  to authenticated
  using (false);

grant all on table public.part_review_annotations to authenticated;
grant all on table public.part_review_annotations to service_role;
grant all on table public.part_review_annotation_messages to authenticated;
grant all on table public.part_review_annotation_messages to service_role;
grant all on table public.part_review_annotation_events to authenticated;
grant all on table public.part_review_annotation_events to service_role;

revoke all on table public.part_review_annotations from anon;
revoke all on table public.part_review_annotation_messages from anon;
revoke all on table public.part_review_annotation_events from anon;
