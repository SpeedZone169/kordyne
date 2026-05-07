-- Idempotency guard for CAD connector publish actions.
-- Prevents duplicate parts if a connector sends the same publish request twice.

create table if not exists public.design_app_publish_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider_key text not null,
  idempotency_key text not null,
  status text not null default 'processing',
  part_id uuid null references public.parts(id) on delete set null,
  part_family_id uuid null references public.part_families(id) on delete set null,
  response jsonb null,
  error text null,
  created_by_user_id uuid null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint design_app_publish_idempotency_status_check
    check (status in ('processing', 'completed', 'failed')),

  constraint design_app_publish_idempotency_unique_key
    unique (organization_id, provider_key, idempotency_key)
);

create index if not exists design_app_publish_idempotency_lookup_idx
  on public.design_app_publish_idempotency_keys (
    organization_id,
    provider_key,
    idempotency_key
  );

alter table public.design_app_publish_idempotency_keys enable row level security;
