begin;

alter table public.design_app_login_links
add column if not exists client_verifier_hash text;

create index if not exists design_app_login_links_code_status_idx
  on public.design_app_login_links(link_code, status);

commit;
