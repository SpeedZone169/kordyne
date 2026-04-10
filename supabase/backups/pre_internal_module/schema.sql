


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."provider_file_source_type" AS ENUM (
    'part_file',
    'service_request_uploaded_file',
    'provider_upload'
);


ALTER TYPE "public"."provider_file_source_type" OWNER TO "postgres";


CREATE TYPE "public"."provider_message_type" AS ENUM (
    'message',
    'question',
    'clarification',
    'status_update',
    'issue',
    'delivery_update',
    'system_event'
);


ALTER TYPE "public"."provider_message_type" OWNER TO "postgres";


CREATE TYPE "public"."provider_package_status" AS ENUM (
    'draft',
    'published',
    'viewed',
    'awaiting_provider_response',
    'declined',
    'quote_submitted',
    'quote_revised',
    'awarded',
    'not_awarded',
    'scheduled',
    'in_production',
    'completed',
    'dispatched',
    'delivered',
    'issue_raised',
    'closed',
    'cancelled',
    'on_hold'
);


ALTER TYPE "public"."provider_package_status" OWNER TO "postgres";


CREATE TYPE "public"."provider_quote_status" AS ENUM (
    'draft',
    'submitted',
    'superseded',
    'accepted',
    'rejected',
    'withdrawn',
    'expired'
);


ALTER TYPE "public"."provider_quote_status" OWNER TO "postgres";


CREATE TYPE "public"."provider_readiness_status" AS ENUM (
    'ready',
    'blocked',
    'awaiting_material',
    'awaiting_file_clarification',
    'awaiting_revision_confirmation',
    'awaiting_capacity',
    'awaiting_approval'
);


ALTER TYPE "public"."provider_readiness_status" OWNER TO "postgres";


CREATE TYPE "public"."provider_relationship_status" AS ENUM (
    'invited',
    'active',
    'suspended',
    'archived'
);


ALTER TYPE "public"."provider_relationship_status" OWNER TO "postgres";


CREATE TYPE "public"."provider_round_mode" AS ENUM (
    'competitive_quote',
    'direct_award'
);


ALTER TYPE "public"."provider_round_mode" OWNER TO "postgres";


CREATE TYPE "public"."provider_round_status" AS ENUM (
    'draft',
    'published',
    'responses_open',
    'comparison_ready',
    'awarded',
    'closed',
    'cancelled'
);


ALTER TYPE "public"."provider_round_status" OWNER TO "postgres";


CREATE TYPE "public"."provider_schedule_visibility" AS ENUM (
    'hidden',
    'milestones_only',
    'dates_only',
    'full'
);


ALTER TYPE "public"."provider_schedule_visibility" OWNER TO "postgres";


CREATE TYPE "public"."provider_trust_status" AS ENUM (
    'pending_review',
    'approved',
    'probation',
    'blocked'
);


ALTER TYPE "public"."provider_trust_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_invite"("invite_token" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  invite_row public.organization_invites%rowtype;
  current_email text;
  org_name text;
  existing_membership public.organization_members%rowtype;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in to accept an invite.';
  end if;

  select *
  into invite_row
  from public.organization_invites
  where token = invite_token
  limit 1;

  if invite_row.id is null then
    raise exception 'Invite not found.';
  end if;

  if invite_row.status <> 'pending' then
    raise exception 'This invite is no longer pending.';
  end if;

  select email
  into current_email
  from auth.users
  where id = auth.uid();

  if current_email is null then
    raise exception 'Unable to verify current user email.';
  end if;

  if lower(current_email) <> lower(invite_row.email) then
    raise exception 'This invite does not match your email address.';
  end if;

  select *
  into existing_membership
  from public.organization_members
  where user_id = auth.uid()
  limit 1;

  if existing_membership.id is not null
     and existing_membership.organization_id <> invite_row.organization_id then
    raise exception 'Your account already belongs to another organization.';
  end if;

  insert into public.organization_members (
    organization_id,
    user_id,
    role
  )
  values (
    invite_row.organization_id,
    auth.uid(),
    invite_row.role
  )
  on conflict (user_id) do update
  set role = excluded.role;

  select name
  into org_name
  from public.organizations
  where id = invite_row.organization_id;

  update public.profiles
  set
    company = org_name,
    updated_at = now()
  where user_id = auth.uid();

  update public.organization_invites
  set
    status = 'accepted',
    accepted_at = now()
  where id = invite_row.id;

  return 'Invite accepted.';
end;
$$;


ALTER FUNCTION "public"."accept_invite"("invite_token" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_access_provider_package"("target_package_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    public.can_customer_access_provider_package(target_package_id)
    or public.can_provider_access_provider_package(target_package_id);
$$;


ALTER FUNCTION "public"."can_access_provider_package"("target_package_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_access_provider_round"("target_round_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    public.can_customer_access_provider_round(target_round_id)
    or public.can_provider_access_provider_round(target_round_id);
$$;


ALTER FUNCTION "public"."can_access_provider_round"("target_round_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_customer_access_provider_package"("target_package_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from provider_request_packages prp
    where prp.id = target_package_id
      and public.is_org_member(prp.customer_org_id)
  );
$$;


ALTER FUNCTION "public"."can_customer_access_provider_package"("target_package_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_customer_access_provider_round"("target_round_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from provider_quote_rounds pqr
    where pqr.id = target_round_id
      and public.is_org_member(pqr.customer_org_id)
  );
$$;


ALTER FUNCTION "public"."can_customer_access_provider_round"("target_round_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_provider_access_provider_package"("target_package_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from provider_request_packages prp
    where prp.id = target_package_id
      and public.is_org_member(prp.provider_org_id)
      and prp.published_at is not null
  );
$$;


ALTER FUNCTION "public"."can_provider_access_provider_package"("target_package_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_provider_access_provider_round"("target_round_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from provider_request_packages prp
    where prp.provider_quote_round_id = target_round_id
      and public.is_org_member(prp.provider_org_id)
      and prp.published_at is not null
  );
$$;


ALTER FUNCTION "public"."can_provider_access_provider_round"("target_round_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_part_from_service_request"("p_request_id" "uuid", "p_name" "text", "p_part_number" "text" DEFAULT NULL::"text", "p_description" "text" DEFAULT NULL::"text", "p_process_type" "text" DEFAULT NULL::"text", "p_material" "text" DEFAULT NULL::"text", "p_category" "text" DEFAULT NULL::"text", "p_status" "text" DEFAULT 'draft'::"text", "p_revision_scheme" "text" DEFAULT 'alphabetic'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid;
  v_role text;
  v_request record;
  v_family_id uuid;
  v_part_id uuid;
  v_revision text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  select
    sr.id,
    sr.organization_id,
    sr.status
  into v_request
  from public.service_requests sr
  where sr.id = p_request_id;

  if not found then
    raise exception 'Request not found';
  end if;

  if v_request.status not in ('draft', 'submitted', 'in_review', 'awaiting_customer') then
    raise exception 'This request can no longer be converted into a vault part';
  end if;

  select om.role
  into v_role
  from public.organization_members om
  where om.organization_id = v_request.organization_id
    and om.user_id = v_user_id
  limit 1;

  if v_role is null then
    raise exception 'You do not have access to this organization';
  end if;

  if v_role not in ('admin', 'engineer') then
    raise exception 'Only admins and engineers can create vault parts from requests';
  end if;

  if nullif(trim(coalesce(p_name, '')), '') is null then
    raise exception 'Part name is required';
  end if;

  if p_status not in ('draft', 'active', 'archived') then
    raise exception 'Invalid part status';
  end if;

  if p_revision_scheme not in ('alphabetic', 'numeric') then
    raise exception 'Invalid revision scheme';
  end if;

  v_family_id := gen_random_uuid();
  v_part_id := gen_random_uuid();
  v_revision := public.get_revision_label(p_revision_scheme, 1);

  insert into public.part_families (
    id,
    organization_id,
    name,
    part_number,
    revision_scheme
  )
  values (
    v_family_id,
    v_request.organization_id,
    trim(p_name),
    nullif(trim(p_part_number), ''),
    p_revision_scheme
  );

  insert into public.parts (
    id,
    user_id,
    organization_id,
    part_family_id,
    revision_created_from_part_id,
    revision_note,
    revision_index,
    name,
    part_number,
    description,
    process_type,
    material,
    revision,
    category,
    status
  )
  values (
    v_part_id,
    v_user_id,
    v_request.organization_id,
    v_family_id,
    null,
    'Created from service request',
    1,
    trim(p_name),
    nullif(trim(p_part_number), ''),
    nullif(trim(p_description), ''),
    nullif(trim(p_process_type), ''),
    nullif(trim(p_material), ''),
    v_revision,
    nullif(trim(p_category), ''),
    p_status
  );

  update public.service_requests
  set
    part_id = v_part_id,
    linked_to_part_at = now(),
    updated_at = now()
  where id = p_request_id;

  return v_part_id;
end;
$$;


ALTER FUNCTION "public"."create_part_from_service_request"("p_request_id" "uuid", "p_name" "text", "p_part_number" "text", "p_description" "text", "p_process_type" "text", "p_material" "text", "p_category" "text", "p_status" "text", "p_revision_scheme" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_part_revision"("p_source_part_id" "uuid", "p_revision_note" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid;
  v_source_part record;
  v_user_role text;
  v_new_part_id uuid;
  v_revision_scheme text;
  v_next_revision_index integer;
  v_next_revision_label text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  select
    p.id,
    p.organization_id,
    p.part_family_id,
    p.name,
    p.part_number,
    p.description,
    p.process_type,
    p.material,
    p.category
  into v_source_part
  from public.parts p
  where p.id = p_source_part_id;

  if not found then
    raise exception 'Source part not found';
  end if;

  select om.role
  into v_user_role
  from public.organization_members om
  where om.organization_id = v_source_part.organization_id
    and om.user_id = v_user_id;

  if v_user_role is null then
    raise exception 'You do not have access to this organization';
  end if;

  if v_user_role not in ('admin', 'engineer') then
    raise exception 'Only engineers and admins can create revisions';
  end if;

  select pf.revision_scheme
  into v_revision_scheme
  from public.part_families pf
  where pf.id = v_source_part.part_family_id
  for update;

  if v_revision_scheme is null then
    raise exception 'Revision scheme is not configured for this part family';
  end if;

  select coalesce(max(p.revision_index), 0) + 1
  into v_next_revision_index
  from public.parts p
  where p.part_family_id = v_source_part.part_family_id;

  v_next_revision_label := public.get_revision_label(
    v_revision_scheme,
    v_next_revision_index
  );

  insert into public.parts (
    user_id,
    organization_id,
    part_family_id,
    revision_created_from_part_id,
    revision_note,
    name,
    part_number,
    description,
    process_type,
    material,
    revision_index,
    revision,
    category,
    status
  )
  values (
    v_user_id,
    v_source_part.organization_id,
    v_source_part.part_family_id,
    v_source_part.id,
    nullif(btrim(p_revision_note), ''),
    v_source_part.name,
    v_source_part.part_number,
    v_source_part.description,
    v_source_part.process_type,
    v_source_part.material,
    v_next_revision_index,
    v_next_revision_label,
    v_source_part.category,
    'draft'
  )
  returning id into v_new_part_id;

  return v_new_part_id;
end;
$$;


ALTER FUNCTION "public"."create_part_revision"("p_source_part_id" "uuid", "p_revision_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_part_with_family"("p_name" "text", "p_part_number" "text" DEFAULT NULL::"text", "p_description" "text" DEFAULT NULL::"text", "p_process_type" "text" DEFAULT NULL::"text", "p_material" "text" DEFAULT NULL::"text", "p_revision_scheme" "text" DEFAULT 'alphabetic'::"text", "p_category" "text" DEFAULT NULL::"text", "p_status" "text" DEFAULT 'draft'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid;
  v_org_id uuid;
  v_user_role text;
  v_part_family_id uuid;
  v_part_id uuid;
  v_revision_label text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  select
    om.organization_id,
    om.role
  into
    v_org_id,
    v_user_role
  from public.organization_members om
  where om.user_id = v_user_id
  limit 1;

  if v_org_id is null then
    raise exception 'No organization membership found';
  end if;

  if v_user_role not in ('admin', 'engineer') then
    raise exception 'Only engineers and admins can create parts';
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception 'Part name is required';
  end if;

  if p_revision_scheme not in ('alphabetic', 'numeric') then
    raise exception 'Invalid revision scheme';
  end if;

  v_revision_label := public.get_revision_label(p_revision_scheme, 1);

  insert into public.part_families (
    organization_id,
    name,
    part_number,
    revision_scheme
  )
  values (
    v_org_id,
    btrim(p_name),
    nullif(btrim(p_part_number), ''),
    p_revision_scheme
  )
  returning id into v_part_family_id;

  insert into public.parts (
    user_id,
    organization_id,
    part_family_id,
    revision_created_from_part_id,
    revision_note,
    name,
    part_number,
    description,
    process_type,
    material,
    revision_index,
    revision,
    category,
    status
  )
  values (
    v_user_id,
    v_org_id,
    v_part_family_id,
    null,
    null,
    btrim(p_name),
    nullif(btrim(p_part_number), ''),
    nullif(btrim(p_description), ''),
    nullif(btrim(p_process_type), ''),
    nullif(btrim(p_material), ''),
    1,
    v_revision_label,
    nullif(btrim(p_category), ''),
    coalesce(nullif(btrim(p_status), ''), 'draft')
  )
  returning id into v_part_id;

  return v_part_id;
end;
$$;


ALTER FUNCTION "public"."create_part_with_family"("p_name" "text", "p_part_number" "text", "p_description" "text", "p_process_type" "text", "p_material" "text", "p_revision_scheme" "text", "p_category" "text", "p_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_service_request"("p_part_id" "uuid", "p_request_type" "text", "p_title" "text" DEFAULT NULL::"text", "p_notes" "text" DEFAULT NULL::"text", "p_priority" "text" DEFAULT 'normal'::"text", "p_due_date" "date" DEFAULT NULL::"date", "p_quantity" integer DEFAULT NULL::integer, "p_target_process" "text" DEFAULT NULL::"text", "p_target_material" "text" DEFAULT NULL::"text", "p_manufacturing_type" "text" DEFAULT NULL::"text", "p_cad_output_type" "text" DEFAULT NULL::"text", "p_optimization_goal" "text" DEFAULT NULL::"text", "p_source_reference_type" "text" DEFAULT 'existing_part_files'::"text", "p_request_meta" "jsonb" DEFAULT '{}'::"jsonb", "p_part_file_ids" "uuid"[] DEFAULT '{}'::"uuid"[]) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid;
  v_part record;
  v_request_id uuid;
  v_default_title text;
  v_requester_role text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  select
    p.id,
    p.organization_id,
    p.name,
    p.part_number
  into v_part
  from public.parts p
  where p.id = p_part_id;

  if not found then
    raise exception 'Part not found';
  end if;

  select om.role
  into v_requester_role
  from public.organization_members om
  where om.organization_id = v_part.organization_id
    and om.user_id = v_user_id
  limit 1;

  if v_requester_role is null then
    raise exception 'You do not have access to this organization';
  end if;

  if v_requester_role not in ('admin', 'engineer') then
    raise exception 'Only admins and engineers can create service requests';
  end if;

  if p_request_type not in ('manufacture_part', 'cad_creation', 'optimization') then
    raise exception 'Invalid request type';
  end if;

  if p_priority not in ('low', 'normal', 'high', 'urgent') then
    raise exception 'Invalid priority';
  end if;

  if p_manufacturing_type is not null
     and p_manufacturing_type not in (
       'prototype_3d_print',
       'cnc_spare_part',
       'composite_manufacturing',
       'other'
     ) then
    raise exception 'Invalid manufacturing type';
  end if;

  if p_cad_output_type is not null
     and p_cad_output_type not in ('3d', '2d', 'both') then
    raise exception 'Invalid CAD output type';
  end if;

  if p_optimization_goal is not null
     and p_optimization_goal not in (
       'cost',
       'manufacturability',
       'weight',
       'performance',
       'general'
     ) then
    raise exception 'Invalid optimization goal';
  end if;

  if p_source_reference_type not in (
    'existing_part_files',
    'uploaded_files',
    'mixed'
  ) then
    raise exception 'Invalid source reference type';
  end if;

  if p_quantity is not null and p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_part_file_ids, '{}'::uuid[])) as selected_file_id
    left join public.part_files pf
      on pf.id = selected_file_id
     and pf.part_id = v_part.id
    where pf.id is null
  ) then
    raise exception 'One or more selected files do not belong to this part';
  end if;

  v_default_title :=
    case
      when p_request_type = 'manufacture_part'
        then 'Manufacture request - ' || coalesce(v_part.part_number, v_part.name)
      when p_request_type = 'cad_creation'
        then 'CAD creation request - ' || coalesce(v_part.part_number, v_part.name)
      else
        'Optimization request - ' || coalesce(v_part.part_number, v_part.name)
    end;

  insert into public.service_requests (
    organization_id,
    part_id,
    requested_by_user_id,
    request_type,
    status,
    title,
    notes,
    priority,
    due_date,
    quantity,
    target_process,
    target_material,
    manufacturing_type,
    cad_output_type,
    optimization_goal,
    source_reference_type,
    request_meta,
    request_origin,
    requested_item_name,
    requested_item_reference,
    linked_to_part_at
  )
  values (
    v_part.organization_id,
    v_part.id,
    v_user_id,
    p_request_type,
    'submitted',
    coalesce(nullif(trim(p_title), ''), v_default_title),
    nullif(trim(p_notes), ''),
    p_priority,
    p_due_date,
    p_quantity,
    nullif(trim(p_target_process), ''),
    nullif(trim(p_target_material), ''),
    case when p_request_type = 'manufacture_part' then p_manufacturing_type else null end,
    case when p_request_type = 'cad_creation' then p_cad_output_type else null end,
    case when p_request_type = 'optimization' then p_optimization_goal else null end,
    p_source_reference_type,
    coalesce(p_request_meta, '{}'::jsonb),
    'vault',
    null,
    null,
    now()
  )
  returning id into v_request_id;

  insert into public.service_request_files (
    service_request_id,
    part_file_id,
    attached_by_user_id
  )
  select
    v_request_id,
    pf.id,
    v_user_id
  from public.part_files pf
  where pf.id = any(coalesce(p_part_file_ids, '{}'::uuid[]))
    and pf.part_id = v_part.id;

  return v_request_id;
end;
$$;


ALTER FUNCTION "public"."create_service_request"("p_part_id" "uuid", "p_request_type" "text", "p_title" "text", "p_notes" "text", "p_priority" "text", "p_due_date" "date", "p_quantity" integer, "p_target_process" "text", "p_target_material" "text", "p_manufacturing_type" "text", "p_cad_output_type" "text", "p_optimization_goal" "text", "p_source_reference_type" "text", "p_request_meta" "jsonb", "p_part_file_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_standalone_service_request"("p_organization_id" "uuid", "p_request_type" "text", "p_title" "text" DEFAULT NULL::"text", "p_requested_item_name" "text" DEFAULT NULL::"text", "p_requested_item_reference" "text" DEFAULT NULL::"text", "p_notes" "text" DEFAULT NULL::"text", "p_priority" "text" DEFAULT 'normal'::"text", "p_due_date" "date" DEFAULT NULL::"date", "p_quantity" integer DEFAULT NULL::integer, "p_target_process" "text" DEFAULT NULL::"text", "p_target_material" "text" DEFAULT NULL::"text", "p_manufacturing_type" "text" DEFAULT NULL::"text", "p_cad_output_type" "text" DEFAULT NULL::"text", "p_optimization_goal" "text" DEFAULT NULL::"text", "p_request_meta" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid;
  v_request_id uuid;
  v_requester_role text;
  v_default_title text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  select om.role
  into v_requester_role
  from public.organization_members om
  where om.organization_id = p_organization_id
    and om.user_id = v_user_id
  limit 1;

  if v_requester_role is null then
    raise exception 'You do not have access to this organization';
  end if;

  if v_requester_role not in ('admin', 'engineer') then
    raise exception 'Only admins and engineers can create service requests';
  end if;

  if p_request_type not in ('manufacture_part', 'cad_creation', 'optimization') then
    raise exception 'Invalid request type';
  end if;

  if p_priority not in ('low', 'normal', 'high', 'urgent') then
    raise exception 'Invalid priority';
  end if;

  if p_manufacturing_type is not null
     and p_manufacturing_type not in (
       'prototype_3d_print',
       'cnc_spare_part',
       'composite_manufacturing',
       'other'
     ) then
    raise exception 'Invalid manufacturing type';
  end if;

  if p_cad_output_type is not null
     and p_cad_output_type not in ('3d', '2d', 'both') then
    raise exception 'Invalid CAD output type';
  end if;

  if p_optimization_goal is not null
     and p_optimization_goal not in (
       'cost',
       'manufacturability',
       'weight',
       'performance',
       'general'
     ) then
    raise exception 'Invalid optimization goal';
  end if;

  if p_quantity is not null and p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero';
  end if;

  v_default_title :=
    case
      when p_request_type = 'manufacture_part'
        then 'Manufacture request - ' || coalesce(nullif(trim(p_requested_item_reference), ''), nullif(trim(p_requested_item_name), ''), 'Standalone item')
      when p_request_type = 'cad_creation'
        then 'CAD creation request - ' || coalesce(nullif(trim(p_requested_item_reference), ''), nullif(trim(p_requested_item_name), ''), 'Standalone item')
      else
        'Optimization request - ' || coalesce(nullif(trim(p_requested_item_reference), ''), nullif(trim(p_requested_item_name), ''), 'Standalone item')
    end;

  insert into public.service_requests (
    organization_id,
    part_id,
    requested_by_user_id,
    request_type,
    status,
    title,
    notes,
    priority,
    due_date,
    quantity,
    target_process,
    target_material,
    manufacturing_type,
    cad_output_type,
    optimization_goal,
    source_reference_type,
    request_meta,
    request_origin,
    requested_item_name,
    requested_item_reference,
    linked_to_part_at
  )
  values (
    p_organization_id,
    null,
    v_user_id,
    p_request_type,
    'draft',
    coalesce(nullif(trim(p_title), ''), v_default_title),
    nullif(trim(p_notes), ''),
    p_priority,
    p_due_date,
    p_quantity,
    nullif(trim(p_target_process), ''),
    nullif(trim(p_target_material), ''),
    case when p_request_type = 'manufacture_part' then p_manufacturing_type else null end,
    case when p_request_type = 'cad_creation' then p_cad_output_type else null end,
    case when p_request_type = 'optimization' then p_optimization_goal else null end,
    'uploaded_files',
    coalesce(p_request_meta, '{}'::jsonb),
    'standalone',
    nullif(trim(p_requested_item_name), ''),
    nullif(trim(p_requested_item_reference), ''),
    null
  )
  returning id into v_request_id;

  return v_request_id;
end;
$$;


ALTER FUNCTION "public"."create_standalone_service_request"("p_organization_id" "uuid", "p_request_type" "text", "p_title" "text", "p_requested_item_name" "text", "p_requested_item_reference" "text", "p_notes" "text", "p_priority" "text", "p_due_date" "date", "p_quantity" integer, "p_target_process" "text", "p_target_material" "text", "p_manufacturing_type" "text", "p_cad_output_type" "text", "p_optimization_goal" "text", "p_request_meta" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_org_members"() RETURNS TABLE("organization_id" "uuid", "organization_name" "text", "organization_slug" "text", "organization_plan" "text", "organization_seat_limit" integer, "member_user_id" "uuid", "member_role" "text", "full_name" "text", "email" "text", "joined_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    o.id as organization_id,
    o.name as organization_name,
    o.slug as organization_slug,
    o.plan as organization_plan,
    o.seat_limit as organization_seat_limit,
    om.user_id as member_user_id,
    om.role as member_role,
    p.full_name,
    p.email,
    om.created_at as joined_at
  from public.organization_members my_om
  join public.organizations o
    on o.id = my_om.organization_id
  join public.organization_members om
    on om.organization_id = o.id
  left join public.profiles p
    on p.user_id = om.user_id
  where my_om.user_id = auth.uid()
  order by
    case when om.role = 'admin' then 0 else 1 end,
    p.full_name nulls last,
    p.email nulls last;
$$;


ALTER FUNCTION "public"."get_current_org_members"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_org_role"() RETURNS "text"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select om.role
  from public.organization_members om
  where om.user_id = auth.uid()
  limit 1;
$$;


ALTER FUNCTION "public"."get_current_org_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_invite_details"("invite_token" "uuid") RETURNS TABLE("invite_id" "uuid", "token" "uuid", "organization_id" "uuid", "organization_name" "text", "email" "text", "role" "text", "status" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    oi.id as invite_id,
    oi.token,
    oi.organization_id,
    o.name as organization_name,
    oi.email,
    oi.role,
    oi.status
  from public.organization_invites oi
  join public.organizations o
    on o.id = oi.organization_id
  where oi.token = invite_token
  limit 1;
$$;


ALTER FUNCTION "public"."get_public_invite_details"("invite_token" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_revision_label"("p_revision_scheme" "text", "p_revision_index" integer) RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_index integer;
  v_result text := '';
  v_remainder integer;
begin
  if p_revision_index is null or p_revision_index < 1 then
    raise exception 'Revision index must be >= 1';
  end if;

  if p_revision_scheme = 'numeric' then
    return p_revision_index::text;
  elsif p_revision_scheme = 'alphabetic' then
    v_index := p_revision_index;

    while v_index > 0 loop
      v_remainder := (v_index - 1) % 26;
      v_result := chr(65 + v_remainder) || v_result;
      v_index := (v_index - 1) / 26;
    end loop;

    return v_result;
  else
    raise exception 'Unsupported revision scheme: %', p_revision_scheme;
  end if;
end;
$$;


ALTER FUNCTION "public"."get_revision_label"("p_revision_scheme" "text", "p_revision_index" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  org_name text;
  org_slug text;
  new_org_id uuid;
begin
  insert into public.profiles (
    user_id,
    email,
    full_name,
    company
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'company', '')
  )
  on conflict (user_id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    company = excluded.company,
    updated_at = now();

  org_name := coalesce(nullif(trim(new.raw_user_meta_data->>'company'), ''), 'Personal Workspace');
  org_slug := lower(
    regexp_replace(
      org_name || '-' || substr(new.id::text, 1, 8),
      '[^a-zA-Z0-9]+',
      '-',
      'g'
    )
  );

  insert into public.organizations (name, slug)
  values (org_name, org_slug)
  returning id into new_org_id;

  insert into public.organization_members (
    organization_id,
    user_id,
    role
  )
  values (
    new_org_id,
    new.id,
    'admin'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.profiles (
    user_id,
    email,
    full_name,
    company,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'company', '')), ''),
    now(),
    now()
  )
  on conflict (user_id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, profiles.full_name),
    company = coalesce(excluded.company, profiles.company),
    updated_at = now();

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_org_admin"("target_org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from organization_members om
    where om.organization_id = target_org_id
      and om.user_id = auth.uid()
      and om.role in ('owner', 'admin')
  );
$$;


ALTER FUNCTION "public"."is_org_admin"("target_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_org_member"("target_org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from organization_members om
    where om.organization_id = target_org_id
      and om.user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_org_member"("target_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."link_service_request_to_part_revision"("p_request_id" "uuid", "p_part_id" "uuid", "p_part_file_ids" "uuid"[] DEFAULT '{}'::"uuid"[]) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid;
  v_request record;
  v_part record;
  v_role text;
  v_has_uploaded boolean;
  v_has_selected_vault_files boolean;
  v_effective_source text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  select
    sr.id,
    sr.organization_id,
    sr.status,
    sr.request_origin
  into v_request
  from public.service_requests sr
  where sr.id = p_request_id;

  if not found then
    raise exception 'Request not found';
  end if;

  if v_request.status not in ('draft', 'submitted', 'in_review', 'awaiting_customer') then
    raise exception 'This request can no longer be linked to a vault revision';
  end if;

  select
    p.id,
    p.organization_id
  into v_part
  from public.parts p
  where p.id = p_part_id;

  if not found then
    raise exception 'Part not found';
  end if;

  if v_part.organization_id <> v_request.organization_id then
    raise exception 'Selected part does not belong to the same organization';
  end if;

  select om.role
  into v_role
  from public.organization_members om
  where om.organization_id = v_request.organization_id
    and om.user_id = v_user_id
  limit 1;

  if v_role is null then
    raise exception 'You do not have access to this organization';
  end if;

  if v_role not in ('admin', 'engineer') then
    raise exception 'Only admins and engineers can link requests to vault revisions';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_part_file_ids, '{}'::uuid[])) as selected_file_id
    left join public.part_files pf
      on pf.id = selected_file_id
     and pf.part_id = v_part.id
    where pf.id is null
  ) then
    raise exception 'One or more selected files do not belong to this part revision';
  end if;

  update public.service_requests
  set
    part_id = v_part.id,
    linked_to_part_at = now(),
    updated_at = now()
  where id = p_request_id;

  insert into public.service_request_files (
    service_request_id,
    part_file_id,
    attached_by_user_id
  )
  select
    p_request_id,
    pf.id,
    v_user_id
  from public.part_files pf
  where pf.id = any(coalesce(p_part_file_ids, '{}'::uuid[]))
    and pf.part_id = v_part.id
    and not exists (
      select 1
      from public.service_request_files srf
      where srf.service_request_id = p_request_id
        and srf.part_file_id = pf.id
    );

  select exists (
    select 1
    from public.service_request_uploaded_files sru
    where sru.service_request_id = p_request_id
  )
  into v_has_uploaded;

  v_has_selected_vault_files := coalesce(array_length(p_part_file_ids, 1), 0) > 0;

  v_effective_source :=
    case
      when v_has_uploaded and v_has_selected_vault_files then 'mixed'
      when v_has_selected_vault_files then 'existing_part_files'
      else 'uploaded_files'
    end;

  update public.service_requests
  set
    source_reference_type = v_effective_source,
    updated_at = now()
  where id = p_request_id;

  return p_request_id;
end;
$$;


ALTER FUNCTION "public"."link_service_request_to_part_revision"("p_request_id" "uuid", "p_part_id" "uuid", "p_part_file_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_org_member"("target_user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  caller_membership public.organization_members%rowtype;
  target_membership public.organization_members%rowtype;
  admin_count integer;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in.';
  end if;

  select *
  into caller_membership
  from public.organization_members
  where user_id = auth.uid()
  limit 1;

  if caller_membership.id is null or caller_membership.role <> 'admin' then
    raise exception 'Only admins can remove members.';
  end if;

  select *
  into target_membership
  from public.organization_members
  where user_id = target_user_id
    and organization_id = caller_membership.organization_id
  limit 1;

  if target_membership.id is null then
    raise exception 'Member not found in your organization.';
  end if;

  if target_membership.user_id = auth.uid() then
    raise exception 'You cannot remove yourself.';
  end if;

  if target_membership.role = 'admin' then
    select count(*)
    into admin_count
    from public.organization_members
    where organization_id = caller_membership.organization_id
      and role = 'admin';

    if admin_count <= 1 then
      raise exception 'Your organization must have at least one admin.';
    end if;
  end if;

  delete from public.organization_members
  where id = target_membership.id;

  return 'Member removed.';
end;
$$;


ALTER FUNCTION "public"."remove_org_member"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_and_validate_provider_quote_round_integrity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  request_org_id uuid;
  package_request_id uuid;
  package_org_id uuid;
begin
  if new.service_request_id is null then
    raise exception 'service_request_id is required';
  end if;

  select sr.organization_id
    into request_org_id
  from public.service_requests sr
  where sr.id = new.service_request_id;

  if request_org_id is null then
    raise exception 'Invalid service_request_id';
  end if;

  if new.customer_org_id is null then
    new.customer_org_id := request_org_id;
  elsif new.customer_org_id <> request_org_id then
    raise exception 'customer_org_id must match service request organization';
  end if;

  if new.selected_provider_package_id is not null then
    select prp.service_request_id, prp.customer_org_id
      into package_request_id, package_org_id
    from public.provider_request_packages prp
    where prp.id = new.selected_provider_package_id;

    if package_request_id is null then
      raise exception 'Invalid selected_provider_package_id';
    end if;

    if package_request_id <> new.service_request_id then
      raise exception 'selected_provider_package_id must belong to same service_request_id';
    end if;

    if package_org_id <> new.customer_org_id then
      raise exception 'selected_provider_package_id must belong to same customer_org_id';
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."set_and_validate_provider_quote_round_integrity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_and_validate_provider_request_package_integrity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  round_request_id uuid;
  round_customer_org_id uuid;
begin
  if new.provider_quote_round_id is null then
    raise exception 'provider_quote_round_id is required';
  end if;

  select pqr.service_request_id, pqr.customer_org_id
    into round_request_id, round_customer_org_id
  from public.provider_quote_rounds pqr
  where pqr.id = new.provider_quote_round_id;

  if round_request_id is null then
    raise exception 'Invalid provider_quote_round_id';
  end if;

  if new.service_request_id is null then
    new.service_request_id := round_request_id;
  elsif new.service_request_id <> round_request_id then
    raise exception 'service_request_id must match provider_quote_round.service_request_id';
  end if;

  if new.customer_org_id is null then
    new.customer_org_id := round_customer_org_id;
  elsif new.customer_org_id <> round_customer_org_id then
    raise exception 'customer_org_id must match provider_quote_round.customer_org_id';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."set_and_validate_provider_request_package_integrity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_current_timestamp_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_current_timestamp_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_service_request"("p_request_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid;
  v_request record;
  v_role text;
  v_upload_count integer;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  select
    sr.id,
    sr.organization_id,
    sr.status,
    sr.request_origin,
    sr.request_type,
    sr.title,
    sr.requested_item_name
  into v_request
  from public.service_requests sr
  where sr.id = p_request_id;

  if not found then
    raise exception 'Request not found';
  end if;

  select om.role
  into v_role
  from public.organization_members om
  where om.organization_id = v_request.organization_id
    and om.user_id = v_user_id
  limit 1;

  if v_role is null then
    raise exception 'You do not have access to this organization';
  end if;

  if v_role not in ('admin', 'engineer') then
    raise exception 'Only admins and engineers can submit service requests';
  end if;

  if v_request.status <> 'draft' then
    raise exception 'Only draft requests can be submitted';
  end if;

  if nullif(trim(coalesce(v_request.title, '')), '') is null then
    raise exception 'Request title is required';
  end if;

  if v_request.request_origin = 'standalone'
     and nullif(trim(coalesce(v_request.requested_item_name, '')), '') is null then
    raise exception 'Standalone requests require a requested item name';
  end if;

  select count(*)
  into v_upload_count
  from public.service_request_uploaded_files sru
  where sru.service_request_id = p_request_id;

  if v_request.request_origin = 'standalone' and v_upload_count = 0 then
    raise exception 'Standalone requests require at least one uploaded file before submission';
  end if;

  update public.service_requests
  set
    status = 'submitted',
    updated_at = now()
  where id = p_request_id;

  return p_request_id;
end;
$$;


ALTER FUNCTION "public"."submit_service_request"("p_request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_org_member_role"("target_user_id" "uuid", "new_role" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  caller_membership public.organization_members%rowtype;
  target_membership public.organization_members%rowtype;
  admin_count integer;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in.';
  end if;

  if new_role not in ('admin', 'engineer', 'viewer') then
    raise exception 'Invalid role.';
  end if;

  select *
  into caller_membership
  from public.organization_members
  where user_id = auth.uid()
  limit 1;

  if caller_membership.id is null or caller_membership.role <> 'admin' then
    raise exception 'Only admins can update member roles.';
  end if;

  select *
  into target_membership
  from public.organization_members
  where user_id = target_user_id
    and organization_id = caller_membership.organization_id
  limit 1;

  if target_membership.id is null then
    raise exception 'Member not found in your organization.';
  end if;

  if target_membership.user_id = auth.uid() then
    raise exception 'You cannot change your own role here.';
  end if;

  if target_membership.role = 'admin' and new_role <> 'admin' then
    select count(*)
    into admin_count
    from public.organization_members
    where organization_id = caller_membership.organization_id
      and role = 'admin';

    if admin_count <= 1 then
      raise exception 'Your organization must have at least one admin.';
    end if;
  end if;

  update public.organization_members
  set role = new_role
  where id = target_membership.id;

  return 'Role updated.';
end;
$$;


ALTER FUNCTION "public"."update_org_member_role"("target_user_id" "uuid", "new_role" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."organization_commercial_profiles" (
    "organization_id" "uuid" NOT NULL,
    "legal_name" "text",
    "trading_name" "text",
    "address_line_1" "text",
    "address_line_2" "text",
    "city" "text",
    "region" "text",
    "postal_code" "text",
    "country" "text",
    "vat_number" "text",
    "company_number" "text",
    "contact_name" "text",
    "contact_email" "text",
    "contact_phone" "text",
    "website" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."organization_commercial_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" NOT NULL,
    "invited_by_user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "accepted_at" timestamp with time zone,
    CONSTRAINT "organization_invites_role_check" CHECK (("role" = ANY (ARRAY['engineer'::"text", 'viewer'::"text"]))),
    CONSTRAINT "organization_invites_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'revoked'::"text"])))
);


ALTER TABLE "public"."organization_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "organization_members_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'engineer'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."organization_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "plan" "text" DEFAULT 'starter'::"text" NOT NULL,
    "seat_limit" integer DEFAULT 5 NOT NULL,
    "billing_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "onboarding_status" "text" DEFAULT 'lead'::"text" NOT NULL,
    "plan_started_at" "date",
    "plan_ends_at" "date",
    "internal_notes" "text",
    CONSTRAINT "organizations_billing_status_check" CHECK (("billing_status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'trial'::"text", 'overdue'::"text", 'inactive'::"text"]))),
    CONSTRAINT "organizations_onboarding_status_check" CHECK (("onboarding_status" = ANY (ARRAY['lead'::"text", 'contacted'::"text", 'approved'::"text", 'invited'::"text", 'active'::"text", 'paused'::"text"])))
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."part_families" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "part_number" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "revision_scheme" "text" NOT NULL,
    CONSTRAINT "part_families_revision_scheme_check" CHECK (("revision_scheme" = ANY (ARRAY['alphabetic'::"text", 'numeric'::"text"])))
);


ALTER TABLE "public"."part_families" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."part_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "part_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_type" "text",
    "asset_category" "text",
    "storage_path" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "file_size_bytes" bigint,
    "aps_object_key" "text",
    "aps_object_id" "text",
    "aps_urn" "text",
    "aps_translation_status" "text",
    "aps_translation_progress" "text",
    "aps_manifest_json" "jsonb",
    "aps_last_prepared_at" timestamp with time zone,
    "aps_last_translated_at" timestamp with time zone,
    "aps_last_error" "text",
    CONSTRAINT "part_files_asset_category_check" CHECK (("asset_category" = ANY (ARRAY['cad_3d'::"text", 'drawing_2d'::"text", 'image'::"text", 'manufacturing_doc'::"text", 'quality_doc'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."part_files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."parts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "part_number" "text",
    "description" "text",
    "process_type" "text",
    "material" "text",
    "revision" "text" DEFAULT 'A'::"text",
    "category" "text",
    "status" "text" DEFAULT 'draft'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "organization_id" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "part_family_id" "uuid" NOT NULL,
    "revision_note" "text",
    "revision_created_from_part_id" "uuid",
    "revision_index" integer NOT NULL,
    CONSTRAINT "parts_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'active'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."parts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "user_id" "uuid" NOT NULL,
    "email" "text",
    "full_name" "text",
    "company" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "platform_role" "text",
    CONSTRAINT "profiles_platform_role_check" CHECK ((("platform_role" IS NULL) OR ("platform_role" = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'platform_support'::"text", 'platform_finance'::"text"]))))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."provider_capabilities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_org_id" "uuid" NOT NULL,
    "process_family" "text" NOT NULL,
    "process_name" "text" NOT NULL,
    "material_family" "text",
    "material_name" "text",
    "machine_type" "text",
    "certification" "text",
    "min_quantity" integer,
    "max_quantity" integer,
    "lead_time_notes" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "provider_capabilities_process_family_check" CHECK (("process_family" = ANY (ARRAY['cnc_machining'::"text", '3d_printing'::"text", 'sheet_metal'::"text", 'composite_manufacturing'::"text", 'injection_moulding'::"text", '3d_scanning'::"text", 'ct_scanning'::"text", 'cad_creation'::"text"])))
);


ALTER TABLE "public"."provider_capabilities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."provider_invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_request_package_id" "uuid" NOT NULL,
    "provider_quote_id" "uuid",
    "provider_org_id" "uuid" NOT NULL,
    "customer_org_id" "uuid" NOT NULL,
    "invoice_source" "text" NOT NULL,
    "invoice_number" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "currency_code" "text" DEFAULT 'EUR'::"text" NOT NULL,
    "subtotal_amount" numeric(12,2),
    "tax_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "total_amount" numeric(12,2),
    "issued_at" timestamp with time zone,
    "due_date" "date",
    "paid_at" timestamp with time zone,
    "notes" "text",
    "uploaded_file_path" "text",
    "uploaded_file_name" "text",
    "uploaded_file_type" "text",
    "snapshot_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "finalized_at" timestamp with time zone,
    "created_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "received_at" timestamp with time zone,
    "approved_at" timestamp with time zone,
    "payment_reference" "text",
    "ap_notes" "text",
    "received_by_user_id" "uuid",
    "approved_by_user_id" "uuid",
    "paid_recorded_by_user_id" "uuid",
    CONSTRAINT "provider_invoices_invoice_source_check" CHECK (("invoice_source" = ANY (ARRAY['kordyne_generated'::"text", 'provider_uploaded'::"text"]))),
    CONSTRAINT "provider_invoices_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'issued'::"text", 'sent'::"text", 'viewed'::"text", 'paid'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."provider_invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."provider_job_bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_org_id" "uuid" NOT NULL,
    "customer_org_id" "uuid",
    "provider_work_center_id" "uuid",
    "provider_capability_id" "uuid",
    "provider_request_package_id" "uuid",
    "provider_quote_id" "uuid",
    "service_request_id" "uuid",
    "booking_status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "title" "text" NOT NULL,
    "job_reference" "text",
    "notes" "text",
    "starts_at" timestamp with time zone NOT NULL,
    "ends_at" timestamp with time zone NOT NULL,
    "estimated_hours" numeric(10,2),
    "setup_hours" numeric(10,2),
    "run_hours" numeric(10,2),
    "requested_quantity" integer,
    "priority" "text" DEFAULT 'normal'::"text" NOT NULL,
    "created_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "provider_job_bookings_booking_status_check" CHECK (("booking_status" = ANY (ARRAY['unscheduled'::"text", 'scheduled'::"text", 'in_progress'::"text", 'paused'::"text", 'completed'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "provider_job_bookings_check" CHECK (("ends_at" > "starts_at")),
    CONSTRAINT "provider_job_bookings_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'normal'::"text", 'high'::"text", 'urgent'::"text"])))
);


ALTER TABLE "public"."provider_job_bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."provider_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_request_package_id" "uuid" NOT NULL,
    "sender_org_id" "uuid" NOT NULL,
    "sender_user_id" "uuid",
    "message_type" "public"."provider_message_type" DEFAULT 'message'::"public"."provider_message_type" NOT NULL,
    "message_body" "text" NOT NULL,
    "is_system" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."provider_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."provider_package_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_request_package_id" "uuid" NOT NULL,
    "source_type" "public"."provider_file_source_type" NOT NULL,
    "source_part_file_id" "uuid",
    "source_service_request_uploaded_file_id" "uuid",
    "uploaded_by_org_id" "uuid",
    "uploaded_by_user_id" "uuid",
    "file_name" "text" NOT NULL,
    "file_type" "text",
    "file_size_bytes" bigint,
    "asset_category" "text",
    "storage_path" "text",
    "provider_uploaded" boolean DEFAULT false NOT NULL,
    "shared_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "aps_object_key" "text",
    "aps_object_id" "text",
    "aps_urn" "text",
    "aps_translation_status" "text",
    "aps_translation_progress" "text",
    "aps_manifest_json" "jsonb",
    "aps_last_prepared_at" timestamp with time zone,
    "aps_last_translated_at" timestamp with time zone,
    "aps_last_error" "text"
);


ALTER TABLE "public"."provider_package_files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."provider_profiles" (
    "organization_id" "uuid" NOT NULL,
    "website" "text",
    "phone" "text",
    "country" "text",
    "city" "text",
    "logo_path" "text",
    "short_description" "text",
    "certifications" "text",
    "industries_served" "text",
    "capabilities_summary" "text",
    "software_notes" "text",
    "onboarding_completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."provider_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."provider_quote_rounds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "service_request_id" "uuid" NOT NULL,
    "customer_org_id" "uuid" NOT NULL,
    "round_number" integer NOT NULL,
    "mode" "public"."provider_round_mode" NOT NULL,
    "status" "public"."provider_round_status" DEFAULT 'draft'::"public"."provider_round_status" NOT NULL,
    "response_deadline" timestamp with time zone,
    "target_due_date" "date",
    "requested_quantity" numeric,
    "currency_code" "text" DEFAULT 'EUR'::"text" NOT NULL,
    "customer_notes" "text",
    "selected_provider_package_id" "uuid",
    "created_by_user_id" "uuid",
    "published_at" timestamp with time zone,
    "awarded_at" timestamp with time zone,
    "closed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."provider_quote_rounds" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."provider_quote_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_quote_id" "uuid" NOT NULL,
    "provider_org_id" "uuid" NOT NULL,
    "customer_org_id" "uuid" NOT NULL,
    "service_request_id" "uuid" NOT NULL,
    "snapshot_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "finalized_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."provider_quote_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."provider_quotes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_request_package_id" "uuid" NOT NULL,
    "provider_org_id" "uuid" NOT NULL,
    "quote_version" integer DEFAULT 1 NOT NULL,
    "status" "public"."provider_quote_status" DEFAULT 'draft'::"public"."provider_quote_status" NOT NULL,
    "currency_code" "text" DEFAULT 'EUR'::"text" NOT NULL,
    "setup_price" numeric(12,2),
    "unit_price" numeric(12,2),
    "total_price" numeric(12,2),
    "shipping_price" numeric(12,2),
    "estimated_lead_time_days" integer,
    "earliest_start_date" "date",
    "estimated_completion_date" "date",
    "quote_valid_until" "date",
    "notes" "text",
    "exceptions" "text",
    "submitted_by_user_id" "uuid",
    "submitted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "quote_reference" "text",
    "issued_at" timestamp with time zone,
    "pdf_storage_path" "text",
    "pdf_generated_at" timestamp with time zone
);


ALTER TABLE "public"."provider_quotes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."provider_relationships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_org_id" "uuid" NOT NULL,
    "provider_org_id" "uuid" NOT NULL,
    "relationship_status" "public"."provider_relationship_status" DEFAULT 'invited'::"public"."provider_relationship_status" NOT NULL,
    "trust_status" "public"."provider_trust_status" DEFAULT 'pending_review'::"public"."provider_trust_status" NOT NULL,
    "is_preferred" boolean DEFAULT false NOT NULL,
    "nda_required" boolean DEFAULT false NOT NULL,
    "quality_review_required" boolean DEFAULT false NOT NULL,
    "commercial_terms_summary" "text",
    "internal_notes" "text",
    "provider_code" "text",
    "created_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "provider_relationships_check" CHECK (("customer_org_id" <> "provider_org_id"))
);


ALTER TABLE "public"."provider_relationships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."provider_request_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_request_package_id" "uuid" NOT NULL,
    "actor_org_id" "uuid",
    "actor_user_id" "uuid",
    "event_type" "text" NOT NULL,
    "event_payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."provider_request_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."provider_request_packages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_quote_round_id" "uuid" NOT NULL,
    "service_request_id" "uuid" NOT NULL,
    "customer_org_id" "uuid" NOT NULL,
    "provider_org_id" "uuid" NOT NULL,
    "provider_relationship_id" "uuid",
    "package_status" "public"."provider_package_status" DEFAULT 'draft'::"public"."provider_package_status" NOT NULL,
    "package_title" "text" NOT NULL,
    "shared_summary" "text",
    "process_requirements" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "target_due_date" "date",
    "requested_quantity" numeric,
    "response_deadline" timestamp with time zone,
    "published_at" timestamp with time zone,
    "viewed_at" timestamp with time zone,
    "provider_responded_at" timestamp with time zone,
    "awarded_at" timestamp with time zone,
    "customer_visible_status" "text",
    "created_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."provider_request_packages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."provider_schedule_blocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_org_id" "uuid" NOT NULL,
    "provider_work_center_id" "uuid",
    "block_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "notes" "text",
    "starts_at" timestamp with time zone NOT NULL,
    "ends_at" timestamp with time zone NOT NULL,
    "all_day" boolean DEFAULT false NOT NULL,
    "created_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "provider_schedule_blocks_block_type_check" CHECK (("block_type" = ANY (ARRAY['maintenance'::"text", 'downtime'::"text", 'holiday'::"text", 'internal_hold'::"text", 'other'::"text"]))),
    CONSTRAINT "provider_schedule_blocks_check" CHECK (("ends_at" > "starts_at"))
);


ALTER TABLE "public"."provider_schedule_blocks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."provider_schedule_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_request_package_id" "uuid" NOT NULL,
    "provider_org_id" "uuid" NOT NULL,
    "provider_site_id" "uuid",
    "machine_label" "text",
    "workcell_label" "text",
    "readiness_status" "public"."provider_readiness_status" DEFAULT 'ready'::"public"."provider_readiness_status" NOT NULL,
    "schedule_visibility" "public"."provider_schedule_visibility" DEFAULT 'milestones_only'::"public"."provider_schedule_visibility" NOT NULL,
    "scheduled_start_at" timestamp with time zone,
    "scheduled_end_at" timestamp with time zone,
    "customer_shared_start_at" timestamp with time zone,
    "customer_shared_end_at" timestamp with time zone,
    "internal_notes" "text",
    "created_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."provider_schedule_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."provider_sites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_org_id" "uuid" NOT NULL,
    "site_name" "text" NOT NULL,
    "country" "text",
    "region" "text",
    "city" "text",
    "timezone" "text",
    "is_primary" boolean DEFAULT false NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."provider_sites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."provider_work_center_capabilities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_work_center_id" "uuid" NOT NULL,
    "provider_capability_id" "uuid" NOT NULL,
    "created_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."provider_work_center_capabilities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."provider_work_centers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "center_type" "text" DEFAULT 'machine'::"text" NOT NULL,
    "description" "text",
    "location_label" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "provider_work_centers_center_type_check" CHECK (("center_type" = ANY (ARRAY['machine'::"text", 'work_cell'::"text", 'manual_station'::"text", 'inspection_station'::"text", 'design_station'::"text"])))
);


ALTER TABLE "public"."provider_work_centers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_request_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "service_request_id" "uuid" NOT NULL,
    "part_file_id" "uuid" NOT NULL,
    "attached_by_user_id" "uuid" NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."service_request_files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_request_uploaded_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "service_request_id" "uuid" NOT NULL,
    "uploaded_by_user_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_type" "text",
    "file_size_bytes" bigint,
    "asset_category" "text",
    "storage_path" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "promoted_to_part_file_id" "uuid",
    "promoted_at" timestamp with time zone,
    CONSTRAINT "service_request_uploaded_files_asset_category_check" CHECK ((("asset_category" IS NULL) OR ("asset_category" = ANY (ARRAY['cad_3d'::"text", 'drawing_2d'::"text", 'image'::"text", 'manufacturing_doc'::"text", 'quality_doc'::"text", 'other'::"text"]))))
);


ALTER TABLE "public"."service_request_uploaded_files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "part_id" "uuid",
    "requested_by_user_id" "uuid" NOT NULL,
    "request_type" "text" NOT NULL,
    "status" "text" DEFAULT 'submitted'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text",
    "priority" "text" DEFAULT 'normal'::"text" NOT NULL,
    "due_date" "date",
    "quantity" integer,
    "target_process" "text",
    "target_material" "text",
    "manufacturing_type" "text",
    "cad_output_type" "text",
    "optimization_goal" "text",
    "source_reference_type" "text" DEFAULT 'existing_part_files'::"text" NOT NULL,
    "quote_model" "text" DEFAULT 'none'::"text" NOT NULL,
    "quoted_price_cents" integer,
    "quoted_currency" "text",
    "quoted_credit_amount" integer,
    "quote_notes" "text",
    "quoted_at" timestamp with time zone,
    "approved_at" timestamp with time zone,
    "rejected_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "request_meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "request_origin" "text" DEFAULT 'vault'::"text" NOT NULL,
    "requested_item_name" "text",
    "requested_item_reference" "text",
    "linked_to_part_at" timestamp with time zone,
    CONSTRAINT "service_requests_cad_output_type_check" CHECK ((("cad_output_type" IS NULL) OR ("cad_output_type" = ANY (ARRAY['3d'::"text", '2d'::"text", 'both'::"text"])))),
    CONSTRAINT "service_requests_manufacturing_type_check" CHECK ((("manufacturing_type" IS NULL) OR ("manufacturing_type" = ANY (ARRAY['prototype_3d_print'::"text", 'cnc_spare_part'::"text", 'composite_manufacturing'::"text", 'other'::"text"])))),
    CONSTRAINT "service_requests_optimization_goal_check" CHECK ((("optimization_goal" IS NULL) OR ("optimization_goal" = ANY (ARRAY['cost'::"text", 'manufacturability'::"text", 'weight'::"text", 'performance'::"text", 'general'::"text"])))),
    CONSTRAINT "service_requests_origin_part_check" CHECK (((("request_origin" = 'vault'::"text") AND ("part_id" IS NOT NULL)) OR ("request_origin" = 'standalone'::"text"))),
    CONSTRAINT "service_requests_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'normal'::"text", 'high'::"text", 'urgent'::"text"]))),
    CONSTRAINT "service_requests_quantity_check" CHECK ((("quantity" IS NULL) OR ("quantity" > 0))),
    CONSTRAINT "service_requests_quote_model_check" CHECK (("quote_model" = ANY (ARRAY['none'::"text", 'money'::"text", 'credits'::"text"]))),
    CONSTRAINT "service_requests_quoted_credit_amount_check" CHECK ((("quoted_credit_amount" IS NULL) OR ("quoted_credit_amount" >= 0))),
    CONSTRAINT "service_requests_quoted_price_cents_check" CHECK ((("quoted_price_cents" IS NULL) OR ("quoted_price_cents" >= 0))),
    CONSTRAINT "service_requests_request_origin_check" CHECK (("request_origin" = ANY (ARRAY['vault'::"text", 'standalone'::"text"]))),
    CONSTRAINT "service_requests_request_type_check" CHECK (("request_type" = ANY (ARRAY['manufacture_part'::"text", 'cad_creation'::"text", 'optimization'::"text"]))),
    CONSTRAINT "service_requests_source_reference_type_check" CHECK (("source_reference_type" = ANY (ARRAY['existing_part_files'::"text", 'uploaded_files'::"text", 'mixed'::"text"]))),
    CONSTRAINT "service_requests_status_check" CHECK (("status" = ANY (ARRAY['submitted'::"text", 'in_review'::"text", 'awaiting_customer'::"text", 'approved'::"text", 'in_progress'::"text", 'completed'::"text", 'rejected'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."service_requests" OWNER TO "postgres";


ALTER TABLE ONLY "public"."organization_commercial_profiles"
    ADD CONSTRAINT "organization_commercial_profiles_pkey" PRIMARY KEY ("organization_id");



ALTER TABLE ONLY "public"."organization_invites"
    ADD CONSTRAINT "organization_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_user_id_key" UNIQUE ("organization_id", "user_id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."part_families"
    ADD CONSTRAINT "part_families_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."part_files"
    ADD CONSTRAINT "part_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."parts"
    ADD CONSTRAINT "parts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."provider_capabilities"
    ADD CONSTRAINT "provider_capabilities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."provider_invoices"
    ADD CONSTRAINT "provider_invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."provider_job_bookings"
    ADD CONSTRAINT "provider_job_bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."provider_messages"
    ADD CONSTRAINT "provider_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."provider_package_files"
    ADD CONSTRAINT "provider_package_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."provider_profiles"
    ADD CONSTRAINT "provider_profiles_pkey" PRIMARY KEY ("organization_id");



ALTER TABLE ONLY "public"."provider_quote_rounds"
    ADD CONSTRAINT "provider_quote_rounds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."provider_quote_rounds"
    ADD CONSTRAINT "provider_quote_rounds_service_request_id_round_number_key" UNIQUE ("service_request_id", "round_number");



ALTER TABLE ONLY "public"."provider_quote_snapshots"
    ADD CONSTRAINT "provider_quote_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."provider_quote_snapshots"
    ADD CONSTRAINT "provider_quote_snapshots_provider_quote_id_key" UNIQUE ("provider_quote_id");



ALTER TABLE ONLY "public"."provider_quotes"
    ADD CONSTRAINT "provider_quotes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."provider_quotes"
    ADD CONSTRAINT "provider_quotes_provider_request_package_id_quote_version_key" UNIQUE ("provider_request_package_id", "quote_version");



ALTER TABLE ONLY "public"."provider_relationships"
    ADD CONSTRAINT "provider_relationships_customer_org_id_provider_org_id_key" UNIQUE ("customer_org_id", "provider_org_id");



ALTER TABLE ONLY "public"."provider_relationships"
    ADD CONSTRAINT "provider_relationships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."provider_request_events"
    ADD CONSTRAINT "provider_request_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."provider_request_packages"
    ADD CONSTRAINT "provider_request_packages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."provider_request_packages"
    ADD CONSTRAINT "provider_request_packages_provider_quote_round_id_provider__key" UNIQUE ("provider_quote_round_id", "provider_org_id");



ALTER TABLE ONLY "public"."provider_schedule_blocks"
    ADD CONSTRAINT "provider_schedule_blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."provider_schedule_entries"
    ADD CONSTRAINT "provider_schedule_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."provider_sites"
    ADD CONSTRAINT "provider_sites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."provider_work_center_capabilities"
    ADD CONSTRAINT "provider_work_center_capabili_provider_work_center_id_provi_key" UNIQUE ("provider_work_center_id", "provider_capability_id");



ALTER TABLE ONLY "public"."provider_work_center_capabilities"
    ADD CONSTRAINT "provider_work_center_capabilities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."provider_work_centers"
    ADD CONSTRAINT "provider_work_centers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_request_files"
    ADD CONSTRAINT "service_request_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_request_files"
    ADD CONSTRAINT "service_request_files_service_request_id_part_file_id_key" UNIQUE ("service_request_id", "part_file_id");



ALTER TABLE ONLY "public"."service_request_uploaded_files"
    ADD CONSTRAINT "service_request_uploaded_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_request_uploaded_files"
    ADD CONSTRAINT "service_request_uploaded_files_storage_path_key" UNIQUE ("storage_path");



ALTER TABLE ONLY "public"."service_requests"
    ADD CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_part_families_organization_id" ON "public"."part_families" USING "btree" ("organization_id");



CREATE INDEX "idx_part_files_aps_translation_status" ON "public"."part_files" USING "btree" ("aps_translation_status");



CREATE INDEX "idx_part_files_aps_urn" ON "public"."part_files" USING "btree" ("aps_urn");



CREATE INDEX "idx_parts_part_family_id" ON "public"."parts" USING "btree" ("part_family_id");



CREATE INDEX "idx_parts_revision_created_from_part_id" ON "public"."parts" USING "btree" ("revision_created_from_part_id");



CREATE INDEX "idx_provider_capabilities_provider_org" ON "public"."provider_capabilities" USING "btree" ("provider_org_id");



CREATE INDEX "idx_provider_messages_package" ON "public"."provider_messages" USING "btree" ("provider_request_package_id", "created_at");



CREATE INDEX "idx_provider_package_files_aps_translation_status" ON "public"."provider_package_files" USING "btree" ("aps_translation_status");



CREATE INDEX "idx_provider_package_files_aps_urn" ON "public"."provider_package_files" USING "btree" ("aps_urn");



CREATE INDEX "idx_provider_package_files_package" ON "public"."provider_package_files" USING "btree" ("provider_request_package_id");



CREATE INDEX "idx_provider_quote_rounds_customer_org" ON "public"."provider_quote_rounds" USING "btree" ("customer_org_id");



CREATE INDEX "idx_provider_quote_rounds_service_request" ON "public"."provider_quote_rounds" USING "btree" ("service_request_id");



CREATE INDEX "idx_provider_quotes_package" ON "public"."provider_quotes" USING "btree" ("provider_request_package_id");



CREATE INDEX "idx_provider_relationships_customer_org" ON "public"."provider_relationships" USING "btree" ("customer_org_id");



CREATE INDEX "idx_provider_relationships_provider_org" ON "public"."provider_relationships" USING "btree" ("provider_org_id");



CREATE INDEX "idx_provider_request_events_package" ON "public"."provider_request_events" USING "btree" ("provider_request_package_id", "created_at");



CREATE INDEX "idx_provider_request_packages_provider_org" ON "public"."provider_request_packages" USING "btree" ("provider_org_id");



CREATE INDEX "idx_provider_request_packages_round" ON "public"."provider_request_packages" USING "btree" ("provider_quote_round_id");



CREATE INDEX "idx_provider_request_packages_service_request" ON "public"."provider_request_packages" USING "btree" ("service_request_id");



CREATE INDEX "idx_provider_schedule_entries_package" ON "public"."provider_schedule_entries" USING "btree" ("provider_request_package_id");



CREATE INDEX "idx_provider_sites_provider_org" ON "public"."provider_sites" USING "btree" ("provider_org_id");



CREATE INDEX "idx_service_request_files_part_file_id" ON "public"."service_request_files" USING "btree" ("part_file_id");



CREATE INDEX "idx_service_request_files_request_id" ON "public"."service_request_files" USING "btree" ("service_request_id");



CREATE INDEX "idx_service_request_uploaded_files_promoted_to_part_file_id" ON "public"."service_request_uploaded_files" USING "btree" ("promoted_to_part_file_id");



CREATE INDEX "idx_service_request_uploaded_files_request_id" ON "public"."service_request_uploaded_files" USING "btree" ("service_request_id");



CREATE INDEX "idx_service_request_uploaded_files_uploaded_by" ON "public"."service_request_uploaded_files" USING "btree" ("uploaded_by_user_id");



CREATE INDEX "idx_service_requests_org_created_at" ON "public"."service_requests" USING "btree" ("organization_id", "created_at" DESC);



CREATE INDEX "idx_service_requests_org_status" ON "public"."service_requests" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_service_requests_part_created_at" ON "public"."service_requests" USING "btree" ("part_id", "created_at" DESC);



CREATE INDEX "idx_service_requests_request_origin" ON "public"."service_requests" USING "btree" ("request_origin");



CREATE INDEX "idx_service_requests_requested_item_name" ON "public"."service_requests" USING "btree" ("requested_item_name");



CREATE UNIQUE INDEX "organization_invites_token_idx" ON "public"."organization_invites" USING "btree" ("token");



CREATE UNIQUE INDEX "parts_family_revision_index_key" ON "public"."parts" USING "btree" ("part_family_id", "revision_index") WHERE ("revision_index" IS NOT NULL);



CREATE INDEX "profiles_platform_role_idx" ON "public"."profiles" USING "btree" ("platform_role");



CREATE INDEX "provider_invoices_customer_org_idx" ON "public"."provider_invoices" USING "btree" ("customer_org_id");



CREATE INDEX "provider_invoices_package_idx" ON "public"."provider_invoices" USING "btree" ("provider_request_package_id");



CREATE INDEX "provider_invoices_provider_org_idx" ON "public"."provider_invoices" USING "btree" ("provider_org_id");



CREATE INDEX "provider_invoices_quote_idx" ON "public"."provider_invoices" USING "btree" ("provider_quote_id");



CREATE INDEX "provider_job_bookings_capability_idx" ON "public"."provider_job_bookings" USING "btree" ("provider_capability_id");



CREATE INDEX "provider_job_bookings_customer_org_id_idx" ON "public"."provider_job_bookings" USING "btree" ("customer_org_id");



CREATE INDEX "provider_job_bookings_package_idx" ON "public"."provider_job_bookings" USING "btree" ("provider_request_package_id");



CREATE INDEX "provider_job_bookings_provider_org_id_idx" ON "public"."provider_job_bookings" USING "btree" ("provider_org_id");



CREATE INDEX "provider_job_bookings_range_idx" ON "public"."provider_job_bookings" USING "btree" ("starts_at", "ends_at");



CREATE INDEX "provider_job_bookings_service_request_idx" ON "public"."provider_job_bookings" USING "btree" ("service_request_id");



CREATE INDEX "provider_job_bookings_status_idx" ON "public"."provider_job_bookings" USING "btree" ("provider_org_id", "booking_status");



CREATE INDEX "provider_job_bookings_work_center_idx" ON "public"."provider_job_bookings" USING "btree" ("provider_work_center_id");



CREATE INDEX "provider_quote_snapshots_customer_org_idx" ON "public"."provider_quote_snapshots" USING "btree" ("customer_org_id");



CREATE INDEX "provider_quote_snapshots_provider_org_idx" ON "public"."provider_quote_snapshots" USING "btree" ("provider_org_id");



CREATE INDEX "provider_quote_snapshots_service_request_idx" ON "public"."provider_quote_snapshots" USING "btree" ("service_request_id");



CREATE INDEX "provider_quotes_package_id_idx" ON "public"."provider_quotes" USING "btree" ("provider_request_package_id");



CREATE INDEX "provider_quotes_quote_reference_idx" ON "public"."provider_quotes" USING "btree" ("quote_reference");



CREATE INDEX "provider_schedule_blocks_provider_org_id_idx" ON "public"."provider_schedule_blocks" USING "btree" ("provider_org_id");



CREATE INDEX "provider_schedule_blocks_range_idx" ON "public"."provider_schedule_blocks" USING "btree" ("starts_at", "ends_at");



CREATE INDEX "provider_schedule_blocks_work_center_idx" ON "public"."provider_schedule_blocks" USING "btree" ("provider_work_center_id");



CREATE INDEX "provider_work_center_capabilities_capability_idx" ON "public"."provider_work_center_capabilities" USING "btree" ("provider_capability_id");



CREATE INDEX "provider_work_center_capabilities_center_idx" ON "public"."provider_work_center_capabilities" USING "btree" ("provider_work_center_id");



CREATE INDEX "provider_work_centers_active_idx" ON "public"."provider_work_centers" USING "btree" ("provider_org_id", "active");



CREATE UNIQUE INDEX "provider_work_centers_provider_org_id_code_key" ON "public"."provider_work_centers" USING "btree" ("provider_org_id", "code") WHERE ("code" IS NOT NULL);



CREATE INDEX "provider_work_centers_provider_org_id_idx" ON "public"."provider_work_centers" USING "btree" ("provider_org_id");



CREATE INDEX "service_requests_organization_id_idx" ON "public"."service_requests" USING "btree" ("organization_id");



CREATE INDEX "service_requests_part_id_idx" ON "public"."service_requests" USING "btree" ("part_id");



CREATE OR REPLACE TRIGGER "set_provider_job_bookings_updated_at" BEFORE UPDATE ON "public"."provider_job_bookings" FOR EACH ROW EXECUTE FUNCTION "public"."set_current_timestamp_updated_at"();



CREATE OR REPLACE TRIGGER "set_provider_schedule_blocks_updated_at" BEFORE UPDATE ON "public"."provider_schedule_blocks" FOR EACH ROW EXECUTE FUNCTION "public"."set_current_timestamp_updated_at"();



CREATE OR REPLACE TRIGGER "set_provider_work_centers_updated_at" BEFORE UPDATE ON "public"."provider_work_centers" FOR EACH ROW EXECUTE FUNCTION "public"."set_current_timestamp_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_and_validate_provider_quote_round_integrity" BEFORE INSERT OR UPDATE ON "public"."provider_quote_rounds" FOR EACH ROW EXECUTE FUNCTION "public"."set_and_validate_provider_quote_round_integrity"();



CREATE OR REPLACE TRIGGER "trg_set_and_validate_provider_request_package_integrity" BEFORE INSERT OR UPDATE ON "public"."provider_request_packages" FOR EACH ROW EXECUTE FUNCTION "public"."set_and_validate_provider_request_package_integrity"();



ALTER TABLE ONLY "public"."organization_commercial_profiles"
    ADD CONSTRAINT "organization_commercial_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_invites"
    ADD CONSTRAINT "organization_invites_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_invites"
    ADD CONSTRAINT "organization_invites_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."part_families"
    ADD CONSTRAINT "part_families_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."part_files"
    ADD CONSTRAINT "part_files_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."part_files"
    ADD CONSTRAINT "part_files_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."parts"
    ADD CONSTRAINT "parts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."parts"
    ADD CONSTRAINT "parts_part_family_id_fkey" FOREIGN KEY ("part_family_id") REFERENCES "public"."part_families"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."parts"
    ADD CONSTRAINT "parts_revision_created_from_part_id_fkey" FOREIGN KEY ("revision_created_from_part_id") REFERENCES "public"."parts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."parts"
    ADD CONSTRAINT "parts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_capabilities"
    ADD CONSTRAINT "provider_capabilities_provider_org_id_fkey" FOREIGN KEY ("provider_org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_invoices"
    ADD CONSTRAINT "provider_invoices_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."profiles"("user_id");



ALTER TABLE ONLY "public"."provider_invoices"
    ADD CONSTRAINT "provider_invoices_customer_org_id_fkey" FOREIGN KEY ("customer_org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_invoices"
    ADD CONSTRAINT "provider_invoices_paid_recorded_by_user_id_fkey" FOREIGN KEY ("paid_recorded_by_user_id") REFERENCES "public"."profiles"("user_id");



ALTER TABLE ONLY "public"."provider_invoices"
    ADD CONSTRAINT "provider_invoices_provider_org_id_fkey" FOREIGN KEY ("provider_org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_invoices"
    ADD CONSTRAINT "provider_invoices_provider_quote_id_fkey" FOREIGN KEY ("provider_quote_id") REFERENCES "public"."provider_quotes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."provider_invoices"
    ADD CONSTRAINT "provider_invoices_provider_request_package_id_fkey" FOREIGN KEY ("provider_request_package_id") REFERENCES "public"."provider_request_packages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_invoices"
    ADD CONSTRAINT "provider_invoices_received_by_user_id_fkey" FOREIGN KEY ("received_by_user_id") REFERENCES "public"."profiles"("user_id");



ALTER TABLE ONLY "public"."provider_job_bookings"
    ADD CONSTRAINT "provider_job_bookings_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."provider_job_bookings"
    ADD CONSTRAINT "provider_job_bookings_customer_org_id_fkey" FOREIGN KEY ("customer_org_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."provider_job_bookings"
    ADD CONSTRAINT "provider_job_bookings_provider_capability_id_fkey" FOREIGN KEY ("provider_capability_id") REFERENCES "public"."provider_capabilities"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."provider_job_bookings"
    ADD CONSTRAINT "provider_job_bookings_provider_org_id_fkey" FOREIGN KEY ("provider_org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_job_bookings"
    ADD CONSTRAINT "provider_job_bookings_provider_quote_id_fkey" FOREIGN KEY ("provider_quote_id") REFERENCES "public"."provider_quotes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."provider_job_bookings"
    ADD CONSTRAINT "provider_job_bookings_provider_request_package_id_fkey" FOREIGN KEY ("provider_request_package_id") REFERENCES "public"."provider_request_packages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."provider_job_bookings"
    ADD CONSTRAINT "provider_job_bookings_provider_work_center_id_fkey" FOREIGN KEY ("provider_work_center_id") REFERENCES "public"."provider_work_centers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."provider_job_bookings"
    ADD CONSTRAINT "provider_job_bookings_service_request_id_fkey" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."provider_messages"
    ADD CONSTRAINT "provider_messages_provider_request_package_id_fkey" FOREIGN KEY ("provider_request_package_id") REFERENCES "public"."provider_request_packages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_messages"
    ADD CONSTRAINT "provider_messages_sender_org_id_fkey" FOREIGN KEY ("sender_org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_messages"
    ADD CONSTRAINT "provider_messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "public"."profiles"("user_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."provider_package_files"
    ADD CONSTRAINT "provider_package_files_provider_request_package_id_fkey" FOREIGN KEY ("provider_request_package_id") REFERENCES "public"."provider_request_packages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_package_files"
    ADD CONSTRAINT "provider_package_files_source_part_file_id_fkey" FOREIGN KEY ("source_part_file_id") REFERENCES "public"."part_files"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."provider_package_files"
    ADD CONSTRAINT "provider_package_files_source_service_request_uploaded_fil_fkey" FOREIGN KEY ("source_service_request_uploaded_file_id") REFERENCES "public"."service_request_uploaded_files"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."provider_package_files"
    ADD CONSTRAINT "provider_package_files_uploaded_by_org_id_fkey" FOREIGN KEY ("uploaded_by_org_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."provider_package_files"
    ADD CONSTRAINT "provider_package_files_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."profiles"("user_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."provider_profiles"
    ADD CONSTRAINT "provider_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_quote_rounds"
    ADD CONSTRAINT "provider_quote_rounds_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."profiles"("user_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."provider_quote_rounds"
    ADD CONSTRAINT "provider_quote_rounds_customer_org_id_fkey" FOREIGN KEY ("customer_org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_quote_rounds"
    ADD CONSTRAINT "provider_quote_rounds_selected_package_fk" FOREIGN KEY ("selected_provider_package_id") REFERENCES "public"."provider_request_packages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."provider_quote_rounds"
    ADD CONSTRAINT "provider_quote_rounds_service_request_id_fkey" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_quote_snapshots"
    ADD CONSTRAINT "provider_quote_snapshots_customer_org_id_fkey" FOREIGN KEY ("customer_org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_quote_snapshots"
    ADD CONSTRAINT "provider_quote_snapshots_provider_org_id_fkey" FOREIGN KEY ("provider_org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_quote_snapshots"
    ADD CONSTRAINT "provider_quote_snapshots_provider_quote_id_fkey" FOREIGN KEY ("provider_quote_id") REFERENCES "public"."provider_quotes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_quote_snapshots"
    ADD CONSTRAINT "provider_quote_snapshots_service_request_id_fkey" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_quotes"
    ADD CONSTRAINT "provider_quotes_provider_org_id_fkey" FOREIGN KEY ("provider_org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_quotes"
    ADD CONSTRAINT "provider_quotes_provider_request_package_id_fkey" FOREIGN KEY ("provider_request_package_id") REFERENCES "public"."provider_request_packages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_quotes"
    ADD CONSTRAINT "provider_quotes_submitted_by_user_id_fkey" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."profiles"("user_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."provider_relationships"
    ADD CONSTRAINT "provider_relationships_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."profiles"("user_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."provider_relationships"
    ADD CONSTRAINT "provider_relationships_customer_org_id_fkey" FOREIGN KEY ("customer_org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_relationships"
    ADD CONSTRAINT "provider_relationships_provider_org_id_fkey" FOREIGN KEY ("provider_org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_request_events"
    ADD CONSTRAINT "provider_request_events_actor_org_id_fkey" FOREIGN KEY ("actor_org_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."provider_request_events"
    ADD CONSTRAINT "provider_request_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "public"."profiles"("user_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."provider_request_events"
    ADD CONSTRAINT "provider_request_events_provider_request_package_id_fkey" FOREIGN KEY ("provider_request_package_id") REFERENCES "public"."provider_request_packages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_request_packages"
    ADD CONSTRAINT "provider_request_packages_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."profiles"("user_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."provider_request_packages"
    ADD CONSTRAINT "provider_request_packages_customer_org_id_fkey" FOREIGN KEY ("customer_org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_request_packages"
    ADD CONSTRAINT "provider_request_packages_provider_org_id_fkey" FOREIGN KEY ("provider_org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_request_packages"
    ADD CONSTRAINT "provider_request_packages_provider_quote_round_id_fkey" FOREIGN KEY ("provider_quote_round_id") REFERENCES "public"."provider_quote_rounds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_request_packages"
    ADD CONSTRAINT "provider_request_packages_provider_relationship_id_fkey" FOREIGN KEY ("provider_relationship_id") REFERENCES "public"."provider_relationships"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."provider_request_packages"
    ADD CONSTRAINT "provider_request_packages_service_request_id_fkey" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_schedule_blocks"
    ADD CONSTRAINT "provider_schedule_blocks_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."provider_schedule_blocks"
    ADD CONSTRAINT "provider_schedule_blocks_provider_org_id_fkey" FOREIGN KEY ("provider_org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_schedule_blocks"
    ADD CONSTRAINT "provider_schedule_blocks_provider_work_center_id_fkey" FOREIGN KEY ("provider_work_center_id") REFERENCES "public"."provider_work_centers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_schedule_entries"
    ADD CONSTRAINT "provider_schedule_entries_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."profiles"("user_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."provider_schedule_entries"
    ADD CONSTRAINT "provider_schedule_entries_provider_org_id_fkey" FOREIGN KEY ("provider_org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_schedule_entries"
    ADD CONSTRAINT "provider_schedule_entries_provider_request_package_id_fkey" FOREIGN KEY ("provider_request_package_id") REFERENCES "public"."provider_request_packages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_schedule_entries"
    ADD CONSTRAINT "provider_schedule_entries_provider_site_id_fkey" FOREIGN KEY ("provider_site_id") REFERENCES "public"."provider_sites"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."provider_sites"
    ADD CONSTRAINT "provider_sites_provider_org_id_fkey" FOREIGN KEY ("provider_org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_work_center_capabilities"
    ADD CONSTRAINT "provider_work_center_capabilities_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."provider_work_center_capabilities"
    ADD CONSTRAINT "provider_work_center_capabilities_provider_capability_id_fkey" FOREIGN KEY ("provider_capability_id") REFERENCES "public"."provider_capabilities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_work_center_capabilities"
    ADD CONSTRAINT "provider_work_center_capabilities_provider_work_center_id_fkey" FOREIGN KEY ("provider_work_center_id") REFERENCES "public"."provider_work_centers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_work_centers"
    ADD CONSTRAINT "provider_work_centers_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."provider_work_centers"
    ADD CONSTRAINT "provider_work_centers_provider_org_id_fkey" FOREIGN KEY ("provider_org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_request_files"
    ADD CONSTRAINT "service_request_files_attached_by_user_id_fkey" FOREIGN KEY ("attached_by_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_request_files"
    ADD CONSTRAINT "service_request_files_part_file_id_fkey" FOREIGN KEY ("part_file_id") REFERENCES "public"."part_files"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_request_files"
    ADD CONSTRAINT "service_request_files_service_request_id_fkey" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_request_uploaded_files"
    ADD CONSTRAINT "service_request_uploaded_files_promoted_to_part_file_id_fkey" FOREIGN KEY ("promoted_to_part_file_id") REFERENCES "public"."part_files"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."service_request_uploaded_files"
    ADD CONSTRAINT "service_request_uploaded_files_service_request_id_fkey" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_requests"
    ADD CONSTRAINT "service_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_requests"
    ADD CONSTRAINT "service_requests_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can delete invites in their organization" ON "public"."organization_invites" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "organization_invites"."organization_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can insert invites in their organization" ON "public"."organization_invites" FOR INSERT WITH CHECK ((("invited_by_user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "organization_invites"."organization_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = 'admin'::"text"))))));



CREATE POLICY "Admins can update invites in their organization" ON "public"."organization_invites" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "organization_invites"."organization_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "organization_invites"."organization_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update their organization" ON "public"."organizations" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "organizations"."id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "organizations"."id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view invites in their organization" ON "public"."organization_invites" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "organization_invites"."organization_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = 'admin'::"text")))));



CREATE POLICY "Users can delete files for parts in their organization" ON "public"."part_files" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."parts" "p"
     JOIN "public"."organization_members" "om" ON (("om"."organization_id" = "p"."organization_id")))
  WHERE (("p"."id" = "part_files"."part_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"]))))));



CREATE POLICY "Users can delete parts in their organization" ON "public"."parts" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "parts"."organization_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = 'admin'::"text")))));



CREATE POLICY "Users can insert files for parts in their organization" ON "public"."part_files" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM ("public"."parts" "p"
     JOIN "public"."organization_members" "om" ON (("om"."organization_id" = "p"."organization_id")))
  WHERE (("p"."id" = "part_files"."part_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"])))))));



CREATE POLICY "Users can insert parts in their organization" ON "public"."parts" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "parts"."organization_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"])))))));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update files for parts in their organization" ON "public"."part_files" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."parts" "p"
     JOIN "public"."organization_members" "om" ON (("om"."organization_id" = "p"."organization_id")))
  WHERE (("p"."id" = "part_files"."part_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."parts" "p"
     JOIN "public"."organization_members" "om" ON (("om"."organization_id" = "p"."organization_id")))
  WHERE (("p"."id" = "part_files"."part_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"]))))));



CREATE POLICY "Users can update parts in their organization" ON "public"."parts" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "parts"."organization_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "parts"."organization_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"]))))));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view files for parts in their organization" ON "public"."part_files" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."parts" "p"
     JOIN "public"."organization_members" "om" ON (("om"."organization_id" = "p"."organization_id")))
  WHERE (("p"."id" = "part_files"."part_id") AND ("om"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view parts in their organization" ON "public"."parts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "parts"."organization_id") AND ("om"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their organization" ON "public"."organizations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "organizations"."id") AND ("om"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own organization membership" ON "public"."organization_members" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "customer members can read related bookings" ON "public"."provider_job_bookings" FOR SELECT TO "authenticated" USING ((("customer_org_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "provider_job_bookings"."customer_org_id") AND ("om"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."organization_commercial_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."part_families" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."part_files" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."parts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "provider members can delete own bookings" ON "public"."provider_job_bookings" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "provider_job_bookings"."provider_org_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"]))))));



CREATE POLICY "provider members can delete own schedule blocks" ON "public"."provider_schedule_blocks" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "provider_schedule_blocks"."provider_org_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"]))))));



CREATE POLICY "provider members can delete own work center capabilities" ON "public"."provider_work_center_capabilities" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."provider_work_centers" "wc"
     JOIN "public"."organization_members" "om" ON (("om"."organization_id" = "wc"."provider_org_id")))
  WHERE (("wc"."id" = "provider_work_center_capabilities"."provider_work_center_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"]))))));



CREATE POLICY "provider members can delete own work centers" ON "public"."provider_work_centers" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "provider_work_centers"."provider_org_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"]))))));



CREATE POLICY "provider members can insert own bookings" ON "public"."provider_job_bookings" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "provider_job_bookings"."provider_org_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"]))))));



CREATE POLICY "provider members can insert own schedule blocks" ON "public"."provider_schedule_blocks" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "provider_schedule_blocks"."provider_org_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"]))))));



CREATE POLICY "provider members can insert own work center capabilities" ON "public"."provider_work_center_capabilities" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."provider_work_centers" "wc"
     JOIN "public"."organization_members" "om" ON (("om"."organization_id" = "wc"."provider_org_id")))
  WHERE (("wc"."id" = "provider_work_center_capabilities"."provider_work_center_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"]))))));



CREATE POLICY "provider members can insert own work centers" ON "public"."provider_work_centers" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "provider_work_centers"."provider_org_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"]))))));



CREATE POLICY "provider members can read own bookings" ON "public"."provider_job_bookings" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "provider_job_bookings"."provider_org_id") AND ("om"."user_id" = "auth"."uid"())))));



CREATE POLICY "provider members can read own schedule blocks" ON "public"."provider_schedule_blocks" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "provider_schedule_blocks"."provider_org_id") AND ("om"."user_id" = "auth"."uid"())))));



CREATE POLICY "provider members can read own work center capabilities" ON "public"."provider_work_center_capabilities" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."provider_work_centers" "wc"
     JOIN "public"."organization_members" "om" ON (("om"."organization_id" = "wc"."provider_org_id")))
  WHERE (("wc"."id" = "provider_work_center_capabilities"."provider_work_center_id") AND ("om"."user_id" = "auth"."uid"())))));



CREATE POLICY "provider members can read own work centers" ON "public"."provider_work_centers" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "provider_work_centers"."provider_org_id") AND ("om"."user_id" = "auth"."uid"())))));



CREATE POLICY "provider members can update own bookings" ON "public"."provider_job_bookings" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "provider_job_bookings"."provider_org_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "provider_job_bookings"."provider_org_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"]))))));



CREATE POLICY "provider members can update own schedule blocks" ON "public"."provider_schedule_blocks" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "provider_schedule_blocks"."provider_org_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "provider_schedule_blocks"."provider_org_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"]))))));



CREATE POLICY "provider members can update own work centers" ON "public"."provider_work_centers" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "provider_work_centers"."provider_org_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "provider_work_centers"."provider_org_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"]))))));



ALTER TABLE "public"."provider_capabilities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "provider_capabilities_delete" ON "public"."provider_capabilities" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "provider_capabilities"."provider_org_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"]))))));



CREATE POLICY "provider_capabilities_insert" ON "public"."provider_capabilities" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "provider_capabilities"."provider_org_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"]))))));



CREATE POLICY "provider_capabilities_select" ON "public"."provider_capabilities" FOR SELECT TO "authenticated" USING (("public"."is_org_member"("provider_org_id") OR (EXISTS ( SELECT 1
   FROM "public"."provider_relationships" "pr"
  WHERE (("pr"."provider_org_id" = "provider_capabilities"."provider_org_id") AND "public"."is_org_member"("pr"."customer_org_id") AND ("pr"."relationship_status" = ANY (ARRAY['invited'::"public"."provider_relationship_status", 'active'::"public"."provider_relationship_status"])))))));



CREATE POLICY "provider_capabilities_update" ON "public"."provider_capabilities" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "provider_capabilities"."provider_org_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "provider_capabilities"."provider_org_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"]))))));



ALTER TABLE "public"."provider_invoices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "provider_invoices_insert" ON "public"."provider_invoices" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."organization_id" = "provider_invoices"."provider_org_id") AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"]))))));



CREATE POLICY "provider_invoices_select" ON "public"."provider_invoices" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."organization_id" = ANY (ARRAY["provider_invoices"."provider_org_id", "provider_invoices"."customer_org_id"]))))));



CREATE POLICY "provider_invoices_update" ON "public"."provider_invoices" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."organization_id" = "provider_invoices"."provider_org_id") AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."organization_id" = "provider_invoices"."provider_org_id") AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"]))))));



ALTER TABLE "public"."provider_job_bookings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."provider_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "provider_messages_delete" ON "public"."provider_messages" FOR DELETE TO "authenticated" USING (false);



CREATE POLICY "provider_messages_insert" ON "public"."provider_messages" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_access_provider_package"("provider_request_package_id"));



CREATE POLICY "provider_messages_select" ON "public"."provider_messages" FOR SELECT TO "authenticated" USING ("public"."can_access_provider_package"("provider_request_package_id"));



CREATE POLICY "provider_messages_update" ON "public"."provider_messages" FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);



ALTER TABLE "public"."provider_package_files" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "provider_package_files_delete_customer_only" ON "public"."provider_package_files" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."provider_request_packages" "prp"
  WHERE (("prp"."id" = "provider_package_files"."provider_request_package_id") AND "public"."is_org_member"("prp"."customer_org_id")))));



CREATE POLICY "provider_package_files_insert_customer_only" ON "public"."provider_package_files" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."provider_request_packages" "prp"
  WHERE (("prp"."id" = "provider_package_files"."provider_request_package_id") AND "public"."is_org_member"("prp"."customer_org_id")))));



CREATE POLICY "provider_package_files_select" ON "public"."provider_package_files" FOR SELECT TO "authenticated" USING ("public"."can_access_provider_package"("provider_request_package_id"));



CREATE POLICY "provider_package_files_update_customer_only" ON "public"."provider_package_files" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."provider_request_packages" "prp"
  WHERE (("prp"."id" = "provider_package_files"."provider_request_package_id") AND "public"."is_org_member"("prp"."customer_org_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."provider_request_packages" "prp"
  WHERE (("prp"."id" = "provider_package_files"."provider_request_package_id") AND "public"."is_org_member"("prp"."customer_org_id")))));



ALTER TABLE "public"."provider_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "provider_profiles_insert" ON "public"."provider_profiles" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "provider_profiles"."organization_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"]))))));



CREATE POLICY "provider_profiles_select" ON "public"."provider_profiles" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "provider_profiles"."organization_id") AND ("om"."user_id" = "auth"."uid"())))));



CREATE POLICY "provider_profiles_update" ON "public"."provider_profiles" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "provider_profiles"."organization_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "provider_profiles"."organization_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"]))))));



ALTER TABLE "public"."provider_quote_rounds" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "provider_quote_rounds_delete" ON "public"."provider_quote_rounds" FOR DELETE TO "authenticated" USING ("public"."is_org_admin"("customer_org_id"));



CREATE POLICY "provider_quote_rounds_insert" ON "public"."provider_quote_rounds" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_org_member"("customer_org_id") AND (EXISTS ( SELECT 1
   FROM "public"."service_requests" "sr"
  WHERE (("sr"."id" = "provider_quote_rounds"."service_request_id") AND ("sr"."organization_id" = "provider_quote_rounds"."customer_org_id")))) AND (("selected_provider_package_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."provider_request_packages" "prp"
  WHERE (("prp"."id" = "provider_quote_rounds"."selected_provider_package_id") AND ("prp"."service_request_id" = "provider_quote_rounds"."service_request_id") AND ("prp"."customer_org_id" = "provider_quote_rounds"."customer_org_id")))))));



CREATE POLICY "provider_quote_rounds_select" ON "public"."provider_quote_rounds" FOR SELECT TO "authenticated" USING ("public"."can_access_provider_round"("id"));



CREATE POLICY "provider_quote_rounds_update" ON "public"."provider_quote_rounds" FOR UPDATE TO "authenticated" USING (("public"."is_org_member"("customer_org_id") AND (EXISTS ( SELECT 1
   FROM "public"."service_requests" "sr"
  WHERE (("sr"."id" = "provider_quote_rounds"."service_request_id") AND ("sr"."organization_id" = "provider_quote_rounds"."customer_org_id")))))) WITH CHECK (("public"."is_org_member"("customer_org_id") AND (EXISTS ( SELECT 1
   FROM "public"."service_requests" "sr"
  WHERE (("sr"."id" = "provider_quote_rounds"."service_request_id") AND ("sr"."organization_id" = "provider_quote_rounds"."customer_org_id")))) AND (("selected_provider_package_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."provider_request_packages" "prp"
  WHERE (("prp"."id" = "provider_quote_rounds"."selected_provider_package_id") AND ("prp"."service_request_id" = "provider_quote_rounds"."service_request_id") AND ("prp"."customer_org_id" = "provider_quote_rounds"."customer_org_id")))))));



ALTER TABLE "public"."provider_quote_snapshots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "provider_quote_snapshots_insert" ON "public"."provider_quote_snapshots" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."organization_id" = "provider_quote_snapshots"."provider_org_id") AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"]))))));



CREATE POLICY "provider_quote_snapshots_select" ON "public"."provider_quote_snapshots" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."organization_id" = ANY (ARRAY["provider_quote_snapshots"."provider_org_id", "provider_quote_snapshots"."customer_org_id"]))))));



CREATE POLICY "provider_quote_snapshots_update" ON "public"."provider_quote_snapshots" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."organization_id" = "provider_quote_snapshots"."provider_org_id") AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."organization_id" = "provider_quote_snapshots"."provider_org_id") AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"]))))));



ALTER TABLE "public"."provider_quotes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "provider_quotes_delete" ON "public"."provider_quotes" FOR DELETE TO "authenticated" USING ((("public"."can_provider_access_provider_package"("provider_request_package_id") AND "public"."is_org_member"("provider_org_id")) OR "public"."can_customer_access_provider_package"("provider_request_package_id")));



CREATE POLICY "provider_quotes_insert" ON "public"."provider_quotes" FOR INSERT TO "authenticated" WITH CHECK (("public"."can_provider_access_provider_package"("provider_request_package_id") AND "public"."is_org_member"("provider_org_id")));



CREATE POLICY "provider_quotes_select" ON "public"."provider_quotes" FOR SELECT TO "authenticated" USING ("public"."can_access_provider_package"("provider_request_package_id"));



CREATE POLICY "provider_quotes_update" ON "public"."provider_quotes" FOR UPDATE TO "authenticated" USING (("public"."can_provider_access_provider_package"("provider_request_package_id") AND "public"."is_org_member"("provider_org_id"))) WITH CHECK (("public"."can_provider_access_provider_package"("provider_request_package_id") AND "public"."is_org_member"("provider_org_id")));



ALTER TABLE "public"."provider_relationships" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "provider_relationships_delete" ON "public"."provider_relationships" FOR DELETE TO "authenticated" USING ("public"."is_org_admin"("customer_org_id"));



CREATE POLICY "provider_relationships_insert" ON "public"."provider_relationships" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_org_member"("customer_org_id"));



CREATE POLICY "provider_relationships_select" ON "public"."provider_relationships" FOR SELECT TO "authenticated" USING (("public"."is_org_member"("customer_org_id") OR "public"."is_org_member"("provider_org_id")));



CREATE POLICY "provider_relationships_update" ON "public"."provider_relationships" FOR UPDATE TO "authenticated" USING (("public"."is_org_member"("customer_org_id") OR "public"."is_org_member"("provider_org_id"))) WITH CHECK (("public"."is_org_member"("customer_org_id") OR "public"."is_org_member"("provider_org_id")));



ALTER TABLE "public"."provider_request_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "provider_request_events_delete" ON "public"."provider_request_events" FOR DELETE TO "authenticated" USING (false);



CREATE POLICY "provider_request_events_insert" ON "public"."provider_request_events" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_access_provider_package"("provider_request_package_id"));



CREATE POLICY "provider_request_events_select" ON "public"."provider_request_events" FOR SELECT TO "authenticated" USING ("public"."can_access_provider_package"("provider_request_package_id"));



CREATE POLICY "provider_request_events_update" ON "public"."provider_request_events" FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);



ALTER TABLE "public"."provider_request_packages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "provider_request_packages_delete" ON "public"."provider_request_packages" FOR DELETE TO "authenticated" USING (("public"."is_org_member"("customer_org_id") AND ("published_at" IS NULL)));



CREATE POLICY "provider_request_packages_insert" ON "public"."provider_request_packages" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_org_member"("customer_org_id") AND (EXISTS ( SELECT 1
   FROM "public"."provider_quote_rounds" "pqr"
  WHERE (("pqr"."id" = "provider_request_packages"."provider_quote_round_id") AND ("pqr"."service_request_id" = "provider_request_packages"."service_request_id") AND ("pqr"."customer_org_id" = "provider_request_packages"."customer_org_id"))))));



CREATE POLICY "provider_request_packages_select" ON "public"."provider_request_packages" FOR SELECT TO "authenticated" USING (("public"."is_org_member"("customer_org_id") OR ("public"."is_org_member"("provider_org_id") AND ("published_at" IS NOT NULL))));



CREATE POLICY "provider_request_packages_update" ON "public"."provider_request_packages" FOR UPDATE TO "authenticated" USING ("public"."is_org_member"("customer_org_id")) WITH CHECK (("public"."is_org_member"("customer_org_id") AND (EXISTS ( SELECT 1
   FROM "public"."provider_quote_rounds" "pqr"
  WHERE (("pqr"."id" = "provider_request_packages"."provider_quote_round_id") AND ("pqr"."service_request_id" = "provider_request_packages"."service_request_id") AND ("pqr"."customer_org_id" = "provider_request_packages"."customer_org_id"))))));



ALTER TABLE "public"."provider_schedule_blocks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."provider_schedule_entries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "provider_schedule_entries_delete" ON "public"."provider_schedule_entries" FOR DELETE TO "authenticated" USING (("public"."can_provider_access_provider_package"("provider_request_package_id") AND "public"."is_org_member"("provider_org_id")));



CREATE POLICY "provider_schedule_entries_insert" ON "public"."provider_schedule_entries" FOR INSERT TO "authenticated" WITH CHECK (("public"."can_provider_access_provider_package"("provider_request_package_id") AND "public"."is_org_member"("provider_org_id")));



CREATE POLICY "provider_schedule_entries_select" ON "public"."provider_schedule_entries" FOR SELECT TO "authenticated" USING (("public"."can_provider_access_provider_package"("provider_request_package_id") AND "public"."is_org_member"("provider_org_id")));



CREATE POLICY "provider_schedule_entries_update" ON "public"."provider_schedule_entries" FOR UPDATE TO "authenticated" USING (("public"."can_provider_access_provider_package"("provider_request_package_id") AND "public"."is_org_member"("provider_org_id"))) WITH CHECK (("public"."can_provider_access_provider_package"("provider_request_package_id") AND "public"."is_org_member"("provider_org_id")));



ALTER TABLE "public"."provider_sites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "provider_sites_delete" ON "public"."provider_sites" FOR DELETE TO "authenticated" USING ("public"."is_org_admin"("provider_org_id"));



CREATE POLICY "provider_sites_insert" ON "public"."provider_sites" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_org_member"("provider_org_id"));



CREATE POLICY "provider_sites_select" ON "public"."provider_sites" FOR SELECT TO "authenticated" USING (("public"."is_org_member"("provider_org_id") OR (EXISTS ( SELECT 1
   FROM "public"."provider_relationships" "pr"
  WHERE (("pr"."provider_org_id" = "provider_sites"."provider_org_id") AND "public"."is_org_member"("pr"."customer_org_id") AND ("pr"."relationship_status" = ANY (ARRAY['invited'::"public"."provider_relationship_status", 'active'::"public"."provider_relationship_status"])))))));



CREATE POLICY "provider_sites_update" ON "public"."provider_sites" FOR UPDATE TO "authenticated" USING ("public"."is_org_member"("provider_org_id")) WITH CHECK ("public"."is_org_member"("provider_org_id"));



ALTER TABLE "public"."provider_work_center_capabilities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."provider_work_centers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_request_files" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_request_files_delete_org_members" ON "public"."service_request_files" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."service_requests" "sr"
     JOIN "public"."organization_members" "om" ON (("om"."organization_id" = "sr"."organization_id")))
  WHERE (("sr"."id" = "service_request_files"."service_request_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"])) AND ("sr"."status" = ANY (ARRAY['draft'::"text", 'submitted'::"text", 'in_review'::"text", 'awaiting_customer'::"text"]))))));



CREATE POLICY "service_request_files_insert_org_members" ON "public"."service_request_files" FOR INSERT WITH CHECK ((("attached_by_user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM (("public"."service_requests" "sr"
     JOIN "public"."organization_members" "om" ON (("om"."organization_id" = "sr"."organization_id")))
     JOIN "public"."part_files" "pf" ON (("pf"."id" = "service_request_files"."part_file_id")))
  WHERE (("sr"."id" = "service_request_files"."service_request_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"])) AND ("sr"."part_id" IS NOT NULL) AND ("pf"."part_id" = "sr"."part_id"))))));



CREATE POLICY "service_request_files_select_org_members" ON "public"."service_request_files" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."service_requests" "sr"
     JOIN "public"."organization_members" "om" ON (("om"."organization_id" = "sr"."organization_id")))
  WHERE (("sr"."id" = "service_request_files"."service_request_id") AND ("om"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."service_request_uploaded_files" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_request_uploaded_files_delete_org_members" ON "public"."service_request_uploaded_files" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."service_requests" "sr"
     JOIN "public"."organization_members" "om" ON (("om"."organization_id" = "sr"."organization_id")))
  WHERE (("sr"."id" = "service_request_uploaded_files"."service_request_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"])) AND ("sr"."status" = ANY (ARRAY['draft'::"text", 'submitted'::"text", 'in_review'::"text", 'awaiting_customer'::"text"]))))));



CREATE POLICY "service_request_uploaded_files_insert_org_members" ON "public"."service_request_uploaded_files" FOR INSERT WITH CHECK ((("uploaded_by_user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM ("public"."service_requests" "sr"
     JOIN "public"."organization_members" "om" ON (("om"."organization_id" = "sr"."organization_id")))
  WHERE (("sr"."id" = "service_request_uploaded_files"."service_request_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"])) AND ("sr"."status" = ANY (ARRAY['draft'::"text", 'submitted'::"text", 'in_review'::"text", 'awaiting_customer'::"text"])))))));



CREATE POLICY "service_request_uploaded_files_select_org_members" ON "public"."service_request_uploaded_files" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."service_requests" "sr"
     JOIN "public"."organization_members" "om" ON (("om"."organization_id" = "sr"."organization_id")))
  WHERE (("sr"."id" = "service_request_uploaded_files"."service_request_id") AND ("om"."user_id" = "auth"."uid"())))));



CREATE POLICY "service_request_uploaded_files_update_org_members" ON "public"."service_request_uploaded_files" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."service_requests" "sr"
     JOIN "public"."organization_members" "om" ON (("om"."organization_id" = "sr"."organization_id")))
  WHERE (("sr"."id" = "service_request_uploaded_files"."service_request_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"])) AND ("sr"."status" = ANY (ARRAY['draft'::"text", 'submitted'::"text", 'in_review'::"text", 'awaiting_customer'::"text"])))))) WITH CHECK ((("uploaded_by_user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM ("public"."service_requests" "sr"
     JOIN "public"."organization_members" "om" ON (("om"."organization_id" = "sr"."organization_id")))
  WHERE (("sr"."id" = "service_request_uploaded_files"."service_request_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"])) AND ("sr"."status" = ANY (ARRAY['draft'::"text", 'submitted'::"text", 'in_review'::"text", 'awaiting_customer'::"text"])))))));



ALTER TABLE "public"."service_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_requests_insert_org_members" ON "public"."service_requests" FOR INSERT WITH CHECK ((("requested_by_user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "service_requests"."organization_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['admin'::"text", 'engineer'::"text"]))))) AND ((("request_origin" = 'standalone'::"text") AND ("part_id" IS NULL)) OR (EXISTS ( SELECT 1
   FROM "public"."parts" "p"
  WHERE (("p"."id" = "service_requests"."part_id") AND ("p"."organization_id" = "service_requests"."organization_id")))))));



CREATE POLICY "service_requests_select_org_members" ON "public"."service_requests" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "service_requests"."organization_id") AND ("om"."user_id" = "auth"."uid"())))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."accept_invite"("invite_token" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_invite"("invite_token" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_invite"("invite_token" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_access_provider_package"("target_package_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_access_provider_package"("target_package_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_access_provider_package"("target_package_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_access_provider_round"("target_round_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_access_provider_round"("target_round_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_access_provider_round"("target_round_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_customer_access_provider_package"("target_package_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_customer_access_provider_package"("target_package_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_customer_access_provider_package"("target_package_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_customer_access_provider_round"("target_round_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_customer_access_provider_round"("target_round_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_customer_access_provider_round"("target_round_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_provider_access_provider_package"("target_package_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_provider_access_provider_package"("target_package_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_provider_access_provider_package"("target_package_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_provider_access_provider_round"("target_round_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_provider_access_provider_round"("target_round_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_provider_access_provider_round"("target_round_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_part_from_service_request"("p_request_id" "uuid", "p_name" "text", "p_part_number" "text", "p_description" "text", "p_process_type" "text", "p_material" "text", "p_category" "text", "p_status" "text", "p_revision_scheme" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_part_from_service_request"("p_request_id" "uuid", "p_name" "text", "p_part_number" "text", "p_description" "text", "p_process_type" "text", "p_material" "text", "p_category" "text", "p_status" "text", "p_revision_scheme" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_part_from_service_request"("p_request_id" "uuid", "p_name" "text", "p_part_number" "text", "p_description" "text", "p_process_type" "text", "p_material" "text", "p_category" "text", "p_status" "text", "p_revision_scheme" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_part_revision"("p_source_part_id" "uuid", "p_revision_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_part_revision"("p_source_part_id" "uuid", "p_revision_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_part_revision"("p_source_part_id" "uuid", "p_revision_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_part_with_family"("p_name" "text", "p_part_number" "text", "p_description" "text", "p_process_type" "text", "p_material" "text", "p_revision_scheme" "text", "p_category" "text", "p_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_part_with_family"("p_name" "text", "p_part_number" "text", "p_description" "text", "p_process_type" "text", "p_material" "text", "p_revision_scheme" "text", "p_category" "text", "p_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_part_with_family"("p_name" "text", "p_part_number" "text", "p_description" "text", "p_process_type" "text", "p_material" "text", "p_revision_scheme" "text", "p_category" "text", "p_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_service_request"("p_part_id" "uuid", "p_request_type" "text", "p_title" "text", "p_notes" "text", "p_priority" "text", "p_due_date" "date", "p_quantity" integer, "p_target_process" "text", "p_target_material" "text", "p_manufacturing_type" "text", "p_cad_output_type" "text", "p_optimization_goal" "text", "p_source_reference_type" "text", "p_request_meta" "jsonb", "p_part_file_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."create_service_request"("p_part_id" "uuid", "p_request_type" "text", "p_title" "text", "p_notes" "text", "p_priority" "text", "p_due_date" "date", "p_quantity" integer, "p_target_process" "text", "p_target_material" "text", "p_manufacturing_type" "text", "p_cad_output_type" "text", "p_optimization_goal" "text", "p_source_reference_type" "text", "p_request_meta" "jsonb", "p_part_file_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_service_request"("p_part_id" "uuid", "p_request_type" "text", "p_title" "text", "p_notes" "text", "p_priority" "text", "p_due_date" "date", "p_quantity" integer, "p_target_process" "text", "p_target_material" "text", "p_manufacturing_type" "text", "p_cad_output_type" "text", "p_optimization_goal" "text", "p_source_reference_type" "text", "p_request_meta" "jsonb", "p_part_file_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_standalone_service_request"("p_organization_id" "uuid", "p_request_type" "text", "p_title" "text", "p_requested_item_name" "text", "p_requested_item_reference" "text", "p_notes" "text", "p_priority" "text", "p_due_date" "date", "p_quantity" integer, "p_target_process" "text", "p_target_material" "text", "p_manufacturing_type" "text", "p_cad_output_type" "text", "p_optimization_goal" "text", "p_request_meta" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_standalone_service_request"("p_organization_id" "uuid", "p_request_type" "text", "p_title" "text", "p_requested_item_name" "text", "p_requested_item_reference" "text", "p_notes" "text", "p_priority" "text", "p_due_date" "date", "p_quantity" integer, "p_target_process" "text", "p_target_material" "text", "p_manufacturing_type" "text", "p_cad_output_type" "text", "p_optimization_goal" "text", "p_request_meta" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_standalone_service_request"("p_organization_id" "uuid", "p_request_type" "text", "p_title" "text", "p_requested_item_name" "text", "p_requested_item_reference" "text", "p_notes" "text", "p_priority" "text", "p_due_date" "date", "p_quantity" integer, "p_target_process" "text", "p_target_material" "text", "p_manufacturing_type" "text", "p_cad_output_type" "text", "p_optimization_goal" "text", "p_request_meta" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_org_members"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_org_members"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_org_members"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_org_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_org_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_org_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_public_invite_details"("invite_token" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_invite_details"("invite_token" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_invite_details"("invite_token" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_revision_label"("p_revision_scheme" "text", "p_revision_index" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_revision_label"("p_revision_scheme" "text", "p_revision_index" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_revision_label"("p_revision_scheme" "text", "p_revision_index" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_org_admin"("target_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_org_admin"("target_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_org_admin"("target_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_org_member"("target_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_org_member"("target_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_org_member"("target_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."link_service_request_to_part_revision"("p_request_id" "uuid", "p_part_id" "uuid", "p_part_file_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."link_service_request_to_part_revision"("p_request_id" "uuid", "p_part_id" "uuid", "p_part_file_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."link_service_request_to_part_revision"("p_request_id" "uuid", "p_part_id" "uuid", "p_part_file_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_org_member"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_org_member"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_org_member"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_and_validate_provider_quote_round_integrity"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_and_validate_provider_quote_round_integrity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_and_validate_provider_quote_round_integrity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_and_validate_provider_request_package_integrity"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_and_validate_provider_request_package_integrity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_and_validate_provider_request_package_integrity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_current_timestamp_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_current_timestamp_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_current_timestamp_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."submit_service_request"("p_request_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_service_request"("p_request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_service_request"("p_request_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_org_member_role"("target_user_id" "uuid", "new_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_org_member_role"("target_user_id" "uuid", "new_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_org_member_role"("target_user_id" "uuid", "new_role" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."organization_commercial_profiles" TO "anon";
GRANT ALL ON TABLE "public"."organization_commercial_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_commercial_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."organization_invites" TO "anon";
GRANT ALL ON TABLE "public"."organization_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_invites" TO "service_role";



GRANT SELECT,INSERT,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."organization_members" TO "anon";
GRANT SELECT,INSERT,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."organization_members" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_members" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."part_families" TO "anon";
GRANT ALL ON TABLE "public"."part_families" TO "authenticated";
GRANT ALL ON TABLE "public"."part_families" TO "service_role";



GRANT SELECT,INSERT,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."part_files" TO "anon";
GRANT SELECT,INSERT,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."part_files" TO "authenticated";
GRANT ALL ON TABLE "public"."part_files" TO "service_role";



GRANT SELECT,INSERT,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."parts" TO "anon";
GRANT SELECT,INSERT,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."parts" TO "authenticated";
GRANT ALL ON TABLE "public"."parts" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."provider_capabilities" TO "anon";
GRANT ALL ON TABLE "public"."provider_capabilities" TO "authenticated";
GRANT ALL ON TABLE "public"."provider_capabilities" TO "service_role";



GRANT ALL ON TABLE "public"."provider_invoices" TO "anon";
GRANT ALL ON TABLE "public"."provider_invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."provider_invoices" TO "service_role";



GRANT ALL ON TABLE "public"."provider_job_bookings" TO "anon";
GRANT ALL ON TABLE "public"."provider_job_bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."provider_job_bookings" TO "service_role";



GRANT ALL ON TABLE "public"."provider_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."provider_messages" TO "service_role";



GRANT SELECT,INSERT,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."provider_package_files" TO "authenticated";
GRANT ALL ON TABLE "public"."provider_package_files" TO "service_role";



GRANT ALL ON TABLE "public"."provider_profiles" TO "anon";
GRANT ALL ON TABLE "public"."provider_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."provider_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."provider_quote_rounds" TO "authenticated";
GRANT ALL ON TABLE "public"."provider_quote_rounds" TO "service_role";



GRANT ALL ON TABLE "public"."provider_quote_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."provider_quote_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."provider_quote_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."provider_quotes" TO "authenticated";
GRANT ALL ON TABLE "public"."provider_quotes" TO "service_role";



GRANT ALL ON TABLE "public"."provider_relationships" TO "authenticated";
GRANT ALL ON TABLE "public"."provider_relationships" TO "service_role";



GRANT ALL ON TABLE "public"."provider_request_events" TO "authenticated";
GRANT ALL ON TABLE "public"."provider_request_events" TO "service_role";



GRANT SELECT,INSERT,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."provider_request_packages" TO "authenticated";
GRANT ALL ON TABLE "public"."provider_request_packages" TO "service_role";



GRANT ALL ON TABLE "public"."provider_schedule_blocks" TO "anon";
GRANT ALL ON TABLE "public"."provider_schedule_blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."provider_schedule_blocks" TO "service_role";



GRANT ALL ON TABLE "public"."provider_schedule_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."provider_schedule_entries" TO "service_role";



GRANT ALL ON TABLE "public"."provider_sites" TO "authenticated";
GRANT ALL ON TABLE "public"."provider_sites" TO "service_role";



GRANT ALL ON TABLE "public"."provider_work_center_capabilities" TO "anon";
GRANT ALL ON TABLE "public"."provider_work_center_capabilities" TO "authenticated";
GRANT ALL ON TABLE "public"."provider_work_center_capabilities" TO "service_role";



GRANT ALL ON TABLE "public"."provider_work_centers" TO "anon";
GRANT ALL ON TABLE "public"."provider_work_centers" TO "authenticated";
GRANT ALL ON TABLE "public"."provider_work_centers" TO "service_role";



GRANT ALL ON TABLE "public"."service_request_files" TO "anon";
GRANT ALL ON TABLE "public"."service_request_files" TO "authenticated";
GRANT ALL ON TABLE "public"."service_request_files" TO "service_role";



GRANT ALL ON TABLE "public"."service_request_uploaded_files" TO "anon";
GRANT ALL ON TABLE "public"."service_request_uploaded_files" TO "authenticated";
GRANT ALL ON TABLE "public"."service_request_uploaded_files" TO "service_role";



GRANT SELECT,INSERT,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."service_requests" TO "anon";
GRANT SELECT,INSERT,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."service_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."service_requests" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































