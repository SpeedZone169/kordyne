begin;

create table if not exists public.provider_access_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  company text not null,
  website text,
  country text not null,
  capabilities text not null,
  certifications text,
  message text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  review_notes text,
  reviewed_by_user_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  provider_organization_id uuid references public.organizations(id) on delete set null,
  provider_invite_id uuid references public.organization_invites(id) on delete set null,
  notification_sent_at timestamptz,
  notification_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists provider_access_requests_status_created_idx
  on public.provider_access_requests (status, created_at desc);

alter table public.provider_access_requests enable row level security;

revoke all on table public.provider_access_requests from public;
revoke all on table public.provider_access_requests from anon;
revoke all on table public.provider_access_requests from authenticated;
grant all on table public.provider_access_requests to service_role;

create or replace function public.approve_provider_access_request(
  p_request_id uuid,
  p_customer_org_id uuid,
  p_provider_slug text,
  p_provider_code text,
  p_reviewed_by_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request public.provider_access_requests%rowtype;
  v_provider_org_id uuid;
  v_invite_id uuid;
  v_invite_token uuid;
begin
  if p_request_id is null or p_customer_org_id is null or p_reviewed_by_user_id is null then
    raise exception 'Request, customer organization, and reviewer are required.';
  end if;

  select *
  into v_request
  from public.provider_access_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Provider access request not found.';
  end if;

  if v_request.status = 'rejected' then
    raise exception 'Rejected provider requests cannot be approved.';
  end if;

  if v_request.status = 'approved'
     and v_request.provider_organization_id is not null
     and v_request.provider_invite_id is not null then
    select token
    into v_invite_token
    from public.organization_invites
    where id = v_request.provider_invite_id;

    return jsonb_build_object(
      'provider_org_id', v_request.provider_organization_id,
      'invite_id', v_request.provider_invite_id,
      'invite_token', v_invite_token,
      'invite_email', v_request.email,
      'contact_name', v_request.full_name,
      'provider_name', v_request.company
    );
  end if;

  perform 1
  from public.organizations
  where id = p_customer_org_id;

  if not found then
    raise exception 'Customer organization not found.';
  end if;

  insert into public.organizations (
    name,
    slug,
    onboarding_status
  )
  values (
    v_request.company,
    nullif(trim(p_provider_slug), ''),
    'invited'
  )
  returning id into v_provider_org_id;

  insert into public.provider_profiles (
    organization_id,
    website,
    country,
    short_description,
    certifications,
    capabilities_summary
  )
  values (
    v_provider_org_id,
    nullif(v_request.website, ''),
    nullif(v_request.country, ''),
    nullif(v_request.message, ''),
    nullif(v_request.certifications, ''),
    nullif(v_request.capabilities, '')
  );

  insert into public.provider_relationships (
    customer_org_id,
    provider_org_id,
    relationship_status,
    trust_status,
    provider_code,
    created_by_user_id,
    internal_notes
  )
  values (
    p_customer_org_id,
    v_provider_org_id,
    'invited',
    'pending_review',
    nullif(trim(p_provider_code), ''),
    p_reviewed_by_user_id,
    'Created from provider access request ' || p_request_id::text
  );

  insert into public.organization_invites (
    organization_id,
    email,
    role,
    status,
    invited_by_user_id
  )
  values (
    v_provider_org_id,
    lower(trim(v_request.email)),
    'admin',
    'pending',
    p_reviewed_by_user_id
  )
  returning id, token into v_invite_id, v_invite_token;

  update public.provider_access_requests
  set
    status = 'approved',
    reviewed_by_user_id = p_reviewed_by_user_id,
    reviewed_at = now(),
    provider_organization_id = v_provider_org_id,
    provider_invite_id = v_invite_id,
    updated_at = now()
  where id = p_request_id;

  return jsonb_build_object(
    'provider_org_id', v_provider_org_id,
    'invite_id', v_invite_id,
    'invite_token', v_invite_token,
    'invite_email', v_request.email,
    'contact_name', v_request.full_name,
    'provider_name', v_request.company
  );
end;
$$;

revoke all on function public.approve_provider_access_request(
  uuid,
  uuid,
  text,
  text,
  uuid
) from public;
revoke all on function public.approve_provider_access_request(
  uuid,
  uuid,
  text,
  text,
  uuid
) from anon;
revoke all on function public.approve_provider_access_request(
  uuid,
  uuid,
  text,
  text,
  uuid
) from authenticated;
grant execute on function public.approve_provider_access_request(
  uuid,
  uuid,
  text,
  text,
  uuid
) to service_role;

commit;
