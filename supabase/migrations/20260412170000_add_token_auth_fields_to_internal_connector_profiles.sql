begin;

alter table public.internal_connector_profiles
  add column if not exists auth_mode text
    check (
      auth_mode is null
      or auth_mode = any (
        array[
          'client_credentials'::text,
          'oauth_authorization_code'::text,
          'api_token'::text
        ]
      )
    );

alter table public.internal_connector_profiles
  add column if not exists access_token_ciphertext text;

alter table public.internal_connector_profiles
  add column if not exists access_token_iv text;

alter table public.internal_connector_profiles
  add column if not exists access_token_tag text;

alter table public.internal_connector_profiles
  add column if not exists refresh_token_ciphertext text;

alter table public.internal_connector_profiles
  add column if not exists refresh_token_iv text;

alter table public.internal_connector_profiles
  add column if not exists refresh_token_tag text;

alter table public.internal_connector_profiles
  add column if not exists token_expires_at timestamp with time zone;

update public.internal_connector_profiles
set auth_mode = 'client_credentials'
where auth_mode is null
  and provider_key = 'formlabs';

commit;