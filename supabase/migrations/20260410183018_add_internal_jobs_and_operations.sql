begin;

-- 1) internal_jobs
create table if not exists public.internal_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  title text not null,
  service_domain text not null,
  job_type text not null default 'manufacturing',
  source_reference_type text,
  source_reference_id uuid,
  required_quantity integer not null default 1,
  priority text not null default 'normal',
  due_at timestamptz,
  status text not null default 'draft',
  routing_decision text not null default 'pending',
  routing_confidence numeric(5,4),
  routing_reason text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint internal_jobs_service_domain_check
    check (
      service_domain in (
        'additive',
        'cnc',
        'cad',
        'scanning',
        'composites',
        'sheet_metal',
        'qa',
        'finishing',
        'assembly',
        'general'
      )
    ),

  constraint internal_jobs_job_type_check
    check (
      job_type in (
        'manufacturing',
        'service',
        'inspection',
        'mixed'
      )
    ),

  constraint internal_jobs_source_reference_type_check
    check (
      source_reference_type is null
      or source_reference_type in (
        'part',
        'service_request',
        'provider_package',
        'manual'
      )
    ),

  constraint internal_jobs_required_quantity_check
    check (required_quantity >= 1),

  constraint internal_jobs_priority_check
    check (
      priority in (
        'low',
        'normal',
        'high',
        'urgent'
      )
    ),

  constraint internal_jobs_status_check
    check (
      status in (
        'draft',
        'ready',
        'queued',
        'in_progress',
        'blocked',
        'completed',
        'cancelled'
      )
    ),

  constraint internal_jobs_routing_decision_check
    check (
      routing_decision in (
        'pending',
        'internal_selected',
        'external_selected',
        'manual_review'
      )
    ),

  constraint internal_jobs_routing_confidence_check
    check (
      routing_confidence is null
      or (routing_confidence >= 0 and routing_confidence <= 1)
    )
);

create index if not exists internal_jobs_organization_id_idx
  on public.internal_jobs (organization_id);

create index if not exists internal_jobs_service_domain_idx
  on public.internal_jobs (service_domain);

create index if not exists internal_jobs_status_idx
  on public.internal_jobs (status);

create index if not exists internal_jobs_due_at_idx
  on public.internal_jobs (due_at);

create index if not exists internal_jobs_source_reference_idx
  on public.internal_jobs (source_reference_type, source_reference_id);


-- 2) internal_job_operations
create table if not exists public.internal_job_operations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  job_id uuid not null references public.internal_jobs(id) on delete cascade,
  sequence_no integer not null,
  operation_type text not null,
  service_domain text not null,
  capability_id uuid references public.internal_capabilities(id) on delete set null,
  status text not null default 'queued',
  estimated_setup_minutes integer,
  estimated_run_minutes integer,
  required_quantity integer,
  can_run_in_parallel boolean not null default false,
  predecessor_operation_id uuid references public.internal_job_operations(id) on delete set null,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint internal_job_operations_sequence_no_check
    check (sequence_no >= 1),

  constraint internal_job_operations_operation_type_check
    check (
      operation_type in (
        'cad',
        'scan',
        'print',
        'machine',
        'sheet_metal_cut',
        'sheet_metal_form',
        'composite_layup',
        'cure',
        'inspection',
        'finishing',
        'assembly',
        'packing',
        'custom'
      )
    ),

  constraint internal_job_operations_service_domain_check
    check (
      service_domain in (
        'additive',
        'cnc',
        'cad',
        'scanning',
        'composites',
        'sheet_metal',
        'qa',
        'finishing',
        'assembly',
        'general'
      )
    ),

  constraint internal_job_operations_status_check
    check (
      status in (
        'queued',
        'ready',
        'in_progress',
        'paused',
        'blocked',
        'completed',
        'cancelled'
      )
    ),

  constraint internal_job_operations_estimated_setup_minutes_check
    check (
      estimated_setup_minutes is null
      or estimated_setup_minutes >= 0
    ),

  constraint internal_job_operations_estimated_run_minutes_check
    check (
      estimated_run_minutes is null
      or estimated_run_minutes >= 0
    ),

  constraint internal_job_operations_required_quantity_check
    check (
      required_quantity is null
      or required_quantity >= 1
    )
);

create unique index if not exists internal_job_operations_job_sequence_unique
  on public.internal_job_operations (job_id, sequence_no);

create index if not exists internal_job_operations_organization_id_idx
  on public.internal_job_operations (organization_id);

create index if not exists internal_job_operations_job_id_idx
  on public.internal_job_operations (job_id);

create index if not exists internal_job_operations_capability_id_idx
  on public.internal_job_operations (capability_id);

create index if not exists internal_job_operations_status_idx
  on public.internal_job_operations (status);


-- 3) internal_operation_assignments
create table if not exists public.internal_operation_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  operation_id uuid not null references public.internal_job_operations(id) on delete cascade,
  resource_id uuid not null references public.internal_resources(id),
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'planned',
  confidence_score numeric(5,4),
  risk_level text,
  assignment_reason text,
  created_by text not null default 'system',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint internal_operation_assignments_status_check
    check (
      status in (
        'planned',
        'confirmed',
        'in_progress',
        'paused',
        'completed',
        'cancelled'
      )
    ),

  constraint internal_operation_assignments_confidence_score_check
    check (
      confidence_score is null
      or (confidence_score >= 0 and confidence_score <= 1)
    ),

  constraint internal_operation_assignments_risk_level_check
    check (
      risk_level is null
      or risk_level in (
        'low',
        'medium',
        'high'
      )
    ),

  constraint internal_operation_assignments_created_by_check
    check (
      created_by in (
        'system',
        'manual',
        'integration'
      )
    ),

  constraint internal_operation_assignments_time_window_check
    check (
      starts_at is null
      or ends_at is null
      or ends_at > starts_at
    )
);

create index if not exists internal_operation_assignments_organization_id_idx
  on public.internal_operation_assignments (organization_id);

create index if not exists internal_operation_assignments_operation_id_idx
  on public.internal_operation_assignments (operation_id);

create index if not exists internal_operation_assignments_resource_id_idx
  on public.internal_operation_assignments (resource_id);

create index if not exists internal_operation_assignments_starts_at_idx
  on public.internal_operation_assignments (starts_at);

create index if not exists internal_operation_assignments_status_idx
  on public.internal_operation_assignments (status);


-- 4) internal_routing_decisions
create table if not exists public.internal_routing_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  job_id uuid not null references public.internal_jobs(id) on delete cascade,
  decision text not null,
  score numeric(5,4),
  summary text,
  explanation jsonb not null default '{}'::jsonb,
  evaluated_at timestamptz not null default now(),
  evaluated_by text not null default 'system',
  created_at timestamptz not null default now(),

  constraint internal_routing_decisions_decision_check
    check (
      decision in (
        'internal_selected',
        'external_selected',
        'manual_review'
      )
    ),

  constraint internal_routing_decisions_score_check
    check (
      score is null
      or (score >= 0 and score <= 1)
    ),

  constraint internal_routing_decisions_evaluated_by_check
    check (
      evaluated_by in (
        'system',
        'manual',
        'integration'
      )
    )
);

create index if not exists internal_routing_decisions_organization_id_idx
  on public.internal_routing_decisions (organization_id);

create index if not exists internal_routing_decisions_job_id_idx
  on public.internal_routing_decisions (job_id);

create index if not exists internal_routing_decisions_evaluated_at_idx
  on public.internal_routing_decisions (evaluated_at desc);


-- 5) enable RLS
alter table public.internal_jobs enable row level security;
alter table public.internal_job_operations enable row level security;
alter table public.internal_operation_assignments enable row level security;
alter table public.internal_routing_decisions enable row level security;


-- 6) read-only select policies
drop policy if exists internal_jobs_select on public.internal_jobs;
create policy internal_jobs_select
  on public.internal_jobs
  for select
  using (public.is_org_member(organization_id));

drop policy if exists internal_job_operations_select on public.internal_job_operations;
create policy internal_job_operations_select
  on public.internal_job_operations
  for select
  using (public.is_org_member(organization_id));

drop policy if exists internal_operation_assignments_select on public.internal_operation_assignments;
create policy internal_operation_assignments_select
  on public.internal_operation_assignments
  for select
  using (public.is_org_member(organization_id));

drop policy if exists internal_routing_decisions_select on public.internal_routing_decisions;
create policy internal_routing_decisions_select
  on public.internal_routing_decisions
  for select
  using (public.is_org_member(organization_id));

commit;