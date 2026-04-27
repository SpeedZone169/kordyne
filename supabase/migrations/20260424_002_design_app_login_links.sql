create table if not exists public.design_app_login_links (
  id uuid primary key default gen_random_uuid(),
  client_type text not null check (client_type in ('fusion')),
  link_code text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'consumed', 'expired', 'cancelled')),
  approved_by_user_id uuid null references auth.users(id) on delete set null,
  organization_id uuid null references public.organizations(id) on delete set null,
  role text null,
  encrypted_access_token text null,
  created_at timestamptz not null default now(),
  approved_at timestamptz null,
  consumed_at timestamptz null,
  expires_at timestamptz not null default (now() + interval '10 minutes')
);

create index if not exists design_app_login_links_status_idx
  on public.design_app_login_links(status);

create index if not exists design_app_login_links_expires_at_idx
  on public.design_app_login_links(expires_at);