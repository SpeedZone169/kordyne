begin;

alter table public.design_app_login_links enable row level security;
alter table public.design_app_login_links force row level security;

revoke all on table public.design_app_login_links from anon;
revoke all on table public.design_app_login_links from authenticated;

commit;
