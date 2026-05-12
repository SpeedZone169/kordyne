begin;

alter table public.organization_invites
drop constraint if exists organization_invites_role_check;

alter table public.organization_invites
add constraint organization_invites_role_check
check (role = any (array['admin'::text, 'engineer'::text, 'viewer'::text]));

commit;
