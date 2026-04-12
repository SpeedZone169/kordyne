begin;

alter table public.internal_connector_profiles
  alter column client_id drop not null;

alter table public.internal_connector_profiles
  alter column client_secret_ciphertext drop not null;

alter table public.internal_connector_profiles
  alter column client_secret_iv drop not null;

alter table public.internal_connector_profiles
  alter column client_secret_tag drop not null;

update public.internal_connector_profiles
set auth_mode = 'client_credentials'
where auth_mode is null
  and provider_key = 'formlabs';

commit;