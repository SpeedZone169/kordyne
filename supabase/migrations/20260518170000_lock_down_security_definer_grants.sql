begin;

-- Keep public invite preview callable so invite landing/signup pages still work.
revoke all on function public.get_public_invite_details(uuid) from public;
grant execute on function public.get_public_invite_details(uuid) to anon, authenticated, service_role;

-- App RPCs must be signed-in only. The function bodies still enforce org/role checks.
revoke all on function public.accept_invite(uuid) from public, anon;
revoke all on function public.create_part_from_service_request(uuid, text, text, text, text, text, text, text, text) from public, anon;
revoke all on function public.create_part_revision(uuid, text) from public, anon;
revoke all on function public.create_part_with_family(text, text, text, text, text, text, text, text) from public, anon;
revoke all on function public.create_service_request(uuid, text, text, text, text, date, integer, text, text, text, text, text, text, jsonb, uuid[]) from public, anon;
revoke all on function public.create_standalone_service_request(uuid, text, text, text, text, text, text, date, integer, text, text, text, text, text, jsonb) from public, anon;
revoke all on function public.get_current_org_members() from public, anon;
revoke all on function public.get_current_org_role() from public, anon;
revoke all on function public.link_service_request_to_part_revision(uuid, uuid, uuid[]) from public, anon;
revoke all on function public.remove_org_member(uuid) from public, anon;
revoke all on function public.submit_service_request(uuid) from public, anon;
revoke all on function public.update_org_member_role(uuid, text) from public, anon;

grant execute on function public.accept_invite(uuid) to authenticated, service_role;
grant execute on function public.create_part_from_service_request(uuid, text, text, text, text, text, text, text, text) to authenticated, service_role;
grant execute on function public.create_part_revision(uuid, text) to authenticated, service_role;
grant execute on function public.create_part_with_family(text, text, text, text, text, text, text, text) to authenticated, service_role;
grant execute on function public.create_service_request(uuid, text, text, text, text, date, integer, text, text, text, text, text, text, jsonb, uuid[]) to authenticated, service_role;
grant execute on function public.create_standalone_service_request(uuid, text, text, text, text, text, text, date, integer, text, text, text, text, text, jsonb) to authenticated, service_role;
grant execute on function public.get_current_org_members() to authenticated, service_role;
grant execute on function public.get_current_org_role() to authenticated, service_role;
grant execute on function public.link_service_request_to_part_revision(uuid, uuid, uuid[]) to authenticated, service_role;
grant execute on function public.remove_org_member(uuid) to authenticated, service_role;
grant execute on function public.submit_service_request(uuid) to authenticated, service_role;
grant execute on function public.update_org_member_role(uuid, text) to authenticated, service_role;

-- RLS helper functions are still needed by policies, but anonymous direct RPC access is not.
revoke all on function public.can_access_provider_package(uuid) from public, anon;
revoke all on function public.can_access_provider_round(uuid) from public, anon;
revoke all on function public.can_customer_access_provider_package(uuid) from public, anon;
revoke all on function public.can_customer_access_provider_round(uuid) from public, anon;
revoke all on function public.can_provider_access_provider_package(uuid) from public, anon;
revoke all on function public.can_provider_access_provider_round(uuid) from public, anon;
revoke all on function public.is_org_admin(uuid) from public, anon;
revoke all on function public.is_org_member(uuid) from public, anon;

grant execute on function public.can_access_provider_package(uuid) to authenticated, service_role;
grant execute on function public.can_access_provider_round(uuid) to authenticated, service_role;
grant execute on function public.can_customer_access_provider_package(uuid) to authenticated, service_role;
grant execute on function public.can_customer_access_provider_round(uuid) to authenticated, service_role;
grant execute on function public.can_provider_access_provider_package(uuid) to authenticated, service_role;
grant execute on function public.can_provider_access_provider_round(uuid) to authenticated, service_role;
grant execute on function public.is_org_admin(uuid) to authenticated, service_role;
grant execute on function public.is_org_member(uuid) to authenticated, service_role;

-- Trigger/event-trigger functions should not be directly callable by browser roles.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.handle_new_user_profile() from public, anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
revoke all on function public.set_and_validate_provider_quote_round_integrity() from public, anon, authenticated;
revoke all on function public.set_and_validate_provider_request_package_integrity() from public, anon, authenticated;

grant execute on function public.handle_new_user() to service_role;
grant execute on function public.handle_new_user_profile() to service_role;
grant execute on function public.rls_auto_enable() to service_role;
grant execute on function public.set_and_validate_provider_quote_round_integrity() to service_role;
grant execute on function public.set_and_validate_provider_request_package_integrity() to service_role;

-- The advisor reported this as a duplicate of provider_quotes_package_id_idx.
drop index if exists public.idx_provider_quotes_package;

commit;
