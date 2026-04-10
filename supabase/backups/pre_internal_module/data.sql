SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict 15L5Z7UOMeDDal4QuraSsC8ILgRZIfq4kxEDmPJ5fs43cmgJSUbW6trSQr6H6Hp

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."audit_log_entries" ("instance_id", "id", "payload", "created_at", "ip_address") FROM stdin;
\.


--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."custom_oauth_providers" ("id", "provider_type", "identifier", "name", "client_id", "client_secret", "acceptable_client_ids", "scopes", "pkce_enabled", "attribute_mapping", "authorization_params", "enabled", "email_optional", "issuer", "discovery_url", "skip_nonce_check", "cached_discovery", "discovery_cached_at", "authorization_url", "token_url", "userinfo_url", "jwks_uri", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."flow_state" ("id", "user_id", "auth_code", "code_challenge_method", "code_challenge", "provider_type", "provider_access_token", "provider_refresh_token", "created_at", "updated_at", "authentication_method", "auth_code_issued_at", "invite_token", "referrer", "oauth_client_state_id", "linking_target_id", "email_optional") FROM stdin;
ca246af2-2b98-423c-8bda-399d70ff0d9a	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	3c0177e7-cb29-44d7-8603-597087e6987b	s256	MQKuu37X7KLrHgga44htnKNDkrJTwQ1cThCrj22wGOU	email			2026-03-14 19:28:00.329877+00	2026-03-14 19:28:21.559977+00	email/signup	2026-03-14 19:28:21.559924+00	\N	\N	\N	\N	f
00efc2c6-cb99-4508-9e28-4a1691abc16c	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	458ef1b2-c046-4568-b648-53071825f54e	s256	J4k93Hy2eFKkepG6c2Q1LvIHZWaucZbfxsdw4Mfyv6s	recovery			2026-03-16 11:34:54.818695+00	2026-03-16 11:34:54.818695+00	recovery	\N	\N	\N	\N	\N	f
e813b2cc-90af-4b11-974e-51497d52159d	640e1239-182c-4409-8f3c-c43fdef11271	ed71b012-c4c8-46c5-b1db-9247f9bc3395	s256	MP1qom-9dobA7wsXRoNydi9MjwkbMIzrYvdoHyzav8E	email			2026-03-17 15:27:23.102624+00	2026-03-17 15:27:23.102624+00	email/signup	\N	\N	\N	\N	\N	f
0c9014e5-8eb6-4403-a49b-90d8516a88f2	640e1239-182c-4409-8f3c-c43fdef11271	5196475b-fbc2-4408-a74f-771a59472b15	s256	oyCWAeuqqmzq7wvy47KNGEfLQnJFEAGA3ixHoqla2vg	email			2026-03-17 15:28:39.64213+00	2026-03-17 15:28:39.64213+00	email/signup	\N	\N	\N	\N	\N	f
0d286824-7743-416b-b89e-ca67fff73c3b	48879a91-551e-4384-8b41-7825a5405f30	d8b9ee50-3f5b-4b3a-aac2-9188b56e21ad	s256	n7pc23BVjHYgludDzfbbmKEmF9zXC_Yle6vfe7W2x5k	email			2026-03-17 17:25:15.25386+00	2026-03-17 17:26:13.387826+00	email/signup	2026-03-17 17:26:13.387777+00	\N	\N	\N	\N	f
664a6cd8-9183-4db8-9ce7-5e42b89e8bab	48879a91-551e-4384-8b41-7825a5405f30	89ffd946-6d2a-4523-a080-c8e31efd7e2e	s256	BEQgKTqrPTG2qsAGtv0WKIw6JUgmD-15v6XGNLTvCCA	recovery			2026-03-18 19:20:17.653241+00	2026-03-18 19:48:37.835275+00	recovery	2026-03-18 19:48:37.835206+00	\N	\N	\N	\N	f
180ad302-277d-4256-a414-148edb078475	48879a91-551e-4384-8b41-7825a5405f30	331edaf9-67ae-4821-bbad-2e05a767fe9e	s256	bgalL-O8GUMxGFLED8Gm3RwbiHSug5QW4MWjTJq6SQ4	recovery			2026-03-18 21:56:59.134875+00	2026-03-18 21:56:59.134875+00	recovery	\N	\N	\N	\N	\N	f
2a18d20e-6d48-43fc-b0f9-8d29c7acaea2	640e1239-182c-4409-8f3c-c43fdef11271	ebc03167-fc4a-4aff-9ab0-e3816e744d90	s256	YetQOYhyY898dd5JB3BNS5mfz_-V-MC6H0goA2n1s5s	email			2026-03-19 17:48:01.11943+00	2026-03-19 17:48:01.11943+00	email/signup	\N	\N	\N	\N	\N	f
1ac90b58-b17e-42f7-9b65-f1bf0e864c0e	640e1239-182c-4409-8f3c-c43fdef11271	af86a75e-07cc-4cb3-9b7a-24e028e55e5f	s256	985c71xylkoeg0i7S2X6NDA-nhnKcoDtlEY7W8hJWkM	email			2026-03-19 18:11:30.068697+00	2026-03-19 18:11:30.068697+00	email/signup	\N	\N	\N	\N	\N	f
8c4c8e62-0659-4545-8ae1-3e2efb573a82	640e1239-182c-4409-8f3c-c43fdef11271	3f6ba990-ecb7-4e96-babd-69d849f7c2b4	s256	Ejv1QO1NTBodeNQRBg2Zf4COS8FrQRIUUK8IUfZ9Wk4	recovery			2026-03-26 20:17:55.958727+00	2026-03-26 20:17:55.958727+00	recovery	\N	\N	\N	\N	\N	f
f2a7b2ae-ed66-432b-8eb7-bc76e3965cb1	48879a91-551e-4384-8b41-7825a5405f30	d573d11a-0842-49a6-8aa6-929544d2db55	s256	X-tN6OPguYD9QgjDzRiMeY1-EObmpHzpUlIybEaQfgw	recovery			2026-03-27 22:43:18.687402+00	2026-03-27 22:43:48.341187+00	recovery	2026-03-27 22:43:48.341131+00	\N	\N	\N	\N	f
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") FROM stdin;
00000000-0000-0000-0000-000000000000	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	authenticated	authenticated	lukasz.gorlowski@gmail.com	$2a$10$c5oSa.r9.heAab7Y3X7OT.ahooBroZuvCs02BlSusBTBe5PmvguEi	2026-03-14 19:28:21.54742+00	\N		2026-03-14 19:28:00.347937+00	pkce_3225e06c0238d9a222ee7a4310e645cddcd84b024d8f75e97c0d42ee	2026-03-16 11:34:54.841766+00			\N	2026-04-04 21:41:23.692694+00	{"provider": "email", "providers": ["email"]}	{"sub": "7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3", "email": "lukasz.gorlowski@gmail.com", "email_verified": true, "phone_verified": false}	\N	2026-03-14 19:28:00.294865+00	2026-04-05 06:44:57.482813+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	640e1239-182c-4409-8f3c-c43fdef11271	authenticated	authenticated	speedzonefamily@gmail.com	$2a$10$hEykGUD8LfzaTACLwZiXgeMxQnopbDTJONP.F8vupNrSIR03fy2jq	2026-03-19 18:13:50.921673+00	\N		\N		2026-03-26 20:19:01.015812+00			\N	2026-04-06 20:21:22.56453+00	{"provider": "email", "providers": ["email"]}	{"sub": "640e1239-182c-4409-8f3c-c43fdef11271", "email": "speedzonefamily@gmail.com", "company": "Test", "full_name": "Test", "terms_version": "2026-03-16", "accepted_terms": true, "email_verified": true, "phone_verified": false, "terms_accepted_at": "2026-03-17T15:24:40.257Z", "privacy_version_shown": "2026-03-16"}	\N	2026-03-17 15:27:23.032341+00	2026-04-09 20:29:54.960771+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	48879a91-551e-4384-8b41-7825a5405f30	authenticated	authenticated	aurelia.strycharz@gmail.com	$2a$10$a7zDxYoWKykio6WG0xRU/eDVMZf2ZoWTQlpg7357zXISx8PljlWzK	2026-03-17 17:26:13.377445+00	\N		\N		\N			\N	2026-04-06 20:18:34.901717+00	{"provider": "email", "providers": ["email"]}	{"sub": "48879a91-551e-4384-8b41-7825a5405f30", "email": "aurelia.strycharz@gmail.com", "company": "Nowak", "full_name": "Jan", "terms_version": "2026-03-16", "accepted_terms": true, "email_verified": true, "phone_verified": false, "terms_accepted_at": "2026-03-17T17:22:32.179Z", "privacy_version_shown": "2026-03-16"}	\N	2026-03-17 17:25:15.184272+00	2026-04-06 20:18:34.931499+00	\N	\N			\N		0	\N		\N	f	\N	f
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") FROM stdin;
7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	{"sub": "7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3", "email": "lukasz.gorlowski@gmail.com", "email_verified": true, "phone_verified": false}	email	2026-03-14 19:28:00.319655+00	2026-03-14 19:28:00.319704+00	2026-03-14 19:28:00.319704+00	9d68b77f-2bf6-436f-976f-af12e43cc54f
640e1239-182c-4409-8f3c-c43fdef11271	640e1239-182c-4409-8f3c-c43fdef11271	{"sub": "640e1239-182c-4409-8f3c-c43fdef11271", "email": "speedzonefamily@gmail.com", "company": "Test", "full_name": "Test", "terms_version": "2026-03-16", "accepted_terms": true, "email_verified": false, "phone_verified": false, "terms_accepted_at": "2026-03-17T15:24:40.257Z", "privacy_version_shown": "2026-03-16"}	email	2026-03-17 15:27:23.080962+00	2026-03-17 15:27:23.081393+00	2026-03-17 15:27:23.081393+00	594b84c1-8571-4bed-8c08-1dc56b4f0954
48879a91-551e-4384-8b41-7825a5405f30	48879a91-551e-4384-8b41-7825a5405f30	{"sub": "48879a91-551e-4384-8b41-7825a5405f30", "email": "aurelia.strycharz@gmail.com", "company": "Nowak", "full_name": "Jan", "terms_version": "2026-03-16", "accepted_terms": true, "email_verified": true, "phone_verified": false, "terms_accepted_at": "2026-03-17T17:22:32.179Z", "privacy_version_shown": "2026-03-16"}	email	2026-03-17 17:25:15.249095+00	2026-03-17 17:25:15.249142+00	2026-03-17 17:25:15.249142+00	2ff9790d-8dd6-4564-bf69-4e9ea9d29c9d
\.


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."instances" ("id", "uuid", "raw_base_config", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_clients" ("id", "client_secret_hash", "registration_type", "redirect_uris", "grant_types", "client_name", "client_uri", "logo_uri", "created_at", "updated_at", "deleted_at", "client_type", "token_endpoint_auth_method") FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag", "oauth_client_id", "refresh_token_hmac_key", "refresh_token_counter", "scopes") FROM stdin;
9c52013e-cc32-4273-a45f-36057e96810c	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	2026-04-04 21:41:23.69406+00	2026-04-05 06:44:57.489125+00	1cf49398-c747-41dd-bc8c-9dda0b8e32c2	aal2	\N	2026-04-05 06:44:57.489032	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/29.0 Chrome/136.0.0.0 Mobile Safari/537.36	80.233.51.172	\N	\N	\N	\N	\N
3e7fc0d1-a07e-44da-8ce9-67c9ef2a7dbf	640e1239-182c-4409-8f3c-c43fdef11271	2026-04-06 20:21:22.566429+00	2026-04-09 20:29:59.056433+00	\N	aal1	\N	2026-04-09 20:29:59.0563	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	37.228.252.186	\N	\N	\N	\N	\N
\.


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") FROM stdin;
9c52013e-cc32-4273-a45f-36057e96810c	2026-04-04 21:41:23.724868+00	2026-04-04 21:41:23.724868+00	password	73a5cd39-765e-4e33-9992-e354934bd085
9c52013e-cc32-4273-a45f-36057e96810c	2026-04-04 21:41:36.694777+00	2026-04-04 21:41:36.694777+00	totp	a3556471-eebb-43e4-9877-c8aa4c1778ad
3e7fc0d1-a07e-44da-8ce9-67c9ef2a7dbf	2026-04-06 20:21:22.603739+00	2026-04-06 20:21:22.603739+00	password	8b2564c1-8d61-4d92-9927-795633330c46
\.


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_factors" ("id", "user_id", "friendly_name", "factor_type", "status", "created_at", "updated_at", "secret", "phone", "last_challenged_at", "web_authn_credential", "web_authn_aaguid", "last_webauthn_challenge_data") FROM stdin;
1cf49398-c747-41dd-bc8c-9dda0b8e32c2	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3		totp	verified	2026-04-02 21:40:06.146175+00	2026-04-04 21:41:36.602312+00	3HKEOXMVABF6S4ZEEOCH35P5OPHI6Q5G	\N	2026-04-04 21:41:36.593+00	\N	\N	\N
\.


--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_challenges" ("id", "factor_id", "created_at", "verified_at", "ip_address", "otp_code", "web_authn_session_data") FROM stdin;
613f687f-2c3c-4f24-91f5-c07a9c4f41df	1cf49398-c747-41dd-bc8c-9dda0b8e32c2	2026-04-02 21:40:51.512251+00	2026-04-02 21:40:51.659952+00	37.228.252.186		\N
b5b64343-b593-4395-aed5-316ebfcdf839	1cf49398-c747-41dd-bc8c-9dda0b8e32c2	2026-04-03 21:50:18.535113+00	2026-04-03 21:50:18.682763+00	37.228.252.186		\N
aa746dca-098c-4d64-b1eb-f2e7be8c8adf	1cf49398-c747-41dd-bc8c-9dda0b8e32c2	2026-04-04 21:40:04.094491+00	2026-04-04 21:40:04.2904+00	80.233.51.172		\N
268ea3c2-fcbc-4a23-af97-ccb7420e26f1	1cf49398-c747-41dd-bc8c-9dda0b8e32c2	2026-04-04 21:41:36.59308+00	2026-04-04 21:41:36.689959+00	80.233.51.172		\N
\.


--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_authorizations" ("id", "authorization_id", "client_id", "user_id", "redirect_uri", "scope", "state", "resource", "code_challenge", "code_challenge_method", "response_type", "status", "authorization_code", "created_at", "expires_at", "approved_at", "nonce") FROM stdin;
\.


--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_client_states" ("id", "provider_type", "code_verifier", "created_at") FROM stdin;
\.


--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_consents" ("id", "user_id", "client_id", "scopes", "granted_at", "revoked_at") FROM stdin;
\.


--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."one_time_tokens" ("id", "user_id", "token_type", "token_hash", "relates_to", "created_at", "updated_at") FROM stdin;
c585019c-8ca1-4045-8b53-81d5ea10fc06	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	recovery_token	pkce_3225e06c0238d9a222ee7a4310e645cddcd84b024d8f75e97c0d42ee	lukasz.gorlowski@gmail.com	2026-03-16 11:34:55.3149	2026-03-16 11:34:55.3149
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") FROM stdin;
00000000-0000-0000-0000-000000000000	108	g3lnub6felbe	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	t	2026-04-04 21:41:23.709602+00	2026-04-04 21:41:36.717524+00	\N	9c52013e-cc32-4273-a45f-36057e96810c
00000000-0000-0000-0000-000000000000	109	qhgb2x4vb5me	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	t	2026-04-04 21:41:36.719683+00	2026-04-05 06:44:57.441467+00	g3lnub6felbe	9c52013e-cc32-4273-a45f-36057e96810c
00000000-0000-0000-0000-000000000000	110	etc4kqcatrer	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	f	2026-04-05 06:44:57.467279+00	2026-04-05 06:44:57.467279+00	qhgb2x4vb5me	9c52013e-cc32-4273-a45f-36057e96810c
00000000-0000-0000-0000-000000000000	125	syuxui6pmgpp	640e1239-182c-4409-8f3c-c43fdef11271	t	2026-04-06 20:21:22.585985+00	2026-04-07 18:29:06.378156+00	\N	3e7fc0d1-a07e-44da-8ce9-67c9ef2a7dbf
00000000-0000-0000-0000-000000000000	126	qsbzi5jtpfe4	640e1239-182c-4409-8f3c-c43fdef11271	t	2026-04-07 18:29:06.400678+00	2026-04-07 20:39:50.898446+00	syuxui6pmgpp	3e7fc0d1-a07e-44da-8ce9-67c9ef2a7dbf
00000000-0000-0000-0000-000000000000	127	wrtavr6eemra	640e1239-182c-4409-8f3c-c43fdef11271	t	2026-04-07 20:39:50.921068+00	2026-04-08 20:31:59.582612+00	qsbzi5jtpfe4	3e7fc0d1-a07e-44da-8ce9-67c9ef2a7dbf
00000000-0000-0000-0000-000000000000	128	jdlnea33ytb2	640e1239-182c-4409-8f3c-c43fdef11271	t	2026-04-08 20:31:59.607626+00	2026-04-09 20:29:54.927696+00	wrtavr6eemra	3e7fc0d1-a07e-44da-8ce9-67c9ef2a7dbf
00000000-0000-0000-0000-000000000000	129	izqvfplh6b6z	640e1239-182c-4409-8f3c-c43fdef11271	f	2026-04-09 20:29:54.948147+00	2026-04-09 20:29:54.948147+00	jdlnea33ytb2	3e7fc0d1-a07e-44da-8ce9-67c9ef2a7dbf
\.


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sso_providers" ("id", "resource_id", "created_at", "updated_at", "disabled") FROM stdin;
\.


--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."saml_providers" ("id", "sso_provider_id", "entity_id", "metadata_xml", "metadata_url", "attribute_mapping", "created_at", "updated_at", "name_id_format") FROM stdin;
\.


--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."saml_relay_states" ("id", "sso_provider_id", "request_id", "for_email", "redirect_to", "created_at", "updated_at", "flow_state_id") FROM stdin;
\.


--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sso_domains" ("id", "sso_provider_id", "domain", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."webauthn_challenges" ("id", "user_id", "challenge_type", "session_data", "created_at", "expires_at") FROM stdin;
\.


--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."webauthn_credentials" ("id", "user_id", "credential_id", "public_key", "attestation_type", "aaguid", "sign_count", "transports", "backup_eligible", "backed_up", "friendly_name", "created_at", "updated_at", "last_used_at") FROM stdin;
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."organizations" ("id", "name", "slug", "created_at", "plan", "seat_limit", "billing_status", "onboarding_status", "plan_started_at", "plan_ends_at", "internal_notes") FROM stdin;
f869fc5e-e48d-47ad-8723-80ed3cf21efb	Test	test-7992e2e4	2026-03-17 14:19:37.436946+00	starter	5	pending	lead	\N	\N	\N
460e3508-bcff-4d2e-87ff-6e234c3e53dd	Kordyne Test Provider	kordyne-test-provider	2026-03-26 20:13:57.430879+00	free	10	pending	lead	\N	\N	\N
b57ecc4f-f00c-4b8e-80ac-44b9bf8a941e	Kordyne Test Company	nowak-48879a91	2026-03-17 17:25:15.183916+00	starter	5	pending	lead	\N	\N	\N
392e8080-f0dd-4d85-a3d9-e099ba87c6de	Honor	honor	2026-03-28 11:48:50.201536+00	starter	5	pending	lead	\N	\N	\N
\.


--
-- Data for Name: organization_commercial_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."organization_commercial_profiles" ("organization_id", "legal_name", "trading_name", "address_line_1", "address_line_2", "city", "region", "postal_code", "country", "vat_number", "company_number", "contact_name", "contact_email", "contact_phone", "website", "created_at", "updated_at") FROM stdin;
460e3508-bcff-4d2e-87ff-6e234c3e53dd	Kordyne Test Provider Limited	Kordyne Test Provider	Unit 4 Industrial Park	Dock Road	Cork	County Cork	T12 TEST	Ireland	IE1234567T	765432	Provider Operations	quotes@testprovider.kordyne.com	+353 1 555 0101	www.testprovider.example	2026-03-27 16:16:06.420638+00	2026-03-27 16:16:06.420638+00
\.


--
-- Data for Name: organization_invites; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."organization_invites" ("id", "organization_id", "email", "role", "invited_by_user_id", "status", "created_at", "token", "accepted_at") FROM stdin;
6172a099-5073-4f43-a015-74213950da94	b57ecc4f-f00c-4b8e-80ac-44b9bf8a941e	speedzonefamily@gmail.com	engineer	48879a91-551e-4384-8b41-7825a5405f30	revoked	2026-03-18 22:23:01.900267+00	9cb41ff7-40c1-495f-90f5-3ab9c1728d15	\N
35a3cf2d-12d0-4d15-8a7a-7655505bd75e	f869fc5e-e48d-47ad-8723-80ed3cf21efb	speedzonefamily@gmail.com	engineer	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	revoked	2026-03-19 18:09:47.105416+00	d28c0033-f38d-4ffd-b4c9-db99cad32ffd	\N
e06efe49-ddea-4bb9-8978-0f6ede70d4bf	b57ecc4f-f00c-4b8e-80ac-44b9bf8a941e	speedzonefamily@gmail.com	engineer	48879a91-551e-4384-8b41-7825a5405f30	revoked	2026-03-19 17:44:53.214052+00	63e20708-e55b-416a-b276-29e947335cb8	\N
198c480f-7d10-4cd6-b5f4-9cd6ac8121b0	f869fc5e-e48d-47ad-8723-80ed3cf21efb	speedzonefamily@gmail.com	engineer	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	accepted	2026-03-19 19:45:31.236716+00	a0879259-60ab-4949-b6ed-cfee89bed9d9	2026-03-19 19:47:03.384564+00
\.


--
-- Data for Name: organization_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."organization_members" ("id", "organization_id", "user_id", "role", "created_at") FROM stdin;
357a0d76-a17b-4943-91f8-2bea04634ad3	460e3508-bcff-4d2e-87ff-6e234c3e53dd	640e1239-182c-4409-8f3c-c43fdef11271	admin	2026-03-26 20:13:57.430879+00
e4608706-ebc9-4291-86b1-2eab9a1d6e17	f869fc5e-e48d-47ad-8723-80ed3cf21efb	48879a91-551e-4384-8b41-7825a5405f30	admin	2026-03-17 17:25:15.183916+00
\.


--
-- Data for Name: part_families; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."part_families" ("id", "organization_id", "name", "part_number", "created_at", "revision_scheme") FROM stdin;
4c731a5a-d921-4eea-87db-50df363223a7	f869fc5e-e48d-47ad-8723-80ed3cf21efb	test 2	FGH	2026-03-20 21:52:35.883271+00	alphabetic
20711f74-3d82-4f10-8a12-f7821bf54650	f869fc5e-e48d-47ad-8723-80ed3cf21efb	Test 123	1234	2026-03-20 21:52:35.883271+00	alphabetic
cdd4f5af-efa5-4c22-b09b-7e4dc26e9193	f869fc5e-e48d-47ad-8723-80ed3cf21efb	Test	Test_123	2026-03-20 21:52:35.883271+00	alphabetic
96dc72c0-159b-46d2-a99c-f48225bcfffe	f869fc5e-e48d-47ad-8723-80ed3cf21efb	test	test	2026-03-22 17:20:20.032558+00	numeric
\.


--
-- Data for Name: parts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."parts" ("id", "user_id", "name", "part_number", "description", "process_type", "material", "revision", "category", "status", "created_at", "organization_id", "updated_at", "part_family_id", "revision_note", "revision_created_from_part_id", "revision_index") FROM stdin;
7dc25346-681e-4f2c-b93f-66562b3036a2	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	Test	Test_123	Test_123_V1	Composite	Carbon	A	Spare parts	draft	2026-03-14 19:30:41.867241+00	f869fc5e-e48d-47ad-8723-80ed3cf21efb	2026-03-17 18:05:25.024649+00	cdd4f5af-efa5-4c22-b09b-7e4dc26e9193	\N	\N	1
cedf41d3-a3af-44d0-9b1f-80c88ba2be25	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	test 2	FGH	Test 4	3D printed	PLA	A	Part	active	2026-03-16 15:36:58.821066+00	f869fc5e-e48d-47ad-8723-80ed3cf21efb	2026-03-17 18:05:25.024649+00	4c731a5a-d921-4eea-87db-50df363223a7	\N	\N	1
d74ae3e8-e235-4dfd-9f4e-81afe55a1598	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	Test 123	1234	Machine Part	3D printed	PLA	A	Parts	archived	2026-03-17 17:39:44.321088+00	f869fc5e-e48d-47ad-8723-80ed3cf21efb	2026-03-17 18:05:25.024649+00	20711f74-3d82-4f10-8a12-f7821bf54650	\N	\N	1
a02c8a11-5618-44ba-a6b0-767b0c2d858d	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	Test 123	1234	Machine Part	3D printed	PLA	B	Parts	draft	2026-03-20 22:09:53.986266+00	f869fc5e-e48d-47ad-8723-80ed3cf21efb	2026-03-20 22:09:53.986266+00	20711f74-3d82-4f10-8a12-f7821bf54650	\N	\N	2
6c0e98bd-a164-447b-a862-c9aa4f9a17da	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	Test 123	1234	Machine Part	3D printed	PLA	C	Parts	draft	2026-03-20 22:10:39.429282+00	f869fc5e-e48d-47ad-8723-80ed3cf21efb	2026-03-20 22:10:39.429282+00	20711f74-3d82-4f10-8a12-f7821bf54650	\N	\N	3
66b28982-ef3a-477c-9f86-917bda93c572	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	Test 123	1234	Machine Part	3D printed	PLA	D	Parts	draft	2026-03-20 22:10:48.963494+00	f869fc5e-e48d-47ad-8723-80ed3cf21efb	2026-03-20 22:10:48.963494+00	20711f74-3d82-4f10-8a12-f7821bf54650	\N	\N	4
bc1d6086-2bc8-4f4a-b032-9e65d59ddf50	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	Test 123	1234	Machine Part	3D printed	PLA	E	Parts	draft	2026-03-20 22:11:47.17672+00	f869fc5e-e48d-47ad-8723-80ed3cf21efb	2026-03-20 22:11:47.17672+00	20711f74-3d82-4f10-8a12-f7821bf54650	\N	\N	5
5c2ce12b-fa40-4611-a30f-58de840d1de8	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	Test 123	1234	Machine Part	3D printed	PLA	F	Parts	draft	2026-03-20 22:54:34.562236+00	f869fc5e-e48d-47ad-8723-80ed3cf21efb	2026-03-20 22:54:34.562236+00	20711f74-3d82-4f10-8a12-f7821bf54650	\N	bc1d6086-2bc8-4f4a-b032-9e65d59ddf50	6
a052c595-efb0-4699-ade7-98cc6b52b430	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	Test 123	1234	Machine Part	3D printed	PLA	G	Parts	draft	2026-03-21 13:00:19.159881+00	f869fc5e-e48d-47ad-8723-80ed3cf21efb	2026-03-21 13:00:19.159881+00	20711f74-3d82-4f10-8a12-f7821bf54650	\N	d74ae3e8-e235-4dfd-9f4e-81afe55a1598	7
f9c5d42b-ab18-4224-9b5f-1200f934ca46	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	Test 123	1234	Machine Part	3D printed	PLA	H	Parts	draft	2026-03-22 17:05:33.491691+00	f869fc5e-e48d-47ad-8723-80ed3cf21efb	2026-03-22 17:05:33.491691+00	20711f74-3d82-4f10-8a12-f7821bf54650	test	a052c595-efb0-4699-ade7-98cc6b52b430	8
bd23ff0e-4585-490a-bd21-cb80a0ba33ae	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	test	test	test	3d_printing	PLA	1	tooling	active	2026-03-22 17:20:20.032558+00	f869fc5e-e48d-47ad-8723-80ed3cf21efb	2026-04-06 14:34:24.96+00	96dc72c0-159b-46d2-a99c-f48225bcfffe	\N	\N	1
\.


--
-- Data for Name: part_files; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."part_files" ("id", "part_id", "user_id", "file_name", "file_type", "asset_category", "storage_path", "created_at", "file_size_bytes", "aps_object_key", "aps_object_id", "aps_urn", "aps_translation_status", "aps_translation_progress", "aps_manifest_json", "aps_last_prepared_at", "aps_last_translated_at", "aps_last_error") FROM stdin;
ae433d59-7c7a-4ab8-8fe4-7abe47ab1f13	d74ae3e8-e235-4dfd-9f4e-81afe55a1598	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	Test.txt	txt	other	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3/d74ae3e8-e235-4dfd-9f4e-81afe55a1598/1773769143671-Test.txt	2026-03-17 17:41:46.787493+00	0	\N	\N	\N	\N	\N	\N	\N	\N	\N
169af563-50f2-47de-8f2f-ce29064922c6	d74ae3e8-e235-4dfd-9f4e-81afe55a1598	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	Test.txt	txt	other	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3/d74ae3e8-e235-4dfd-9f4e-81afe55a1598/1773769558422-Test.txt	2026-03-17 17:48:41.496632+00	18	\N	\N	\N	\N	\N	\N	\N	\N	\N
ca6ec2c0-5f32-4fc5-98ce-4c65890837a9	d74ae3e8-e235-4dfd-9f4e-81afe55a1598	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	Test.txt	txt	other	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3/d74ae3e8-e235-4dfd-9f4e-81afe55a1598/1773770353458-Test.txt	2026-03-17 18:01:56.334449+00	18	\N	\N	\N	\N	\N	\N	\N	\N	\N
df1688d8-91ce-4cae-8f33-072c9f597732	a052c595-efb0-4699-ade7-98cc6b52b430	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	Test.txt	txt	other	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3/a052c595-efb0-4699-ade7-98cc6b52b430/1774097855549-Test.txt	2026-03-21 13:00:19.773613+00	18	\N	\N	\N	\N	\N	\N	\N	\N	\N
929de377-d5d9-4069-ae5d-954596eb6170	a052c595-efb0-4699-ade7-98cc6b52b430	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	Test.txt	txt	other	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3/a052c595-efb0-4699-ade7-98cc6b52b430/1774097855943-Test.txt	2026-03-21 13:00:19.98775+00	18	\N	\N	\N	\N	\N	\N	\N	\N	\N
bd611935-8109-4dc8-809f-1f4a1fd69bb7	bd23ff0e-4585-490a-bd21-cb80a0ba33ae	48879a91-551e-4384-8b41-7825a5405f30	ZIPwhistle.stl	stl	cad_3d	48879a91-551e-4384-8b41-7825a5405f30/bd23ff0e-4585-490a-bd21-cb80a0ba33ae/1775320282943-ZIPwhistle.stl	2026-04-04 16:34:13.371442+00	815884	\N	\N	\N	\N	\N	\N	\N	\N	\N
16292aab-b5f1-45e3-a660-ec55e9a51365	bd23ff0e-4585-490a-bd21-cb80a0ba33ae	48879a91-551e-4384-8b41-7825a5405f30	Body1.stl	stl	cad_3d	48879a91-551e-4384-8b41-7825a5405f30/bd23ff0e-4585-490a-bd21-cb80a0ba33ae/1775486094923-Body1.stl	2026-04-06 14:37:46.293561+00	1656647	\N	\N	\N	\N	\N	\N	\N	\N	\N
2632aee6-11bf-4fa8-97fd-c0d0c444fbea	bd23ff0e-4585-490a-bd21-cb80a0ba33ae	48879a91-551e-4384-8b41-7825a5405f30	Test.pdf	pdf	drawing_2d	48879a91-551e-4384-8b41-7825a5405f30/bd23ff0e-4585-490a-bd21-cb80a0ba33ae/1775486224213-Test.pdf	2026-04-06 14:39:56.47231+00	26895	\N	\N	\N	\N	\N	\N	\N	\N	\N
45c84cda-a7a2-46f2-b647-f7dcb2f8a8c1	bd23ff0e-4585-490a-bd21-cb80a0ba33ae	48879a91-551e-4384-8b41-7825a5405f30	Test_1.step	step	cad_3d	48879a91-551e-4384-8b41-7825a5405f30/bd23ff0e-4585-490a-bd21-cb80a0ba33ae/1775486106617-Test_1.step	2026-04-06 14:37:58.130715+00	33475	45c84cda-a7a2-46f2-b647-f7dcb2f8a8c1-Test_1.step	urn:adsk.objects:os.object:kordyne-step-preview-prod-emea/45c84cda-a7a2-46f2-b647-f7dcb2f8a8c1-Test_1.step	dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6a29yZHluZS1zdGVwLXByZXZpZXctcHJvZC1lbWVhLzQ1Yzg0Y2RhLWE3YTItNDZmMi1iNjQ3LWY3ZGNiMmY4YThjMS1UZXN0XzEuc3RlcA	success	complete	{"urn": "dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6a29yZHluZS1zdGVwLXByZXZpZXctcHJvZC1lbWVhLzQ1Yzg0Y2RhLWE3YTItNDZmMi1iNjQ3LWY3ZGNiMmY4YThjMS1UZXN0XzEuc3RlcA", "type": "manifest", "region": "US", "status": "success", "version": "1.0", "progress": "complete", "derivatives": [{"name": "45c84cda-a7a2-46f2-b647-f7dcb2f8a8c1-Test_1.step", "status": "success", "children": [{"guid": "1705c7aa-0f8b-4dee-bf10-53b4b411795f", "name": "Scene", "role": "3d", "type": "geometry", "status": "success", "children": [{"urn": "urn:adsk.viewing:fs.file:dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6a29yZHluZS1zdGVwLXByZXZpZXctcHJvZC1lbWVhLzQ1Yzg0Y2RhLWE3YTItNDZmMi1iNjQ3LWY3ZGNiMmY4YThjMS1UZXN0XzEuc3RlcA/output/1/45c84cda-a7a2-46f2-b647-f7dcb2f8a8c1-Test_1.svf.png01_thumb_400x400.png", "guid": "8892aa85-3c3f-4e50-8b99-146de65cee3e", "mime": "image/png", "role": "thumbnail", "type": "resource", "resolution": [400, 400]}, {"urn": "urn:adsk.viewing:fs.file:dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6a29yZHluZS1zdGVwLXByZXZpZXctcHJvZC1lbWVhLzQ1Yzg0Y2RhLWE3YTItNDZmMi1iNjQ3LWY3ZGNiMmY4YThjMS1UZXN0XzEuc3RlcA/output/1/45c84cda-a7a2-46f2-b647-f7dcb2f8a8c1-Test_1.svf.png01_thumb_200x200.png", "guid": "ff74b129-a200-42fd-a97e-58674de8b1fa", "mime": "image/png", "role": "thumbnail", "type": "resource", "resolution": [200, 200]}, {"urn": "urn:adsk.viewing:fs.file:dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6a29yZHluZS1zdGVwLXByZXZpZXctcHJvZC1lbWVhLzQ1Yzg0Y2RhLWE3YTItNDZmMi1iNjQ3LWY3ZGNiMmY4YThjMS1UZXN0XzEuc3RlcA/output/1/45c84cda-a7a2-46f2-b647-f7dcb2f8a8c1-Test_1.svf.png01_thumb_100x100.png", "guid": "2cde173d-59cc-4385-87eb-0b4841eb2e53", "mime": "image/png", "role": "thumbnail", "type": "resource", "resolution": [100, 100]}, {"guid": "468dbe09-2106-4965-ba63-c6f61a06272b", "mime": "application/autodesk-svf2", "role": "graphics", "type": "resource"}], "progress": "complete", "hasThumbnail": "true"}, {"urn": "urn:adsk.viewing:fs.file:dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6a29yZHluZS1zdGVwLXByZXZpZXctcHJvZC1lbWVhLzQ1Yzg0Y2RhLWE3YTItNDZmMi1iNjQ3LWY3ZGNiMmY4YThjMS1UZXN0XzEuc3RlcA/output/1/properties.db", "guid": "c49b4287-3b50-473f-b682-a29ee1e1409d", "mime": "application/autodesk-db", "role": "Autodesk.CloudPlatform.PropertyDatabase", "type": "resource", "status": "success"}, {"guid": "8e622ad8-3199-48cf-9511-e8dfc66f81cf", "name": "Scene", "role": "3d", "type": "geometry", "status": "success", "children": [{"urn": "urn:adsk.viewing:fs.file:dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6a29yZHluZS1zdGVwLXByZXZpZXctcHJvZC1lbWVhLzQ1Yzg0Y2RhLWE3YTItNDZmMi1iNjQ3LWY3ZGNiMmY4YThjMS1UZXN0XzEuc3RlcA/output/1/45c84cda-a7a2-46f2-b647-f7dcb2f8a8c1-Test_1.svf.png01_thumb_400x400.png", "guid": "e5fedc91-f2ed-4abc-a95c-e568203d6be3", "mime": "image/png", "role": "thumbnail", "type": "resource", "resolution": [400, 400]}, {"urn": "urn:adsk.viewing:fs.file:dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6a29yZHluZS1zdGVwLXByZXZpZXctcHJvZC1lbWVhLzQ1Yzg0Y2RhLWE3YTItNDZmMi1iNjQ3LWY3ZGNiMmY4YThjMS1UZXN0XzEuc3RlcA/output/1/45c84cda-a7a2-46f2-b647-f7dcb2f8a8c1-Test_1.svf.png01_thumb_200x200.png", "guid": "e4cf9c57-ee3e-4922-a949-626a94983589", "mime": "image/png", "role": "thumbnail", "type": "resource", "resolution": [200, 200]}, {"urn": "urn:adsk.viewing:fs.file:dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6a29yZHluZS1zdGVwLXByZXZpZXctcHJvZC1lbWVhLzQ1Yzg0Y2RhLWE3YTItNDZmMi1iNjQ3LWY3ZGNiMmY4YThjMS1UZXN0XzEuc3RlcA/output/1/45c84cda-a7a2-46f2-b647-f7dcb2f8a8c1-Test_1.svf.png01_thumb_100x100.png", "guid": "c3007745-7a07-48d1-be50-d775012200ea", "mime": "image/png", "role": "thumbnail", "type": "resource", "resolution": [100, 100]}, {"guid": "364cf50c-da28-48f7-ae91-72c346e79fcd", "mime": "application/autodesk-svf2", "role": "graphics", "type": "resource"}], "progress": "complete", "hasThumbnail": "true"}, {"urn": "urn:adsk.viewing:fs.file:dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6a29yZHluZS1zdGVwLXByZXZpZXctcHJvZC1lbWVhLzQ1Yzg0Y2RhLWE3YTItNDZmMi1iNjQ3LWY3ZGNiMmY4YThjMS1UZXN0XzEuc3RlcA/output/1/properties.db", "guid": "2070437d-4a0f-4cf5-9406-7d24157f7014", "mime": "application/autodesk-db", "role": "Autodesk.CloudPlatform.PropertyDatabase", "type": "resource", "status": "success"}], "progress": "complete", "outputType": "svf2", "properties": {"Component Tool Information": {"component_build_version": "Autodesk, Inc. Autodesk Translation Framework 15.9.0.0"}}, "hasThumbnail": "true"}], "hasThumbnail": "true"}	2026-04-06 16:03:20.523+00	2026-04-06 16:04:30.263+00	\N
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."profiles" ("user_id", "email", "full_name", "company", "created_at", "updated_at", "platform_role") FROM stdin;
640e1239-182c-4409-8f3c-c43fdef11271	speedzonefamily@gmail.com	Test	Test	2026-03-19 20:00:17.599468+00	2026-03-19 20:00:17.599468+00	\N
7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	lukasz.gorlowski@gmail.com	Lukasz	Test	2026-03-16 21:24:56.958767+00	2026-03-27 22:54:17.700939+00	platform_owner
48879a91-551e-4384-8b41-7825a5405f30	aurelia.strycharz@gmail.com	Jan	Nowak	2026-03-17 17:25:15.183916+00	2026-03-27 22:54:17.700939+00	\N
\.


--
-- Data for Name: provider_capabilities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."provider_capabilities" ("id", "provider_org_id", "process_family", "process_name", "material_family", "material_name", "machine_type", "certification", "min_quantity", "max_quantity", "lead_time_notes", "active", "created_at", "updated_at") FROM stdin;
5c5677f3-45b1-49ac-85fd-23852f31b5ba	460e3508-bcff-4d2e-87ff-6e234c3e53dd	cnc_machining	5-axis	aluminium	6060	Reders	QQ	1	100	quick turnaround times	t	2026-03-30 18:07:33.24039+00	2026-03-30 18:04:43.639+00
4398d0fe-df96-498b-821e-f437ce3734e1	460e3508-bcff-4d2e-87ff-6e234c3e53dd	3d_printing	SLA	PLA	Carbon	Formlabs	\N	1	100	\N	t	2026-04-05 06:51:23.053155+00	2026-04-05 06:51:23.262+00
\.


--
-- Data for Name: service_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."service_requests" ("id", "organization_id", "part_id", "requested_by_user_id", "request_type", "status", "notes", "created_at", "updated_at", "title", "priority", "due_date", "quantity", "target_process", "target_material", "manufacturing_type", "cad_output_type", "optimization_goal", "source_reference_type", "quote_model", "quoted_price_cents", "quoted_currency", "quoted_credit_amount", "quote_notes", "quoted_at", "approved_at", "rejected_at", "completed_at", "cancelled_at", "request_meta", "request_origin", "requested_item_name", "requested_item_reference", "linked_to_part_at") FROM stdin;
417a9510-217e-49e1-94eb-4cd68cdf2f00	f869fc5e-e48d-47ad-8723-80ed3cf21efb	d74ae3e8-e235-4dfd-9f4e-81afe55a1598	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	manufacture_part	submitted	Test request	2026-03-20 18:42:48.079558+00	2026-03-20 18:42:48.079558+00	Manufacture request - 1234	normal	\N	\N	\N	\N	prototype_3d_print	\N	\N	existing_part_files	none	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	vault	\N	\N	\N
c7f6ef00-8b36-4c6f-990a-7c5d6f6b7f4c	f869fc5e-e48d-47ad-8723-80ed3cf21efb	d74ae3e8-e235-4dfd-9f4e-81afe55a1598	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	manufacture_part	submitted	\N	2026-03-26 22:51:02.816632+00	2026-03-26 22:51:02.816632+00	Test	normal	2026-03-27	2	\N	\N	prototype_3d_print	\N	\N	existing_part_files	none	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"hasVaultAttachments": true, "hasUploadedAttachments": false, "uploadedAttachmentCount": 0}	vault	\N	\N	2026-03-26 22:51:02.816632+00
4dccbec5-6dfe-4a0c-8c0c-eb48ce78a5b9	f869fc5e-e48d-47ad-8723-80ed3cf21efb	66b28982-ef3a-477c-9f86-917bda93c572	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	manufacture_part	submitted	\N	2026-03-27 20:33:35.309525+00	2026-03-27 20:33:35.309525+00	jnbkm	normal	2026-04-03	2	\N	\N	prototype_3d_print	\N	\N	existing_part_files	none	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"hasVaultAttachments": false, "hasUploadedAttachments": false, "uploadedAttachmentCount": 0}	vault	\N	\N	2026-03-27 20:33:35.309525+00
0b9012a4-1559-4cc6-8e1a-29c6b5d75ac1	f869fc5e-e48d-47ad-8723-80ed3cf21efb	bc1d6086-2bc8-4f4a-b032-9e65d59ddf50	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	manufacture_part	submitted	\N	2026-03-27 21:11:12.677628+00	2026-03-27 21:11:12.677628+00	dnvkm	normal	2026-04-03	2	GVb	lmv	prototype_3d_print	\N	\N	existing_part_files	none	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"hasVaultAttachments": false, "hasUploadedAttachments": false, "uploadedAttachmentCount": 0}	vault	\N	\N	2026-03-27 21:11:12.677628+00
645607ff-5cb0-403b-bbab-ea183df3bf4a	f869fc5e-e48d-47ad-8723-80ed3cf21efb	bd23ff0e-4585-490a-bd21-cb80a0ba33ae	48879a91-551e-4384-8b41-7825a5405f30	manufacture_part	submitted	\N	2026-04-04 16:24:16.42678+00	2026-04-04 16:24:16.42678+00	Test 123456	high	2026-04-30	1	Carbon	Carbon	composite_manufacturing	\N	\N	existing_part_files	none	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"hasVaultAttachments": false, "hasUploadedAttachments": false, "uploadedAttachmentCount": 0}	vault	\N	\N	2026-04-04 16:24:16.42678+00
71fb8c81-80fa-4a35-9599-5aa79fc5edf0	f869fc5e-e48d-47ad-8723-80ed3cf21efb	bd23ff0e-4585-490a-bd21-cb80a0ba33ae	48879a91-551e-4384-8b41-7825a5405f30	manufacture_part	submitted	\N	2026-04-04 16:35:31.022755+00	2026-04-04 16:35:31.022755+00	Test139	normal	2026-04-30	22	SLA	PLA	prototype_3d_print	\N	\N	existing_part_files	none	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"hasVaultAttachments": true, "hasUploadedAttachments": false, "uploadedAttachmentCount": 0}	vault	\N	\N	2026-04-04 16:35:31.022755+00
ff311af2-0466-4bca-961b-82c5b954b2af	f869fc5e-e48d-47ad-8723-80ed3cf21efb	d74ae3e8-e235-4dfd-9f4e-81afe55a1598	48879a91-551e-4384-8b41-7825a5405f30	manufacture_part	submitted	\N	2026-04-04 21:23:04.468942+00	2026-04-04 21:23:04.468942+00	Test 154	urgent	2026-04-30	2	SLA	Carbon	prototype_3d_print	\N	\N	existing_part_files	none	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"hasVaultAttachments": true, "hasUploadedAttachments": false, "uploadedAttachmentCount": 0}	vault	\N	\N	2026-04-04 21:23:04.468942+00
1d66a380-77d3-494e-8214-1ee9150f90a4	f869fc5e-e48d-47ad-8723-80ed3cf21efb	bd23ff0e-4585-490a-bd21-cb80a0ba33ae	48879a91-551e-4384-8b41-7825a5405f30	manufacture_part	submitted	\N	2026-04-05 08:03:06.78019+00	2026-04-05 08:03:06.78019+00	fsvsd	normal	2026-04-30	1	wcwercwe	efewwe	prototype_3d_print	\N	\N	existing_part_files	none	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"hasVaultAttachments": true, "hasUploadedAttachments": false, "uploadedAttachmentCount": 0}	vault	\N	\N	2026-04-05 08:03:06.78019+00
4e535a29-c235-4a67-a6a1-94209650dab3	f869fc5e-e48d-47ad-8723-80ed3cf21efb	bd23ff0e-4585-490a-bd21-cb80a0ba33ae	48879a91-551e-4384-8b41-7825a5405f30	manufacture_part	submitted	\N	2026-04-06 20:20:12.716153+00	2026-04-06 20:20:12.716153+00	knhcyfxty	normal	2026-04-30	1	cnc	aluminium	prototype_3d_print	\N	\N	existing_part_files	none	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"hasVaultAttachments": true, "hasUploadedAttachments": false, "uploadedAttachmentCount": 0}	vault	\N	\N	2026-04-06 20:20:12.716153+00
\.


--
-- Data for Name: provider_quote_rounds; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."provider_quote_rounds" ("id", "service_request_id", "customer_org_id", "round_number", "mode", "status", "response_deadline", "target_due_date", "requested_quantity", "currency_code", "customer_notes", "selected_provider_package_id", "created_by_user_id", "published_at", "awarded_at", "closed_at", "created_at", "updated_at") FROM stdin;
fe145d78-24cb-4ffc-901e-0ae600b45296	417a9510-217e-49e1-94eb-4cd68cdf2f00	f869fc5e-e48d-47ad-8723-80ed3cf21efb	1	competitive_quote	responses_open	2026-03-26 18:06:00+00	2026-03-12	1	EUR	Test request	\N	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	2026-03-27 15:09:33.496+00	\N	\N	2026-03-27 15:12:20.474157+00	2026-03-27 15:12:20.474157+00
894fe5c7-b2be-4835-bf53-3a16f97e4b37	c7f6ef00-8b36-4c6f-990a-7c5d6f6b7f4c	f869fc5e-e48d-47ad-8723-80ed3cf21efb	1	competitive_quote	published	2026-04-30 21:21:00+00	2026-05-12	2	EUR	\N	\N	48879a91-551e-4384-8b41-7825a5405f30	2026-04-04 16:18:25.83+00	\N	\N	2026-04-04 16:21:15.408913+00	2026-04-04 16:21:15.408913+00
72e95e1c-e777-4f68-a840-232168b32a4f	71fb8c81-80fa-4a35-9599-5aa79fc5edf0	f869fc5e-e48d-47ad-8723-80ed3cf21efb	1	competitive_quote	awarded	2026-04-17 17:32:00+00	2026-04-30	22	EUR	\N	00887a16-18a8-4f76-a9ef-29465095ccfb	48879a91-551e-4384-8b41-7825a5405f30	2026-04-04 16:33:07.396+00	2026-04-04 17:53:40.888+00	2026-04-04 17:53:40.888+00	2026-04-04 16:35:56.995713+00	2026-04-04 16:35:56.995713+00
eae6ec00-069f-4bc9-aeb2-52727b356ce9	ff311af2-0466-4bca-961b-82c5b954b2af	f869fc5e-e48d-47ad-8723-80ed3cf21efb	1	competitive_quote	awarded	2026-04-07 22:23:00+00	2026-04-30	2	EUR	\N	b1857fff-b759-4d25-922c-0fb9820ad537	48879a91-551e-4384-8b41-7825a5405f30	2026-04-04 21:23:55.623+00	2026-04-05 07:21:39.409+00	2026-04-05 07:21:39.409+00	2026-04-04 21:23:55.696459+00	2026-04-04 21:23:55.696459+00
4b801b3a-7987-4529-98df-5ab5f1cebe84	1d66a380-77d3-494e-8214-1ee9150f90a4	f869fc5e-e48d-47ad-8723-80ed3cf21efb	1	competitive_quote	published	2026-04-22 09:00:00+00	2026-04-30	1	EUR	\N	\N	48879a91-551e-4384-8b41-7825a5405f30	2026-04-05 08:00:40.935+00	\N	\N	2026-04-05 08:03:30.823953+00	2026-04-05 08:03:30.823953+00
d8a68a6e-0b15-403a-ba27-efd6b494bbec	4e535a29-c235-4a67-a6a1-94209650dab3	f869fc5e-e48d-47ad-8723-80ed3cf21efb	1	competitive_quote	published	2026-04-14 21:17:00+00	2026-04-30	1	EUR	\N	\N	48879a91-551e-4384-8b41-7825a5405f30	2026-04-06 20:18:05.579+00	\N	\N	2026-04-06 20:20:56.878288+00	2026-04-06 20:20:56.878288+00
\.


--
-- Data for Name: provider_relationships; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."provider_relationships" ("id", "customer_org_id", "provider_org_id", "relationship_status", "trust_status", "is_preferred", "nda_required", "quality_review_required", "commercial_terms_summary", "internal_notes", "provider_code", "created_by_user_id", "created_at", "updated_at") FROM stdin;
122e3a76-3ac5-44eb-9cee-68050b407c27	f869fc5e-e48d-47ad-8723-80ed3cf21efb	460e3508-bcff-4d2e-87ff-6e234c3e53dd	active	approved	t	f	f	Test provider relationship	Created for provider-side workflow testing	TP-001	640e1239-182c-4409-8f3c-c43fdef11271	2026-03-26 20:13:57.430879+00	2026-03-26 22:52:58.089613+00
\.


--
-- Data for Name: provider_request_packages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."provider_request_packages" ("id", "provider_quote_round_id", "service_request_id", "customer_org_id", "provider_org_id", "provider_relationship_id", "package_status", "package_title", "shared_summary", "process_requirements", "target_due_date", "requested_quantity", "response_deadline", "published_at", "viewed_at", "provider_responded_at", "awarded_at", "customer_visible_status", "created_by_user_id", "created_at", "updated_at") FROM stdin;
2caf9fb8-9878-438c-98d1-c1fbe66ce944	fe145d78-24cb-4ffc-901e-0ae600b45296	417a9510-217e-49e1-94eb-4cd68cdf2f00	f869fc5e-e48d-47ad-8723-80ed3cf21efb	460e3508-bcff-4d2e-87ff-6e234c3e53dd	122e3a76-3ac5-44eb-9cee-68050b407c27	quote_submitted	Manufacture request - 1234 — Round 1	Test request	{}	2026-03-12	1	2026-03-26 18:06:00+00	2026-03-27 15:09:33.496+00	2026-03-27 15:16:06.353+00	2026-03-27 16:20:48.866+00	\N	Quote submitted	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	2026-03-27 15:12:20.666584+00	2026-03-27 15:12:20.666584+00
135b9cde-bf19-4253-8290-70899f86a4fb	894fe5c7-b2be-4835-bf53-3a16f97e4b37	c7f6ef00-8b36-4c6f-990a-7c5d6f6b7f4c	f869fc5e-e48d-47ad-8723-80ed3cf21efb	460e3508-bcff-4d2e-87ff-6e234c3e53dd	122e3a76-3ac5-44eb-9cee-68050b407c27	published	Test — Round 1	\N	{}	2026-05-12	2	2026-04-30 21:21:00+00	2026-04-04 16:18:25.83+00	\N	\N	\N	Quote requested	48879a91-551e-4384-8b41-7825a5405f30	2026-04-04 16:21:15.661623+00	2026-04-04 16:21:15.661623+00
00887a16-18a8-4f76-a9ef-29465095ccfb	72e95e1c-e777-4f68-a840-232168b32a4f	71fb8c81-80fa-4a35-9599-5aa79fc5edf0	f869fc5e-e48d-47ad-8723-80ed3cf21efb	460e3508-bcff-4d2e-87ff-6e234c3e53dd	122e3a76-3ac5-44eb-9cee-68050b407c27	awarded	Test139 — Round 1	\N	{}	2026-04-30	22	2026-04-17 17:32:00+00	2026-04-04 16:33:07.396+00	\N	\N	2026-04-04 17:53:40.888+00	Awarded	48879a91-551e-4384-8b41-7825a5405f30	2026-04-04 16:35:57.212846+00	2026-04-04 16:35:57.212846+00
b1857fff-b759-4d25-922c-0fb9820ad537	eae6ec00-069f-4bc9-aeb2-52727b356ce9	ff311af2-0466-4bca-961b-82c5b954b2af	f869fc5e-e48d-47ad-8723-80ed3cf21efb	460e3508-bcff-4d2e-87ff-6e234c3e53dd	122e3a76-3ac5-44eb-9cee-68050b407c27	awarded	Test 154 — Round 1	\N	{}	2026-04-30	2	2026-04-07 22:23:00+00	2026-04-04 21:23:55.623+00	\N	\N	2026-04-05 07:21:39.409+00	Awarded	48879a91-551e-4384-8b41-7825a5405f30	2026-04-04 21:23:55.977631+00	2026-04-04 21:23:55.977631+00
a961f782-53ca-45de-a462-b7395ce00b04	4b801b3a-7987-4529-98df-5ab5f1cebe84	1d66a380-77d3-494e-8214-1ee9150f90a4	f869fc5e-e48d-47ad-8723-80ed3cf21efb	460e3508-bcff-4d2e-87ff-6e234c3e53dd	122e3a76-3ac5-44eb-9cee-68050b407c27	published	fsvsd — Round 1	\N	{}	2026-04-30	1	2026-04-22 09:00:00+00	2026-04-05 08:00:40.935+00	\N	\N	\N	Quote requested	48879a91-551e-4384-8b41-7825a5405f30	2026-04-05 08:03:30.9502+00	2026-04-05 08:03:30.9502+00
441e520d-9026-48a9-9fe8-dc0d348d31bf	d8a68a6e-0b15-403a-ba27-efd6b494bbec	4e535a29-c235-4a67-a6a1-94209650dab3	f869fc5e-e48d-47ad-8723-80ed3cf21efb	460e3508-bcff-4d2e-87ff-6e234c3e53dd	122e3a76-3ac5-44eb-9cee-68050b407c27	published	knhcyfxty — Round 1	\N	{}	2026-04-30	1	2026-04-14 21:17:00+00	2026-04-06 20:18:05.579+00	\N	\N	\N	Quote requested	48879a91-551e-4384-8b41-7825a5405f30	2026-04-06 20:20:57.01012+00	2026-04-06 20:20:57.01012+00
\.


--
-- Data for Name: provider_quotes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."provider_quotes" ("id", "provider_request_package_id", "provider_org_id", "quote_version", "status", "currency_code", "setup_price", "unit_price", "total_price", "shipping_price", "estimated_lead_time_days", "earliest_start_date", "estimated_completion_date", "quote_valid_until", "notes", "exceptions", "submitted_by_user_id", "submitted_at", "created_at", "updated_at", "quote_reference", "issued_at", "pdf_storage_path", "pdf_generated_at") FROM stdin;
3911af6e-6064-436a-95ce-0e0d7b824f61	2caf9fb8-9878-438c-98d1-c1fbe66ce944	460e3508-bcff-4d2e-87ff-6e234c3e53dd	1	submitted	EUR	100.00	200.00	500.00	50.00	20	2026-03-27	2026-04-01	2026-04-01	test	tes	640e1239-182c-4409-8f3c-c43fdef11271	2026-03-27 16:20:48.866+00	2026-03-27 16:23:35.920085+00	2026-03-27 16:23:35.920085+00	KQ-20260327-C68E1C	2026-03-27 16:20:48.866+00	\N	\N
31fd428d-bd0c-4294-bfe7-5de7e7b805a0	00887a16-18a8-4f76-a9ef-29465095ccfb	460e3508-bcff-4d2e-87ff-6e234c3e53dd	1	submitted	EUR	100.00	20.00	600.00	40.00	10	2026-04-15	2026-04-23	2026-04-16	\N	\N	640e1239-182c-4409-8f3c-c43fdef11271	2026-04-04 16:56:17.105+00	2026-04-04 16:59:06.801448+00	2026-04-04 16:59:06.801448+00	KQ-20260404-3Y73	2026-04-04 16:56:17.105+00	\N	\N
523736c1-3ec7-414a-9ed3-5bfe98d98cda	b1857fff-b759-4d25-922c-0fb9820ad537	460e3508-bcff-4d2e-87ff-6e234c3e53dd	1	submitted	EUR	100.00	50.00	200.00	50.00	8	2026-04-16	2026-04-23	2026-04-30	\N	\N	640e1239-182c-4409-8f3c-c43fdef11271	2026-04-04 21:26:29.759+00	2026-04-04 21:26:29.913786+00	2026-04-04 21:26:29.913786+00	KQ-20260404-VSXN	2026-04-04 21:26:29.759+00	\N	\N
d59008f9-594e-47bb-93a3-2449e712a2d4	a961f782-53ca-45de-a462-b7395ce00b04	460e3508-bcff-4d2e-87ff-6e234c3e53dd	1	submitted	EUR	100.00	1.00	120.00	20.00	6	2026-04-16	2026-04-18	2026-04-22	\N	\N	640e1239-182c-4409-8f3c-c43fdef11271	2026-04-05 08:03:34.819+00	2026-04-05 08:06:24.850942+00	2026-04-05 08:06:24.850942+00	KQ-20260405-8KPW	2026-04-05 08:03:34.819+00	\N	\N
\.


--
-- Data for Name: provider_invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."provider_invoices" ("id", "provider_request_package_id", "provider_quote_id", "provider_org_id", "customer_org_id", "invoice_source", "invoice_number", "status", "currency_code", "subtotal_amount", "tax_amount", "total_amount", "issued_at", "due_date", "paid_at", "notes", "uploaded_file_path", "uploaded_file_name", "uploaded_file_type", "snapshot_json", "finalized_at", "created_by_user_id", "created_at", "updated_at", "received_at", "approved_at", "payment_reference", "ap_notes", "received_by_user_id", "approved_by_user_id", "paid_recorded_by_user_id") FROM stdin;
de070532-8020-409d-936c-4bae39df4d5d	00887a16-18a8-4f76-a9ef-29465095ccfb	31fd428d-bd0c-4294-bfe7-5de7e7b805a0	460e3508-bcff-4d2e-87ff-6e234c3e53dd	f869fc5e-e48d-47ad-8723-80ed3cf21efb	kordyne_generated	INV-00887A16-1	sent	EUR	600.00	0.00	600.00	2026-04-05 06:53:42.942+00	\N	\N	\N	\N	\N	\N	{"quote": {"id": "31fd428d-bd0c-4294-bfe7-5de7e7b805a0", "status": "submitted", "totalPrice": 600, "submittedAt": "2026-04-04T16:56:17.105+00:00", "currencyCode": "EUR", "quoteVersion": 1, "quoteReference": "KQ-20260404-3Y73"}, "invoice": {"id": "de070532-8020-409d-936c-4bae39df4d5d", "notes": null, "paidAt": null, "status": "issued", "dueDate": null, "issuedAt": "2026-04-04T23:00:00+00:00", "taxAmount": 0, "totalAmount": 600, "currencyCode": "EUR", "invoiceNumber": "INV-00887A16-1", "invoiceSource": "kordyne_generated", "subtotalAmount": 600, "uploadedFileName": null, "uploadedFilePath": null, "uploadedFileType": null}, "package": {"id": "00887a16-18a8-4f76-a9ef-29465095ccfb", "title": "Test139 — Round 1", "targetDueDate": "2026-04-30", "requestedQuantity": 22}, "request": {"id": null, "title": null, "targetProcess": null, "targetMaterial": null, "requestedItemName": null, "requestedItemReference": null}, "customer": {"name": "Customer", "organizationId": "f869fc5e-e48d-47ad-8723-80ed3cf21efb"}, "provider": {"city": "Cork", "region": null, "country": "Ireland", "website": "test.com", "logoPath": null, "legalName": null, "vatNumber": null, "postalCode": null, "contactName": null, "displayName": "Kordyne Test Provider", "tradingName": null, "addressLine1": null, "addressLine2": null, "contactEmail": null, "contactPhone": null, "companyNumber": null, "organizationId": "460e3508-bcff-4d2e-87ff-6e234c3e53dd", "shortDescription": "Test"}}	2026-04-05 06:53:37.125+00	640e1239-182c-4409-8f3c-c43fdef11271	2026-04-05 06:52:43.402476+00	2026-04-05 06:53:42.942+00	\N	\N	\N	\N	\N	\N	\N
3041891d-febc-4604-a43f-e1ed15f4e285	b1857fff-b759-4d25-922c-0fb9820ad537	523736c1-3ec7-414a-9ed3-5bfe98d98cda	460e3508-bcff-4d2e-87ff-6e234c3e53dd	f869fc5e-e48d-47ad-8723-80ed3cf21efb	kordyne_generated	INV-B1857FFF-1	sent	EUR	200.00	0.00	200.00	2026-04-05 07:49:37.577+00	2026-04-23	\N	\N	\N	\N	\N	{"quote": {"id": "523736c1-3ec7-414a-9ed3-5bfe98d98cda", "status": "submitted", "totalPrice": 200, "submittedAt": "2026-04-04T21:26:29.759+00:00", "currencyCode": "EUR", "quoteVersion": 1, "quoteReference": "KQ-20260404-VSXN"}, "invoice": {"notes": null, "dueDate": "2026-04-23", "issuedAt": "2026-04-04T23:00:00.000Z", "taxAmount": 0, "invoiceKind": "final", "totalAmount": 200, "currencyCode": "EUR", "invoiceNumber": "INV-B1857FFF-1", "invoiceSource": "kordyne_generated", "subtotalAmount": 200, "uploadedFileName": null, "uploadedFilePath": null, "uploadedFileType": null}, "purchaseOrderSummary": {"fullPoAmount": 200, "currentInvoiceAmount": 200, "alreadyInvoicedAmount": 0, "remainingAfterInvoice": 0, "remainingBeforeInvoice": 200}}	2026-04-05 07:48:45.541+00	640e1239-182c-4409-8f3c-c43fdef11271	2026-04-05 07:51:35.443472+00	2026-04-05 07:49:37.577+00	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: provider_work_centers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."provider_work_centers" ("id", "provider_org_id", "name", "code", "center_type", "description", "location_label", "active", "created_by_user_id", "created_at", "updated_at") FROM stdin;
a603e96c-2e6d-456d-8316-198150d1c28f	460e3508-bcff-4d2e-87ff-6e234c3e53dd	TEST	TEST	work_cell	3D printing room	Test	t	640e1239-182c-4409-8f3c-c43fdef11271	2026-04-07 20:47:48.854663+00	2026-04-07 20:47:48.854663+00
\.


--
-- Data for Name: provider_job_bookings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."provider_job_bookings" ("id", "provider_org_id", "customer_org_id", "provider_work_center_id", "provider_capability_id", "provider_request_package_id", "provider_quote_id", "service_request_id", "booking_status", "title", "job_reference", "notes", "starts_at", "ends_at", "estimated_hours", "setup_hours", "run_hours", "requested_quantity", "priority", "created_by_user_id", "created_at", "updated_at") FROM stdin;
f00fb035-86bb-4a99-b999-45fdca11c9d9	460e3508-bcff-4d2e-87ff-6e234c3e53dd	f869fc5e-e48d-47ad-8723-80ed3cf21efb	a603e96c-2e6d-456d-8316-198150d1c28f	4398d0fe-df96-498b-821e-f437ce3734e1	00887a16-18a8-4f76-a9ef-29465095ccfb	31fd428d-bd0c-4294-bfe7-5de7e7b805a0	71fb8c81-80fa-4a35-9599-5aa79fc5edf0	scheduled	Test139 — Round 1	\N	Suggested plan:\n- Suggested lane uses the nearest available mapped capability.\n- Earliest visible slot starts 2026-04-14.\n- Suggested finish may exceed the due date.	2026-04-13 23:00:00+00	2026-04-24 22:59:59+00	\N	\N	\N	22	high	640e1239-182c-4409-8f3c-c43fdef11271	2026-04-09 20:31:02.309958+00	2026-04-09 20:31:02.309958+00
cc4b57d9-3504-4dfc-a951-52f4abfa2f5b	460e3508-bcff-4d2e-87ff-6e234c3e53dd	f869fc5e-e48d-47ad-8723-80ed3cf21efb	a603e96c-2e6d-456d-8316-198150d1c28f	4398d0fe-df96-498b-821e-f437ce3734e1	b1857fff-b759-4d25-922c-0fb9820ad537	523736c1-3ec7-414a-9ed3-5bfe98d98cda	ff311af2-0466-4bca-961b-82c5b954b2af	scheduled	Test 154 — Round 1	\N	\N	2026-04-05 23:00:00+00	2026-04-14 22:59:59+00	\N	\N	\N	2	normal	640e1239-182c-4409-8f3c-c43fdef11271	2026-04-07 20:49:44.714046+00	2026-04-09 20:31:22.628298+00
\.


--
-- Data for Name: provider_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."provider_messages" ("id", "provider_request_package_id", "sender_org_id", "sender_user_id", "message_type", "message_body", "is_system", "created_at") FROM stdin;
5127966b-6fd9-4e2c-9438-1da7196645a1	2caf9fb8-9878-438c-98d1-c1fbe66ce944	f869fc5e-e48d-47ad-8723-80ed3cf21efb	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	system_event	A new quote request package has been published.	t	2026-03-27 15:12:20.913037+00
cbe549f7-21da-46e4-bed5-821fce9d5fea	2caf9fb8-9878-438c-98d1-c1fbe66ce944	460e3508-bcff-4d2e-87ff-6e234c3e53dd	640e1239-182c-4409-8f3c-c43fdef11271	system_event	Provider submitted quote KQ-20260327-C68E1C v1.	t	2026-03-27 16:23:36.323636+00
e11f47a0-3364-485d-b6f6-57b92853f0f1	135b9cde-bf19-4253-8290-70899f86a4fb	f869fc5e-e48d-47ad-8723-80ed3cf21efb	48879a91-551e-4384-8b41-7825a5405f30	system_event	A new quote request package has been published.	t	2026-04-04 16:21:15.868505+00
0cc5b5b7-94fe-49fe-a66e-a214e7278e6b	00887a16-18a8-4f76-a9ef-29465095ccfb	f869fc5e-e48d-47ad-8723-80ed3cf21efb	48879a91-551e-4384-8b41-7825a5405f30	system_event	A new quote request package has been published.	t	2026-04-04 16:35:57.467189+00
7727ef97-c290-420b-a9b0-62c51a39311b	00887a16-18a8-4f76-a9ef-29465095ccfb	460e3508-bcff-4d2e-87ff-6e234c3e53dd	640e1239-182c-4409-8f3c-c43fdef11271	system_event	Provider submitted quote KQ-20260404-3Y73 v1.	t	2026-04-04 16:59:07.22721+00
898aa6ce-55b9-4a1a-925e-f5bef5803c97	00887a16-18a8-4f76-a9ef-29465095ccfb	f869fc5e-e48d-47ad-8723-80ed3cf21efb	48879a91-551e-4384-8b41-7825a5405f30	system_event	Customer awarded this provider package.	t	2026-04-04 17:56:30.968034+00
130ea4b1-f88e-4f61-9b36-a2881a6c7ad5	b1857fff-b759-4d25-922c-0fb9820ad537	f869fc5e-e48d-47ad-8723-80ed3cf21efb	48879a91-551e-4384-8b41-7825a5405f30	system_event	A new quote request package has been published.	t	2026-04-04 21:23:56.417296+00
c93503c3-88dd-48a3-b4f6-8037310b61aa	b1857fff-b759-4d25-922c-0fb9820ad537	460e3508-bcff-4d2e-87ff-6e234c3e53dd	640e1239-182c-4409-8f3c-c43fdef11271	system_event	Provider submitted quote KQ-20260404-VSXN v1.	t	2026-04-04 21:26:30.65371+00
bb4be2fd-d490-4a1b-8af5-32db238d0373	b1857fff-b759-4d25-922c-0fb9820ad537	f869fc5e-e48d-47ad-8723-80ed3cf21efb	48879a91-551e-4384-8b41-7825a5405f30	system_event	Customer awarded this provider package.	t	2026-04-05 07:24:29.97115+00
a15b635e-2005-414c-a56e-d44a0e8edece	a961f782-53ca-45de-a462-b7395ce00b04	f869fc5e-e48d-47ad-8723-80ed3cf21efb	48879a91-551e-4384-8b41-7825a5405f30	system_event	A new quote request package has been published.	t	2026-04-05 08:03:31.151+00
854b5b3c-c94c-4ade-9ca6-62ee949d5103	a961f782-53ca-45de-a462-b7395ce00b04	460e3508-bcff-4d2e-87ff-6e234c3e53dd	640e1239-182c-4409-8f3c-c43fdef11271	system_event	Provider submitted quote KQ-20260405-8KPW v1.	t	2026-04-05 08:06:25.510591+00
ed80e62e-d6da-4989-ae27-31114b4986cd	441e520d-9026-48a9-9fe8-dc0d348d31bf	f869fc5e-e48d-47ad-8723-80ed3cf21efb	48879a91-551e-4384-8b41-7825a5405f30	system_event	A new quote request package has been published.	t	2026-04-06 20:20:57.169915+00
\.


--
-- Data for Name: service_request_uploaded_files; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."service_request_uploaded_files" ("id", "service_request_id", "uploaded_by_user_id", "file_name", "file_type", "file_size_bytes", "asset_category", "storage_path", "created_at", "promoted_to_part_file_id", "promoted_at") FROM stdin;
\.


--
-- Data for Name: provider_package_files; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."provider_package_files" ("id", "provider_request_package_id", "source_type", "source_part_file_id", "source_service_request_uploaded_file_id", "uploaded_by_org_id", "uploaded_by_user_id", "file_name", "file_type", "file_size_bytes", "asset_category", "storage_path", "provider_uploaded", "shared_at", "created_at", "aps_object_key", "aps_object_id", "aps_urn", "aps_translation_status", "aps_translation_progress", "aps_manifest_json", "aps_last_prepared_at", "aps_last_translated_at", "aps_last_error") FROM stdin;
6f8b7087-45eb-4609-850e-788f6f32ccb4	2caf9fb8-9878-438c-98d1-c1fbe66ce944	part_file	169af563-50f2-47de-8f2f-ce29064922c6	\N	f869fc5e-e48d-47ad-8723-80ed3cf21efb	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	Test.txt	txt	18	other	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3/d74ae3e8-e235-4dfd-9f4e-81afe55a1598/1773769558422-Test.txt	f	2026-03-27 15:12:20.747814+00	2026-03-27 15:12:20.747814+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
a03d6733-d4fa-4988-8abb-e93fd10ad990	135b9cde-bf19-4253-8290-70899f86a4fb	part_file	169af563-50f2-47de-8f2f-ce29064922c6	\N	f869fc5e-e48d-47ad-8723-80ed3cf21efb	48879a91-551e-4384-8b41-7825a5405f30	Test.txt	txt	18	other	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3/d74ae3e8-e235-4dfd-9f4e-81afe55a1598/1773769558422-Test.txt	f	2026-04-04 16:21:15.73376+00	2026-04-04 16:21:15.73376+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
c476f87e-7535-4043-b7d5-19b0e9e7f9c5	135b9cde-bf19-4253-8290-70899f86a4fb	part_file	ae433d59-7c7a-4ab8-8fe4-7abe47ab1f13	\N	f869fc5e-e48d-47ad-8723-80ed3cf21efb	48879a91-551e-4384-8b41-7825a5405f30	Test.txt	txt	0	other	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3/d74ae3e8-e235-4dfd-9f4e-81afe55a1598/1773769143671-Test.txt	f	2026-04-04 16:21:15.73376+00	2026-04-04 16:21:15.73376+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
98a31edd-14f9-47af-b401-71e8583c8c68	135b9cde-bf19-4253-8290-70899f86a4fb	part_file	ca6ec2c0-5f32-4fc5-98ce-4c65890837a9	\N	f869fc5e-e48d-47ad-8723-80ed3cf21efb	48879a91-551e-4384-8b41-7825a5405f30	Test.txt	txt	18	other	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3/d74ae3e8-e235-4dfd-9f4e-81afe55a1598/1773770353458-Test.txt	f	2026-04-04 16:21:15.73376+00	2026-04-04 16:21:15.73376+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
5f894760-14b1-4d59-ac57-2cfd6a6b1cc7	00887a16-18a8-4f76-a9ef-29465095ccfb	part_file	bd611935-8109-4dc8-809f-1f4a1fd69bb7	\N	f869fc5e-e48d-47ad-8723-80ed3cf21efb	48879a91-551e-4384-8b41-7825a5405f30	ZIPwhistle.stl	stl	815884	cad_3d	48879a91-551e-4384-8b41-7825a5405f30/bd23ff0e-4585-490a-bd21-cb80a0ba33ae/1775320282943-ZIPwhistle.stl	f	2026-04-04 16:35:57.319323+00	2026-04-04 16:35:57.319323+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
36cec9bd-a87f-4fd0-a8bf-7c9948ebe18e	b1857fff-b759-4d25-922c-0fb9820ad537	part_file	169af563-50f2-47de-8f2f-ce29064922c6	\N	f869fc5e-e48d-47ad-8723-80ed3cf21efb	48879a91-551e-4384-8b41-7825a5405f30	Test.txt	txt	18	other	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3/d74ae3e8-e235-4dfd-9f4e-81afe55a1598/1773769558422-Test.txt	f	2026-04-04 21:23:56.134485+00	2026-04-04 21:23:56.134485+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
6904e846-a6c3-4864-8415-1846b2818ade	b1857fff-b759-4d25-922c-0fb9820ad537	part_file	ae433d59-7c7a-4ab8-8fe4-7abe47ab1f13	\N	f869fc5e-e48d-47ad-8723-80ed3cf21efb	48879a91-551e-4384-8b41-7825a5405f30	Test.txt	txt	0	other	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3/d74ae3e8-e235-4dfd-9f4e-81afe55a1598/1773769143671-Test.txt	f	2026-04-04 21:23:56.134485+00	2026-04-04 21:23:56.134485+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
284a3c7d-a1bd-4dcb-87c0-37f59ad2d283	b1857fff-b759-4d25-922c-0fb9820ad537	part_file	ca6ec2c0-5f32-4fc5-98ce-4c65890837a9	\N	f869fc5e-e48d-47ad-8723-80ed3cf21efb	48879a91-551e-4384-8b41-7825a5405f30	Test.txt	txt	18	other	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3/d74ae3e8-e235-4dfd-9f4e-81afe55a1598/1773770353458-Test.txt	f	2026-04-04 21:23:56.134485+00	2026-04-04 21:23:56.134485+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
da4e2e03-c402-404f-a44e-9d6d83640e21	a961f782-53ca-45de-a462-b7395ce00b04	part_file	bd611935-8109-4dc8-809f-1f4a1fd69bb7	\N	f869fc5e-e48d-47ad-8723-80ed3cf21efb	48879a91-551e-4384-8b41-7825a5405f30	ZIPwhistle.stl	stl	815884	cad_3d	48879a91-551e-4384-8b41-7825a5405f30/bd23ff0e-4585-490a-bd21-cb80a0ba33ae/1775320282943-ZIPwhistle.stl	f	2026-04-05 08:03:31.023891+00	2026-04-05 08:03:31.023891+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
f6c63aad-3181-4ffe-9140-95866e854735	441e520d-9026-48a9-9fe8-dc0d348d31bf	part_file	16292aab-b5f1-45e3-a660-ec55e9a51365	\N	f869fc5e-e48d-47ad-8723-80ed3cf21efb	48879a91-551e-4384-8b41-7825a5405f30	Body1.stl	stl	1656647	cad_3d	48879a91-551e-4384-8b41-7825a5405f30/bd23ff0e-4585-490a-bd21-cb80a0ba33ae/1775486094923-Body1.stl	f	2026-04-06 20:20:57.066282+00	2026-04-06 20:20:57.066282+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
0f677979-e551-4f28-b029-347cc45e693f	441e520d-9026-48a9-9fe8-dc0d348d31bf	part_file	2632aee6-11bf-4fa8-97fd-c0d0c444fbea	\N	f869fc5e-e48d-47ad-8723-80ed3cf21efb	48879a91-551e-4384-8b41-7825a5405f30	Test.pdf	pdf	26895	drawing_2d	48879a91-551e-4384-8b41-7825a5405f30/bd23ff0e-4585-490a-bd21-cb80a0ba33ae/1775486224213-Test.pdf	f	2026-04-06 20:20:57.066282+00	2026-04-06 20:20:57.066282+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
ce06d3e0-626d-4a6a-a11c-003113a3c569	441e520d-9026-48a9-9fe8-dc0d348d31bf	part_file	bd611935-8109-4dc8-809f-1f4a1fd69bb7	\N	f869fc5e-e48d-47ad-8723-80ed3cf21efb	48879a91-551e-4384-8b41-7825a5405f30	ZIPwhistle.stl	stl	815884	cad_3d	48879a91-551e-4384-8b41-7825a5405f30/bd23ff0e-4585-490a-bd21-cb80a0ba33ae/1775320282943-ZIPwhistle.stl	f	2026-04-06 20:20:57.066282+00	2026-04-06 20:20:57.066282+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
68d56e46-8513-4dec-a6e2-dc502d8b933e	441e520d-9026-48a9-9fe8-dc0d348d31bf	part_file	45c84cda-a7a2-46f2-b647-f7dcb2f8a8c1	\N	f869fc5e-e48d-47ad-8723-80ed3cf21efb	48879a91-551e-4384-8b41-7825a5405f30	Test_1.step	step	33475	cad_3d	48879a91-551e-4384-8b41-7825a5405f30/bd23ff0e-4585-490a-bd21-cb80a0ba33ae/1775486106617-Test_1.step	f	2026-04-06 20:20:57.066282+00	2026-04-06 20:20:57.066282+00	68d56e46-8513-4dec-a6e2-dc502d8b933e-Test_1.step	urn:adsk.objects:os.object:kordyne-step-preview-prod-emea/68d56e46-8513-4dec-a6e2-dc502d8b933e-Test_1.step	dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6a29yZHluZS1zdGVwLXByZXZpZXctcHJvZC1lbWVhLzY4ZDU2ZTQ2LTg1MTMtNGRlYy1hNmUyLWRjNTAyZDhiOTMzZS1UZXN0XzEuc3RlcA	success	complete	{"urn": "dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6a29yZHluZS1zdGVwLXByZXZpZXctcHJvZC1lbWVhLzY4ZDU2ZTQ2LTg1MTMtNGRlYy1hNmUyLWRjNTAyZDhiOTMzZS1UZXN0XzEuc3RlcA", "type": "manifest", "region": "US", "status": "success", "version": "1.0", "progress": "complete", "derivatives": [{"name": "68d56e46-8513-4dec-a6e2-dc502d8b933e-Test_1.step", "status": "success", "children": [{"guid": "6051ee3c-acde-4870-8f6f-0456270de6f3", "name": "Scene", "role": "3d", "type": "geometry", "status": "success", "children": [{"urn": "urn:adsk.viewing:fs.file:dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6a29yZHluZS1zdGVwLXByZXZpZXctcHJvZC1lbWVhLzY4ZDU2ZTQ2LTg1MTMtNGRlYy1hNmUyLWRjNTAyZDhiOTMzZS1UZXN0XzEuc3RlcA/output/1/68d56e46-8513-4dec-a6e2-dc502d8b933e-Test_1.svf.png01_thumb_400x400.png", "guid": "789d70a7-1fc9-4178-920c-2acebf0caa02", "mime": "image/png", "role": "thumbnail", "type": "resource", "resolution": [400, 400]}, {"urn": "urn:adsk.viewing:fs.file:dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6a29yZHluZS1zdGVwLXByZXZpZXctcHJvZC1lbWVhLzY4ZDU2ZTQ2LTg1MTMtNGRlYy1hNmUyLWRjNTAyZDhiOTMzZS1UZXN0XzEuc3RlcA/output/1/68d56e46-8513-4dec-a6e2-dc502d8b933e-Test_1.svf.png01_thumb_200x200.png", "guid": "bd7bbafe-30b6-45f2-a6b6-9c4cc447d762", "mime": "image/png", "role": "thumbnail", "type": "resource", "resolution": [200, 200]}, {"urn": "urn:adsk.viewing:fs.file:dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6a29yZHluZS1zdGVwLXByZXZpZXctcHJvZC1lbWVhLzY4ZDU2ZTQ2LTg1MTMtNGRlYy1hNmUyLWRjNTAyZDhiOTMzZS1UZXN0XzEuc3RlcA/output/1/68d56e46-8513-4dec-a6e2-dc502d8b933e-Test_1.svf.png01_thumb_100x100.png", "guid": "46cd9dff-e6cc-430f-813f-01bb42840395", "mime": "image/png", "role": "thumbnail", "type": "resource", "resolution": [100, 100]}, {"guid": "9dff2427-7b10-43d7-8c4d-fae425f88112", "mime": "application/autodesk-svf2", "role": "graphics", "type": "resource"}], "progress": "complete", "hasThumbnail": "true"}, {"urn": "urn:adsk.viewing:fs.file:dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6a29yZHluZS1zdGVwLXByZXZpZXctcHJvZC1lbWVhLzY4ZDU2ZTQ2LTg1MTMtNGRlYy1hNmUyLWRjNTAyZDhiOTMzZS1UZXN0XzEuc3RlcA/output/1/properties.db", "guid": "e0dec24b-f4aa-4378-9a39-8200489d7a78", "mime": "application/autodesk-db", "role": "Autodesk.CloudPlatform.PropertyDatabase", "type": "resource", "status": "success"}, {"guid": "8fae3c30-a6f9-49d8-a70b-782784fb5dd4", "name": "Scene", "role": "3d", "type": "geometry", "status": "success", "children": [{"urn": "urn:adsk.viewing:fs.file:dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6a29yZHluZS1zdGVwLXByZXZpZXctcHJvZC1lbWVhLzY4ZDU2ZTQ2LTg1MTMtNGRlYy1hNmUyLWRjNTAyZDhiOTMzZS1UZXN0XzEuc3RlcA/output/1/68d56e46-8513-4dec-a6e2-dc502d8b933e-Test_1.svf.png01_thumb_400x400.png", "guid": "05eb9c0e-157f-4821-ab0f-fe5f60bdfe61", "mime": "image/png", "role": "thumbnail", "type": "resource", "resolution": [400, 400]}, {"urn": "urn:adsk.viewing:fs.file:dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6a29yZHluZS1zdGVwLXByZXZpZXctcHJvZC1lbWVhLzY4ZDU2ZTQ2LTg1MTMtNGRlYy1hNmUyLWRjNTAyZDhiOTMzZS1UZXN0XzEuc3RlcA/output/1/68d56e46-8513-4dec-a6e2-dc502d8b933e-Test_1.svf.png01_thumb_200x200.png", "guid": "41329b6b-d7d6-44ac-8864-db6ba9f67125", "mime": "image/png", "role": "thumbnail", "type": "resource", "resolution": [200, 200]}, {"urn": "urn:adsk.viewing:fs.file:dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6a29yZHluZS1zdGVwLXByZXZpZXctcHJvZC1lbWVhLzY4ZDU2ZTQ2LTg1MTMtNGRlYy1hNmUyLWRjNTAyZDhiOTMzZS1UZXN0XzEuc3RlcA/output/1/68d56e46-8513-4dec-a6e2-dc502d8b933e-Test_1.svf.png01_thumb_100x100.png", "guid": "05c8c197-4726-4b42-b34e-b02bc6ab7237", "mime": "image/png", "role": "thumbnail", "type": "resource", "resolution": [100, 100]}, {"guid": "62967082-38ec-46da-b28b-377d0b766bdc", "mime": "application/autodesk-svf2", "role": "graphics", "type": "resource"}], "progress": "complete", "hasThumbnail": "true"}, {"urn": "urn:adsk.viewing:fs.file:dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6a29yZHluZS1zdGVwLXByZXZpZXctcHJvZC1lbWVhLzY4ZDU2ZTQ2LTg1MTMtNGRlYy1hNmUyLWRjNTAyZDhiOTMzZS1UZXN0XzEuc3RlcA/output/1/properties.db", "guid": "66fa98c7-3745-437b-be9f-3205482dfb71", "mime": "application/autodesk-db", "role": "Autodesk.CloudPlatform.PropertyDatabase", "type": "resource", "status": "success"}], "progress": "complete", "outputType": "svf2", "properties": {"Component Tool Information": {"component_build_version": "Autodesk, Inc. Autodesk Translation Framework 15.9.0.0"}}, "hasThumbnail": "true"}], "hasThumbnail": "true"}	2026-04-06 20:19:23.814+00	2026-04-07 18:26:46.009+00	\N
\.


--
-- Data for Name: provider_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."provider_profiles" ("organization_id", "website", "phone", "country", "city", "logo_path", "short_description", "certifications", "industries_served", "capabilities_summary", "software_notes", "onboarding_completed_at", "created_at", "updated_at") FROM stdin;
460e3508-bcff-4d2e-87ff-6e234c3e53dd	test.com	+3558	Ireland	Cork	\N	Test	ISO 9001	medtech	Test	Solidworks	\N	2026-03-30 18:06:12.488064+00	2026-03-30 18:03:22.727+00
\.


--
-- Data for Name: provider_quote_snapshots; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."provider_quote_snapshots" ("id", "provider_quote_id", "provider_org_id", "customer_org_id", "service_request_id", "snapshot_json", "finalized_at", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: provider_request_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."provider_request_events" ("id", "provider_request_package_id", "actor_org_id", "actor_user_id", "event_type", "event_payload", "created_at") FROM stdin;
a9319701-b7a6-4fef-a51b-674a487c3842	2caf9fb8-9878-438c-98d1-c1fbe66ce944	f869fc5e-e48d-47ad-8723-80ed3cf21efb	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	provider_package_published	{"mode": "competitive_quote", "roundNumber": 1, "serviceRequestId": "417a9510-217e-49e1-94eb-4cd68cdf2f00"}	2026-03-27 15:12:20.849715+00
6fdcc677-2e9f-4b24-9a9a-309533653ccc	2caf9fb8-9878-438c-98d1-c1fbe66ce944	460e3508-bcff-4d2e-87ff-6e234c3e53dd	640e1239-182c-4409-8f3c-c43fdef11271	provider_quote_submitted	{"totalPrice": 500, "currencyCode": "EUR", "quoteVersion": 1, "quoteReference": "KQ-20260327-C68E1C", "estimatedLeadTimeDays": 20}	2026-03-27 16:23:36.232296+00
6854e8b4-faa2-4bc8-a17a-c683af48ddc8	135b9cde-bf19-4253-8290-70899f86a4fb	f869fc5e-e48d-47ad-8723-80ed3cf21efb	48879a91-551e-4384-8b41-7825a5405f30	provider_package_published	{"mode": "competitive_quote", "roundNumber": 1, "serviceRequestId": "c7f6ef00-8b36-4c6f-990a-7c5d6f6b7f4c"}	2026-04-04 16:21:15.807359+00
63a875b6-4380-426e-966e-54263e5277a2	00887a16-18a8-4f76-a9ef-29465095ccfb	f869fc5e-e48d-47ad-8723-80ed3cf21efb	48879a91-551e-4384-8b41-7825a5405f30	provider_package_published	{"mode": "competitive_quote", "roundNumber": 1, "serviceRequestId": "71fb8c81-80fa-4a35-9599-5aa79fc5edf0"}	2026-04-04 16:35:57.404366+00
419988b1-de62-4238-91a3-8f40baf98050	00887a16-18a8-4f76-a9ef-29465095ccfb	460e3508-bcff-4d2e-87ff-6e234c3e53dd	640e1239-182c-4409-8f3c-c43fdef11271	provider_quote_submitted	{"totalPrice": 600, "currencyCode": "EUR", "quoteVersion": 1, "quoteReference": "KQ-20260404-3Y73", "estimatedLeadTimeDays": 10}	2026-04-04 16:59:07.147947+00
8bb2d1f5-d69b-4bfb-9967-ad3303c5f2e9	00887a16-18a8-4f76-a9ef-29465095ccfb	f869fc5e-e48d-47ad-8723-80ed3cf21efb	48879a91-551e-4384-8b41-7825a5405f30	customer_awarded_provider	{"roundId": "72e95e1c-e777-4f68-a840-232168b32a4f", "serviceRequestId": "71fb8c81-80fa-4a35-9599-5aa79fc5edf0", "selectedPackageId": "00887a16-18a8-4f76-a9ef-29465095ccfb"}	2026-04-04 17:56:30.867404+00
1855dc56-d313-4023-8a88-049473ca2b10	b1857fff-b759-4d25-922c-0fb9820ad537	f869fc5e-e48d-47ad-8723-80ed3cf21efb	48879a91-551e-4384-8b41-7825a5405f30	provider_package_published	{"mode": "competitive_quote", "roundNumber": 1, "serviceRequestId": "ff311af2-0466-4bca-961b-82c5b954b2af"}	2026-04-04 21:23:56.278968+00
446f2980-5d03-49e7-9602-8a92ca051f49	b1857fff-b759-4d25-922c-0fb9820ad537	460e3508-bcff-4d2e-87ff-6e234c3e53dd	640e1239-182c-4409-8f3c-c43fdef11271	provider_quote_submitted	{"totalPrice": 200, "currencyCode": "EUR", "quoteVersion": 1, "quoteReference": "KQ-20260404-VSXN", "estimatedLeadTimeDays": 8}	2026-04-04 21:26:30.489432+00
9063600c-4f22-4679-86ff-8ae2835c25d8	b1857fff-b759-4d25-922c-0fb9820ad537	f869fc5e-e48d-47ad-8723-80ed3cf21efb	48879a91-551e-4384-8b41-7825a5405f30	customer_awarded_provider	{"roundId": "eae6ec00-069f-4bc9-aeb2-52727b356ce9", "serviceRequestId": "ff311af2-0466-4bca-961b-82c5b954b2af", "selectedPackageId": "b1857fff-b759-4d25-922c-0fb9820ad537"}	2026-04-05 07:24:29.847449+00
f05e02bd-9dd0-44ff-bc8b-eda1d03cf285	a961f782-53ca-45de-a462-b7395ce00b04	f869fc5e-e48d-47ad-8723-80ed3cf21efb	48879a91-551e-4384-8b41-7825a5405f30	provider_package_published	{"mode": "competitive_quote", "roundNumber": 1, "serviceRequestId": "1d66a380-77d3-494e-8214-1ee9150f90a4"}	2026-04-05 08:03:31.090585+00
41faaae1-beab-4c83-89b2-557c9c6ea9c7	a961f782-53ca-45de-a462-b7395ce00b04	460e3508-bcff-4d2e-87ff-6e234c3e53dd	640e1239-182c-4409-8f3c-c43fdef11271	provider_quote_submitted	{"totalPrice": 120, "currencyCode": "EUR", "quoteVersion": 1, "quoteReference": "KQ-20260405-8KPW", "estimatedLeadTimeDays": 6}	2026-04-05 08:06:25.384367+00
9ff8e889-f537-436b-9bed-40d61a5b2bc9	441e520d-9026-48a9-9fe8-dc0d348d31bf	f869fc5e-e48d-47ad-8723-80ed3cf21efb	48879a91-551e-4384-8b41-7825a5405f30	provider_package_published	{"mode": "competitive_quote", "roundNumber": 1, "serviceRequestId": "4e535a29-c235-4a67-a6a1-94209650dab3"}	2026-04-06 20:20:57.118857+00
\.


--
-- Data for Name: provider_schedule_blocks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."provider_schedule_blocks" ("id", "provider_org_id", "provider_work_center_id", "block_type", "title", "notes", "starts_at", "ends_at", "all_day", "created_by_user_id", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: provider_sites; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."provider_sites" ("id", "provider_org_id", "site_name", "country", "region", "city", "timezone", "is_primary", "active", "created_at") FROM stdin;
\.


--
-- Data for Name: provider_schedule_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."provider_schedule_entries" ("id", "provider_request_package_id", "provider_org_id", "provider_site_id", "machine_label", "workcell_label", "readiness_status", "schedule_visibility", "scheduled_start_at", "scheduled_end_at", "customer_shared_start_at", "customer_shared_end_at", "internal_notes", "created_by_user_id", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: provider_work_center_capabilities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."provider_work_center_capabilities" ("id", "provider_work_center_id", "provider_capability_id", "created_by_user_id", "created_at") FROM stdin;
3573ebbd-f3b2-44dc-b48b-711420611abf	a603e96c-2e6d-456d-8316-198150d1c28f	4398d0fe-df96-498b-821e-f437ce3734e1	640e1239-182c-4409-8f3c-c43fdef11271	2026-04-07 20:48:28.213983+00
73abb134-bc85-4386-b14a-45b77491f71c	a603e96c-2e6d-456d-8316-198150d1c28f	5c5677f3-45b1-49ac-85fd-23852f31b5ba	640e1239-182c-4409-8f3c-c43fdef11271	2026-04-07 20:48:32.534172+00
\.


--
-- Data for Name: service_request_files; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."service_request_files" ("id", "service_request_id", "part_file_id", "attached_by_user_id", "is_primary", "created_at") FROM stdin;
83b19cf2-7c8c-462f-b9d5-9655d6411806	c7f6ef00-8b36-4c6f-990a-7c5d6f6b7f4c	169af563-50f2-47de-8f2f-ce29064922c6	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	f	2026-03-26 22:51:02.816632+00
825d5125-ff8d-486b-9b7f-1123219a7f6c	c7f6ef00-8b36-4c6f-990a-7c5d6f6b7f4c	ca6ec2c0-5f32-4fc5-98ce-4c65890837a9	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	f	2026-03-26 22:51:02.816632+00
0e591bca-86e2-4a25-976f-ac1a98493427	71fb8c81-80fa-4a35-9599-5aa79fc5edf0	bd611935-8109-4dc8-809f-1f4a1fd69bb7	48879a91-551e-4384-8b41-7825a5405f30	f	2026-04-04 16:35:31.022755+00
214319b8-65b3-49ad-86fc-76f54b8b8ee7	ff311af2-0466-4bca-961b-82c5b954b2af	ca6ec2c0-5f32-4fc5-98ce-4c65890837a9	48879a91-551e-4384-8b41-7825a5405f30	f	2026-04-04 21:23:04.468942+00
16e8c0f0-c89c-4018-a967-a747645ee3c6	1d66a380-77d3-494e-8214-1ee9150f90a4	bd611935-8109-4dc8-809f-1f4a1fd69bb7	48879a91-551e-4384-8b41-7825a5405f30	f	2026-04-05 08:03:06.78019+00
7423df40-3186-40f0-b2be-cb1b3e92c1b3	4e535a29-c235-4a67-a6a1-94209650dab3	bd611935-8109-4dc8-809f-1f4a1fd69bb7	48879a91-551e-4384-8b41-7825a5405f30	f	2026-04-06 20:20:12.716153+00
4dae1911-e5bb-4482-a708-888f117ed0df	4e535a29-c235-4a67-a6a1-94209650dab3	16292aab-b5f1-45e3-a660-ec55e9a51365	48879a91-551e-4384-8b41-7825a5405f30	f	2026-04-06 20:20:12.716153+00
80fb69cf-4f4b-432f-9b41-98e4658d9861	4e535a29-c235-4a67-a6a1-94209650dab3	2632aee6-11bf-4fa8-97fd-c0d0c444fbea	48879a91-551e-4384-8b41-7825a5405f30	f	2026-04-06 20:20:12.716153+00
43d3cb34-3cfb-47ef-bf05-b7352334dd1a	4e535a29-c235-4a67-a6a1-94209650dab3	45c84cda-a7a2-46f2-b647-f7dcb2f8a8c1	48879a91-551e-4384-8b41-7825a5405f30	f	2026-04-06 20:20:12.716153+00
\.


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type") FROM stdin;
part-files	part-files	\N	2026-03-14 20:13:26.754611+00	2026-03-14 20:13:26.754611+00	f	f	\N	\N	\N	STANDARD
service-request-files	service-request-files	\N	2026-03-23 20:35:34.214105+00	2026-03-23 20:35:34.214105+00	f	f	\N	\N	\N	STANDARD
provider-invoices	provider-invoices	\N	2026-03-29 18:24:16.042327+00	2026-03-29 18:24:16.042327+00	f	f	10485760	{application/pdf}	\N	STANDARD
provider-assets	provider-assets	\N	2026-03-29 13:30:34.960448+00	2026-03-29 13:30:34.960448+00	f	f	5242880	{image/png,image/jpeg,image/webp,image/svg+xml}	\N	STANDARD
\.


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."buckets_analytics" ("name", "type", "format", "created_at", "updated_at", "id", "deleted_at") FROM stdin;
\.


--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."buckets_vectors" ("id", "type", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."objects" ("id", "bucket_id", "name", "owner", "created_at", "updated_at", "last_accessed_at", "metadata", "version", "owner_id", "user_metadata") FROM stdin;
4694e541-7c94-4873-ad08-7d7c5035c785	part-files	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3/d74ae3e8-e235-4dfd-9f4e-81afe55a1598/1773769143671-Test.txt	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	2026-03-17 17:41:46.665208+00	2026-03-17 17:41:46.665208+00	2026-03-17 17:41:46.665208+00	{"eTag": "\\"d41d8cd98f00b204e9800998ecf8427e\\"", "size": 0, "mimetype": "text/plain", "cacheControl": "max-age=3600", "lastModified": "2026-03-17T17:41:46.662Z", "contentLength": 0, "httpStatusCode": 200}	6d564447-d212-4213-aa68-78ec23e8f5de	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	{}
93fa3a18-bad5-4a2e-a7bc-faf6dd38c85a	part-files	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3/d74ae3e8-e235-4dfd-9f4e-81afe55a1598/1773769558422-Test.txt	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	2026-03-17 17:48:41.272881+00	2026-03-17 17:48:41.272881+00	2026-03-17 17:48:41.272881+00	{"eTag": "\\"111f5ae60b2554225e1a5e6dac34dbf0\\"", "size": 18, "mimetype": "text/plain", "cacheControl": "max-age=3600", "lastModified": "2026-03-17T17:48:42.000Z", "contentLength": 18, "httpStatusCode": 200}	43043fc1-2070-4d05-9886-533ca2638124	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	{}
ae695f6d-e5b3-4013-9c91-7ebc155aebc1	part-files	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3/d74ae3e8-e235-4dfd-9f4e-81afe55a1598/1773770353458-Test.txt	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	2026-03-17 18:01:56.235985+00	2026-03-17 18:01:56.235985+00	2026-03-17 18:01:56.235985+00	{"eTag": "\\"111f5ae60b2554225e1a5e6dac34dbf0\\"", "size": 18, "mimetype": "text/plain", "cacheControl": "max-age=3600", "lastModified": "2026-03-17T18:01:57.000Z", "contentLength": 18, "httpStatusCode": 200}	86edd455-58fa-40d0-a64f-a9089516ef14	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	{}
397f0c99-ea45-485f-845b-a22fa268c279	part-files	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3/a052c595-efb0-4699-ade7-98cc6b52b430/1774097855549-Test.txt	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	2026-03-21 13:00:19.588902+00	2026-03-21 13:00:19.588902+00	2026-03-21 13:00:19.588902+00	{"eTag": "\\"111f5ae60b2554225e1a5e6dac34dbf0\\"", "size": 18, "mimetype": "text/plain", "cacheControl": "max-age=3600", "lastModified": "2026-03-21T13:00:20.000Z", "contentLength": 18, "httpStatusCode": 200}	ca5f2baa-2e34-47cf-80d8-48f51150d26b	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	{}
4c412d42-6006-4cef-b500-5709f4622036	part-files	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3/a052c595-efb0-4699-ade7-98cc6b52b430/1774097855943-Test.txt	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	2026-03-21 13:00:19.920224+00	2026-03-21 13:00:19.920224+00	2026-03-21 13:00:19.920224+00	{"eTag": "\\"111f5ae60b2554225e1a5e6dac34dbf0\\"", "size": 18, "mimetype": "text/plain", "cacheControl": "max-age=3600", "lastModified": "2026-03-21T13:00:20.000Z", "contentLength": 18, "httpStatusCode": 200}	70db7c93-179a-4919-be10-2301ce7e0e8b	7992e2e4-d5ee-44f8-9f7c-7d00ba640fd3	{}
c86a4682-3588-46b8-a0a1-79321cd95c5b	part-files	48879a91-551e-4384-8b41-7825a5405f30/bd23ff0e-4585-490a-bd21-cb80a0ba33ae/1775320282943-ZIPwhistle.stl	48879a91-551e-4384-8b41-7825a5405f30	2026-04-04 16:34:12.950423+00	2026-04-04 16:34:12.950423+00	2026-04-04 16:34:12.950423+00	{"eTag": "\\"97dcfa3bc2138a27da535a67f1eaf95c\\"", "size": 815884, "mimetype": "application/sla", "cacheControl": "max-age=3600", "lastModified": "2026-04-04T16:34:13.000Z", "contentLength": 815884, "httpStatusCode": 200}	4271b04f-d5f0-4a9c-b93e-ed2818ca5878	48879a91-551e-4384-8b41-7825a5405f30	{}
c7c21fc4-da3b-4f96-b5ab-c3e62e8be87d	part-files	48879a91-551e-4384-8b41-7825a5405f30/bd23ff0e-4585-490a-bd21-cb80a0ba33ae/1775486094923-Body1.stl	48879a91-551e-4384-8b41-7825a5405f30	2026-04-06 14:37:46.185426+00	2026-04-06 14:37:46.185426+00	2026-04-06 14:37:46.185426+00	{"eTag": "\\"fb26fdb4017cba232be90de942b63d62\\"", "size": 1656647, "mimetype": "application/sla", "cacheControl": "max-age=3600", "lastModified": "2026-04-06T14:37:47.000Z", "contentLength": 1656647, "httpStatusCode": 200}	ab114de7-0539-49a6-82db-496a8ec9e6af	48879a91-551e-4384-8b41-7825a5405f30	{}
5becc282-c949-4fa7-a89b-9ba9cb1c9942	part-files	48879a91-551e-4384-8b41-7825a5405f30/bd23ff0e-4585-490a-bd21-cb80a0ba33ae/1775486106617-Test_1.step	48879a91-551e-4384-8b41-7825a5405f30	2026-04-06 14:37:58.002972+00	2026-04-06 14:37:58.002972+00	2026-04-06 14:37:58.002972+00	{"eTag": "\\"ece115a81f39449849e127edc5def009\\"", "size": 33475, "mimetype": "application/octet-stream", "cacheControl": "max-age=3600", "lastModified": "2026-04-06T14:37:58.000Z", "contentLength": 33475, "httpStatusCode": 200}	b9800775-aa08-4244-a19d-610df9ff5ccc	48879a91-551e-4384-8b41-7825a5405f30	{}
79c36425-68b4-4ef6-9dbd-dcbbfc90067f	part-files	48879a91-551e-4384-8b41-7825a5405f30/bd23ff0e-4585-490a-bd21-cb80a0ba33ae/1775486224213-Test.pdf	48879a91-551e-4384-8b41-7825a5405f30	2026-04-06 14:39:55.641943+00	2026-04-06 14:39:55.641943+00	2026-04-06 14:39:55.641943+00	{"eTag": "\\"94058d0e1e116f0c869e69b4eada091d\\"", "size": 26895, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-04-06T14:39:56.000Z", "contentLength": 26895, "httpStatusCode": 200}	613fee50-45c6-4a54-b752-99cc1c37a360	48879a91-551e-4384-8b41-7825a5405f30	{}
\.


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."s3_multipart_uploads" ("id", "in_progress_size", "upload_signature", "bucket_id", "key", "version", "owner_id", "created_at", "user_metadata", "metadata") FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."s3_multipart_uploads_parts" ("id", "upload_id", "size", "part_number", "bucket_id", "key", "etag", "owner_id", "version", "created_at") FROM stdin;
\.


--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."vector_indexes" ("id", "name", "bucket_id", "data_type", "dimension", "distance_metric", "metadata_configuration", "created_at", "updated_at") FROM stdin;
\.


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 129, true);


--
-- PostgreSQL database dump complete
--

-- \unrestrict 15L5Z7UOMeDDal4QuraSsC8ILgRZIfq4kxEDmPJ5fs43cmgJSUbW6trSQr6H6Hp

RESET ALL;
