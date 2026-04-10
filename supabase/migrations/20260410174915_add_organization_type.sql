begin;

alter table public.organizations
add column if not exists organization_type text;

update public.organizations
set organization_type = case
  when id = 'f869fc5e-e48d-47ad-8723-80ed3cf21efb' then 'customer'
  when id = '460e3508-bcff-4d2e-87ff-6e234c3e53dd' then 'provider'
  else organization_type
end;

alter table public.organizations
drop constraint if exists organizations_organization_type_check;

alter table public.organizations
add constraint organizations_organization_type_check
check (organization_type in ('customer', 'provider'));

commit;