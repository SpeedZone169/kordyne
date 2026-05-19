begin;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  project_type text not null default 'multi_part_project',
  status text not null default 'active',
  created_by_user_id uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint projects_name_not_empty check (char_length(btrim(name)) > 0),
  constraint projects_project_type_check
    check (project_type in ('multi_part_project', 'single_part_workspace')),
  constraint projects_status_check
    check (status in ('active', 'archived'))
);

create index if not exists projects_organization_type_status_idx
  on public.projects (organization_id, project_type, status, updated_at desc);

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
before update on public.projects
for each row execute function public.set_current_timestamp_updated_at();

create table if not exists public.project_part_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  part_id uuid not null references public.parts(id) on delete cascade,
  part_family_id uuid references public.part_families(id) on delete set null,
  is_primary_part boolean not null default false,
  linked_by_user_id uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  unique (project_id, part_id)
);

create index if not exists project_part_links_project_idx
  on public.project_part_links (project_id, is_primary_part desc, created_at desc);

create index if not exists project_part_links_part_idx
  on public.project_part_links (part_id, created_at desc);

create unique index if not exists project_part_links_one_primary_idx
  on public.project_part_links (project_id)
  where is_primary_part;

create table if not exists public.part_external_shares (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references public.parts(id) on delete cascade,
  part_family_id uuid references public.part_families(id) on delete set null,
  owner_org_id uuid not null references public.organizations(id) on delete cascade,
  external_email text,
  external_user_id uuid references public.profiles(user_id) on delete set null,
  external_organization_id uuid references public.organizations(id) on delete set null,
  share_policy text not null default 'metadata_only',
  status text not null default 'invited',
  invited_by uuid references public.profiles(user_id) on delete set null,
  access_expires_at timestamptz,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz,
  constraint part_external_shares_target_check
    check (
      external_email is not null
      or external_user_id is not null
      or external_organization_id is not null
    ),
  constraint part_external_shares_policy_check
    check (
      share_policy in (
        'metadata_only',
        'preview_only',
        'selected_files',
        'downloadable_selected_files'
      )
    ),
  constraint part_external_shares_status_check
    check (status in ('invited', 'active', 'revoked', 'expired'))
);

create index if not exists part_external_shares_part_idx
  on public.part_external_shares (part_id, status, created_at desc);

create index if not exists part_external_shares_owner_org_idx
  on public.part_external_shares (owner_org_id, status, created_at desc);

create table if not exists public.part_external_file_grants (
  id uuid primary key default gen_random_uuid(),
  part_share_id uuid not null references public.part_external_shares(id) on delete cascade,
  part_id uuid not null references public.parts(id) on delete cascade,
  part_file_id uuid not null references public.part_files(id) on delete cascade,
  can_preview boolean not null default true,
  can_download boolean not null default false,
  granted_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (part_share_id, part_file_id)
);

create index if not exists part_external_file_grants_share_idx
  on public.part_external_file_grants (part_share_id, revoked_at);

alter table public.projects enable row level security;
alter table public.project_part_links enable row level security;
alter table public.part_external_shares enable row level security;
alter table public.part_external_file_grants enable row level security;

drop policy if exists projects_select_org_members on public.projects;
create policy projects_select_org_members
on public.projects
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = projects.organization_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists projects_manage_org_engineers on public.projects;
create policy projects_manage_org_engineers
on public.projects
for all
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = projects.organization_id
      and om.user_id = auth.uid()
      and om.role in ('admin', 'engineer')
  )
)
with check (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = projects.organization_id
      and om.user_id = auth.uid()
      and om.role in ('admin', 'engineer')
  )
);

drop policy if exists project_part_links_select_org_members on public.project_part_links;
create policy project_part_links_select_org_members
on public.project_part_links
for select
to authenticated
using (
  exists (
    select 1
    from public.projects p
    join public.organization_members om
      on om.organization_id = p.organization_id
    where p.id = project_part_links.project_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists project_part_links_manage_org_engineers on public.project_part_links;
create policy project_part_links_manage_org_engineers
on public.project_part_links
for all
to authenticated
using (
  exists (
    select 1
    from public.projects p
    join public.organization_members om
      on om.organization_id = p.organization_id
    where p.id = project_part_links.project_id
      and om.user_id = auth.uid()
      and om.role in ('admin', 'engineer')
  )
)
with check (
  exists (
    select 1
    from public.projects p
    join public.parts part
      on part.id = project_part_links.part_id
    join public.organization_members om
      on om.organization_id = p.organization_id
    where p.id = project_part_links.project_id
      and part.organization_id = p.organization_id
      and om.user_id = auth.uid()
      and om.role in ('admin', 'engineer')
  )
);

drop policy if exists part_external_shares_select_owner_org on public.part_external_shares;
create policy part_external_shares_select_owner_org
on public.part_external_shares
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = part_external_shares.owner_org_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists part_external_shares_manage_owner_org on public.part_external_shares;
create policy part_external_shares_manage_owner_org
on public.part_external_shares
for all
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = part_external_shares.owner_org_id
      and om.user_id = auth.uid()
      and om.role in ('admin', 'engineer')
  )
)
with check (
  exists (
    select 1
    from public.parts part
    join public.organization_members om
      on om.organization_id = part.organization_id
    where part.id = part_external_shares.part_id
      and part.organization_id = part_external_shares.owner_org_id
      and om.user_id = auth.uid()
      and om.role in ('admin', 'engineer')
  )
);

drop policy if exists part_external_file_grants_select_owner_org on public.part_external_file_grants;
create policy part_external_file_grants_select_owner_org
on public.part_external_file_grants
for select
to authenticated
using (
  exists (
    select 1
    from public.part_external_shares share
    join public.organization_members om
      on om.organization_id = share.owner_org_id
    where share.id = part_external_file_grants.part_share_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists part_external_file_grants_manage_owner_org on public.part_external_file_grants;
create policy part_external_file_grants_manage_owner_org
on public.part_external_file_grants
for all
to authenticated
using (
  exists (
    select 1
    from public.part_external_shares share
    join public.organization_members om
      on om.organization_id = share.owner_org_id
    where share.id = part_external_file_grants.part_share_id
      and om.user_id = auth.uid()
      and om.role in ('admin', 'engineer')
  )
)
with check (
  exists (
    select 1
    from public.part_external_shares share
    join public.part_files file
      on file.id = part_external_file_grants.part_file_id
    join public.organization_members om
      on om.organization_id = share.owner_org_id
    where share.id = part_external_file_grants.part_share_id
      and share.part_id = part_external_file_grants.part_id
      and file.part_id = share.part_id
      and om.user_id = auth.uid()
      and om.role in ('admin', 'engineer')
  )
);

create or replace function public.create_project_from_part(
  p_part_id uuid,
  p_name text default null::text,
  p_project_type text default 'multi_part_project'::text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_part public.parts%rowtype;
  v_role text;
  v_project_id uuid;
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_project_type not in ('multi_part_project', 'single_part_workspace') then
    raise exception 'Invalid project type';
  end if;

  select *
  into v_part
  from public.parts
  where id = p_part_id;

  if v_part.id is null then
    raise exception 'Part not found';
  end if;

  select om.role
  into v_role
  from public.organization_members om
  where om.organization_id = v_part.organization_id
    and om.user_id = v_user_id
  limit 1;

  if v_role not in ('admin', 'engineer') then
    raise exception 'Only admins and engineers can create projects from parts';
  end if;

  insert into public.projects (
    organization_id,
    name,
    description,
    project_type,
    status,
    created_by_user_id
  )
  values (
    v_part.organization_id,
    coalesce(nullif(btrim(p_name), ''), concat_ws(' ', v_part.part_number, v_part.name)),
    case
      when p_project_type = 'single_part_workspace'
        then 'Controlled part workspace created from the Parts Vault.'
      else 'Project created from a Parts Vault revision.'
    end,
    p_project_type,
    'active',
    v_user_id
  )
  returning id into v_project_id;

  insert into public.project_part_links (
    project_id,
    part_id,
    part_family_id,
    is_primary_part,
    linked_by_user_id
  )
  values (
    v_project_id,
    v_part.id,
    v_part.part_family_id,
    true,
    v_user_id
  );

  return v_project_id;
end;
$$;

create or replace function public.add_part_to_project(
  p_project_id uuid,
  p_part_id uuid,
  p_is_primary_part boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_project public.projects%rowtype;
  v_part public.parts%rowtype;
  v_role text;
  v_link_id uuid;
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  select *
  into v_project
  from public.projects
  where id = p_project_id;

  if v_project.id is null then
    raise exception 'Project not found';
  end if;

  select *
  into v_part
  from public.parts
  where id = p_part_id;

  if v_part.id is null then
    raise exception 'Part not found';
  end if;

  if v_part.organization_id <> v_project.organization_id then
    raise exception 'Part and project must belong to the same organization';
  end if;

  select om.role
  into v_role
  from public.organization_members om
  where om.organization_id = v_project.organization_id
    and om.user_id = v_user_id
  limit 1;

  if v_role not in ('admin', 'engineer') then
    raise exception 'Only admins and engineers can add parts to projects';
  end if;

  if p_is_primary_part then
    update public.project_part_links
    set is_primary_part = false
    where project_id = p_project_id;
  end if;

  insert into public.project_part_links (
    project_id,
    part_id,
    part_family_id,
    is_primary_part,
    linked_by_user_id
  )
  values (
    p_project_id,
    p_part_id,
    v_part.part_family_id,
    p_is_primary_part,
    v_user_id
  )
  on conflict (project_id, part_id) do update
  set
    part_family_id = excluded.part_family_id,
    is_primary_part = excluded.is_primary_part
  returning id into v_link_id;

  return v_link_id;
end;
$$;

revoke all on function public.create_project_from_part(uuid, text, text) from public, anon;
revoke all on function public.add_part_to_project(uuid, uuid, boolean) from public, anon;
grant execute on function public.create_project_from_part(uuid, text, text) to authenticated, service_role;
grant execute on function public.add_part_to_project(uuid, uuid, boolean) to authenticated, service_role;

grant all on table public.projects to authenticated, service_role;
grant all on table public.project_part_links to authenticated, service_role;
grant all on table public.part_external_shares to authenticated, service_role;
grant all on table public.part_external_file_grants to authenticated, service_role;
revoke all on table public.projects from anon;
revoke all on table public.project_part_links from anon;
revoke all on table public.part_external_shares from anon;
revoke all on table public.part_external_file_grants from anon;

commit;
