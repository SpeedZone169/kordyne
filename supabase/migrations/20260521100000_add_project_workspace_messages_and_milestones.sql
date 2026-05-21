begin;

create table if not exists public.project_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  author_user_id uuid references public.profiles(user_id) on delete set null,
  message_type text not null default 'message',
  body text not null,
  visibility text not null default 'project',
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  constraint project_messages_body_length_check
    check (char_length(btrim(body)) between 1 and 4000),
  constraint project_messages_type_check
    check (message_type in ('message', 'system')),
  constraint project_messages_visibility_check
    check (visibility in ('project', 'internal_only'))
);

create index if not exists project_messages_project_created_idx
  on public.project_messages (project_id, created_at desc);

create table if not exists public.project_message_attachments (
  id uuid primary key default gen_random_uuid(),
  project_message_id uuid not null references public.project_messages(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  uploaded_by_user_id uuid references public.profiles(user_id) on delete set null,
  file_name text not null,
  file_type text,
  file_size_bytes bigint,
  storage_bucket text not null default 'project-attachments',
  storage_path text not null,
  created_at timestamptz not null default now(),
  constraint project_message_attachments_file_name_check
    check (char_length(btrim(file_name)) > 0)
);

create index if not exists project_message_attachments_message_idx
  on public.project_message_attachments (project_message_id, created_at);

create index if not exists project_message_attachments_project_idx
  on public.project_message_attachments (project_id, created_at desc);

create table if not exists public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'planned',
  target_date date,
  completed_at timestamptz,
  created_by_user_id uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_milestones_title_not_empty
    check (char_length(btrim(title)) > 0),
  constraint project_milestones_status_check
    check (status in ('planned', 'active', 'completed', 'blocked'))
);

create index if not exists project_milestones_project_status_idx
  on public.project_milestones (project_id, status, target_date nulls last);

drop trigger if exists set_project_milestones_updated_at on public.project_milestones;
create trigger set_project_milestones_updated_at
before update on public.project_milestones
for each row execute function public.set_current_timestamp_updated_at();

alter table public.project_messages enable row level security;
alter table public.project_message_attachments enable row level security;
alter table public.project_milestones enable row level security;

drop policy if exists project_messages_select_org_members on public.project_messages;
create policy project_messages_select_org_members
on public.project_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.projects p
    join public.organization_members om
      on om.organization_id = p.organization_id
    where p.id = project_messages.project_id
      and p.organization_id = project_messages.organization_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists project_messages_insert_org_members on public.project_messages;
create policy project_messages_insert_org_members
on public.project_messages
for insert
to authenticated
with check (
  author_user_id = auth.uid()
  and exists (
    select 1
    from public.projects p
    join public.organization_members om
      on om.organization_id = p.organization_id
    where p.id = project_messages.project_id
      and p.organization_id = project_messages.organization_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists project_messages_update_own on public.project_messages;
create policy project_messages_update_own
on public.project_messages
for update
to authenticated
using (
  author_user_id = auth.uid()
  and deleted_at is null
)
with check (
  author_user_id = auth.uid()
  and exists (
    select 1
    from public.projects p
    join public.organization_members om
      on om.organization_id = p.organization_id
    where p.id = project_messages.project_id
      and p.organization_id = project_messages.organization_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists project_message_attachments_select_org_members on public.project_message_attachments;
create policy project_message_attachments_select_org_members
on public.project_message_attachments
for select
to authenticated
using (
  exists (
    select 1
    from public.project_messages pm
    join public.projects p
      on p.id = pm.project_id
    join public.organization_members om
      on om.organization_id = p.organization_id
    where pm.id = project_message_attachments.project_message_id
      and pm.project_id = project_message_attachments.project_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists project_message_attachments_insert_own_message on public.project_message_attachments;
create policy project_message_attachments_insert_own_message
on public.project_message_attachments
for insert
to authenticated
with check (
  uploaded_by_user_id = auth.uid()
  and exists (
    select 1
    from public.project_messages pm
    join public.projects p
      on p.id = pm.project_id
    join public.organization_members om
      on om.organization_id = p.organization_id
    where pm.id = project_message_attachments.project_message_id
      and pm.project_id = project_message_attachments.project_id
      and pm.author_user_id = auth.uid()
      and om.user_id = auth.uid()
  )
);

drop policy if exists project_message_attachments_delete_own_or_manager on public.project_message_attachments;
create policy project_message_attachments_delete_own_or_manager
on public.project_message_attachments
for delete
to authenticated
using (
  uploaded_by_user_id = auth.uid()
  or exists (
    select 1
    from public.projects p
    join public.organization_members om
      on om.organization_id = p.organization_id
    where p.id = project_message_attachments.project_id
      and om.user_id = auth.uid()
      and om.role in ('admin', 'engineer')
  )
);

drop policy if exists project_milestones_select_org_members on public.project_milestones;
create policy project_milestones_select_org_members
on public.project_milestones
for select
to authenticated
using (
  exists (
    select 1
    from public.projects p
    join public.organization_members om
      on om.organization_id = p.organization_id
    where p.id = project_milestones.project_id
      and p.organization_id = project_milestones.organization_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists project_milestones_manage_org_engineers on public.project_milestones;
create policy project_milestones_manage_org_engineers
on public.project_milestones
for all
to authenticated
using (
  exists (
    select 1
    from public.projects p
    join public.organization_members om
      on om.organization_id = p.organization_id
    where p.id = project_milestones.project_id
      and p.organization_id = project_milestones.organization_id
      and om.user_id = auth.uid()
      and om.role in ('admin', 'engineer')
  )
)
with check (
  exists (
    select 1
    from public.projects p
    join public.organization_members om
      on om.organization_id = p.organization_id
    where p.id = project_milestones.project_id
      and p.organization_id = project_milestones.organization_id
      and om.user_id = auth.uid()
      and om.role in ('admin', 'engineer')
  )
);

insert into storage.buckets (id, name, public)
values ('project-attachments', 'project-attachments', false)
on conflict (id) do nothing;

drop policy if exists "Project attachment uploads are user scoped" on storage.objects;
create policy "Project attachment uploads are user scoped"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'project-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Project members can view project attachments" on storage.objects;
create policy "Project members can view project attachments"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'project-attachments'
  and exists (
    select 1
    from public.project_message_attachments pma
    join public.projects p
      on p.id = pma.project_id
    join public.organization_members om
      on om.organization_id = p.organization_id
    where pma.storage_bucket = objects.bucket_id
      and pma.storage_path = objects.name
      and om.user_id = auth.uid()
  )
);

drop policy if exists "Project attachment owners can delete uploads" on storage.objects;
create policy "Project attachment owners can delete uploads"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'project-attachments'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1
      from public.project_message_attachments pma
      join public.projects p
        on p.id = pma.project_id
      join public.organization_members om
        on om.organization_id = p.organization_id
      where pma.storage_bucket = objects.bucket_id
        and pma.storage_path = objects.name
        and om.user_id = auth.uid()
        and om.role in ('admin', 'engineer')
    )
  )
);

grant all on table public.project_messages to authenticated, service_role;
grant all on table public.project_message_attachments to authenticated, service_role;
grant all on table public.project_milestones to authenticated, service_role;
revoke all on table public.project_messages from anon;
revoke all on table public.project_message_attachments from anon;
revoke all on table public.project_milestones from anon;

commit;
