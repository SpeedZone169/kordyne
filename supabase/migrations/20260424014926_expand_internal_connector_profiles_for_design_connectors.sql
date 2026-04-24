alter table public.internal_connector_profiles
drop constraint if exists internal_connector_profiles_provider_key_check;

alter table public.internal_connector_profiles
add constraint internal_connector_profiles_provider_key_check
check (
  provider_key in (
    'formlabs',
    'markforged',
    'ultimaker',
    'stratasys',
    'hp',
    'mtconnect',
    'opc_ua',
    'manual',
    'other',
    'fusion',
    'solidworks',
    'inventor',
    'onshape',
    'catia',
    'siemens_nx',
    'plm',
    'erp'
  )
);

alter table public.internal_connector_profiles
drop constraint if exists internal_connector_profiles_last_test_status_check;

alter table public.internal_connector_profiles
add constraint internal_connector_profiles_last_test_status_check
check (
  last_test_status is null
  or last_test_status in (
    'ok',
    'error',
    'pending',
    'running',
    'succeeded',
    'failed'
  )
);