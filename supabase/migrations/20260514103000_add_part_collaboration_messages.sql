create table if not exists public.part_collaboration_messages (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references public.parts(id) on delete cascade,
  revision_part_id uuid references public.parts(id) on delete set null,
  sender_org_id uuid not null references public.organizations(id) on delete cascade,
  sender_user_id uuid references public.profiles(user_id) on delete set null,
  message_type text not null default 'message',
  message_body text not null,
  created_at timestamptz not null default now(),
  constraint part_collaboration_messages_body_length_check
    check (char_length(message_body) between 1 and 4000),
  constraint part_collaboration_messages_type_check
    check (message_type in ('message', 'system'))
);

create index if not exists idx_part_collaboration_messages_part
  on public.part_collaboration_messages (part_id, created_at);

create index if not exists idx_part_collaboration_messages_revision
  on public.part_collaboration_messages (revision_part_id, created_at);

alter table public.part_collaboration_messages enable row level security;

create policy part_collaboration_messages_select
  on public.part_collaboration_messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.parts p
      join public.organization_members om
        on om.organization_id = p.organization_id
      where p.id = part_collaboration_messages.part_id
        and om.user_id = auth.uid()
    )
  );

create policy part_collaboration_messages_insert
  on public.part_collaboration_messages
  for insert
  to authenticated
  with check (
    sender_user_id = auth.uid()
    and exists (
      select 1
      from public.parts p
      join public.organization_members om
        on om.organization_id = p.organization_id
      where p.id = part_collaboration_messages.part_id
        and om.user_id = auth.uid()
        and om.organization_id = part_collaboration_messages.sender_org_id
    )
  );

create policy part_collaboration_messages_update
  on public.part_collaboration_messages
  for update
  to authenticated
  using (false)
  with check (false);

create policy part_collaboration_messages_delete
  on public.part_collaboration_messages
  for delete
  to authenticated
  using (false);

grant all on table public.part_collaboration_messages to authenticated;
grant all on table public.part_collaboration_messages to service_role;
revoke all on table public.part_collaboration_messages from anon;
