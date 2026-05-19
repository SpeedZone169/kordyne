begin;

alter table public.organizations
  add column if not exists aps_monthly_translation_quota integer not null default 25;

alter table public.organizations
  drop constraint if exists organizations_aps_monthly_translation_quota_check;

alter table public.organizations
  add constraint organizations_aps_monthly_translation_quota_check
  check (aps_monthly_translation_quota >= 0);

create table if not exists public.organization_aps_translation_usage (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  month_start date not null,
  monthly_quota integer not null,
  translations_started integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, month_start),
  constraint organization_aps_translation_usage_quota_check
    check (monthly_quota >= 0),
  constraint organization_aps_translation_usage_started_check
    check (translations_started >= 0)
);

drop trigger if exists set_organization_aps_translation_usage_updated_at
on public.organization_aps_translation_usage;

create trigger set_organization_aps_translation_usage_updated_at
before update on public.organization_aps_translation_usage
for each row execute function public.set_current_timestamp_updated_at();

create table if not exists public.aps_derivatives (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  part_file_id uuid references public.part_files(id) on delete cascade,
  provider_package_file_id uuid references public.provider_package_files(id) on delete cascade,
  source_type text not null,
  source_file_name text,
  source_storage_path text,
  aps_object_key text,
  aps_object_id text,
  aps_urn text,
  status text not null default 'queued',
  progress text,
  manifest_json jsonb,
  last_error text,
  requested_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_prepared_at timestamptz,
  last_translated_at timestamptz,
  constraint aps_derivatives_source_type_check
    check (source_type in ('part_file', 'provider_package_file')),
  constraint aps_derivatives_status_check
    check (status in ('queued', 'uploaded', 'translating', 'ready', 'failed')),
  constraint aps_derivatives_single_source_check
    check (
      (source_type = 'part_file'
        and part_file_id is not null
        and provider_package_file_id is null)
      or
      (source_type = 'provider_package_file'
        and provider_package_file_id is not null
        and part_file_id is null)
    )
);

create unique index if not exists aps_derivatives_part_file_uidx
  on public.aps_derivatives (part_file_id)
  where part_file_id is not null;

create unique index if not exists aps_derivatives_provider_package_file_uidx
  on public.aps_derivatives (provider_package_file_id)
  where provider_package_file_id is not null;

create index if not exists aps_derivatives_org_status_idx
  on public.aps_derivatives (organization_id, status, updated_at desc);

drop trigger if exists set_aps_derivatives_updated_at on public.aps_derivatives;

create trigger set_aps_derivatives_updated_at
before update on public.aps_derivatives
for each row execute function public.set_current_timestamp_updated_at();

alter table public.organization_aps_translation_usage enable row level security;
alter table public.aps_derivatives enable row level security;

drop policy if exists organization_aps_usage_select_org_members
on public.organization_aps_translation_usage;

create policy organization_aps_usage_select_org_members
on public.organization_aps_translation_usage
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = organization_aps_translation_usage.organization_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists aps_derivatives_select_org_members
on public.aps_derivatives;

create policy aps_derivatives_select_org_members
on public.aps_derivatives
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = aps_derivatives.organization_id
      and om.user_id = auth.uid()
  )
);

create or replace function public.reserve_aps_translation_quota(
  p_organization_id uuid
)
returns table (
  allowed boolean,
  quota integer,
  used integer,
  remaining integer,
  month_start date
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quota integer;
  v_used integer;
  v_month_start date := date_trunc('month', now())::date;
begin
  select o.aps_monthly_translation_quota
    into v_quota
  from public.organizations o
  where o.id = p_organization_id;

  if v_quota is null then
    raise exception 'Organization not found.';
  end if;

  insert into public.organization_aps_translation_usage (
    organization_id,
    month_start,
    monthly_quota,
    translations_started
  )
  values (
    p_organization_id,
    v_month_start,
    v_quota,
    0
  )
  on conflict (organization_id, month_start)
  do update set
    monthly_quota = excluded.monthly_quota,
    updated_at = now()
  returning translations_started into v_used;

  if v_used >= v_quota then
    return query
    select
      false,
      v_quota,
      v_used,
      greatest(v_quota - v_used, 0),
      v_month_start;
    return;
  end if;

  update public.organization_aps_translation_usage u
  set
    translations_started = u.translations_started + 1,
    monthly_quota = v_quota,
    updated_at = now()
  where u.organization_id = p_organization_id
    and u.month_start = v_month_start
    and u.translations_started < v_quota
  returning u.translations_started into v_used;

  if v_used is null then
    select u.translations_started
      into v_used
    from public.organization_aps_translation_usage u
    where u.organization_id = p_organization_id
      and u.month_start = v_month_start;

    return query
    select
      false,
      v_quota,
      coalesce(v_used, 0),
      greatest(v_quota - coalesce(v_used, 0), 0),
      v_month_start;
    return;
  end if;

  return query
  select
    true,
    v_quota,
    v_used,
    greatest(v_quota - v_used, 0),
    v_month_start;
end;
$$;

revoke all on function public.reserve_aps_translation_quota(uuid)
from public, anon, authenticated;

grant execute on function public.reserve_aps_translation_quota(uuid)
to service_role;

grant select on table public.organization_aps_translation_usage
to authenticated;

grant all on table public.organization_aps_translation_usage
to service_role;

grant select on table public.aps_derivatives
to authenticated;

grant all on table public.aps_derivatives
to service_role;

revoke all on table public.organization_aps_translation_usage from anon;
revoke all on table public.aps_derivatives from anon;

commit;
