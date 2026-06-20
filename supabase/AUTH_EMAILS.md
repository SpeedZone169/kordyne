# Supabase Auth emails

Kordyne Auth emails are versioned in `supabase/templates`. The production
settings are documented in `supabase/auth-email-config.production.toml`.

Do not run `supabase config push` just to update email templates unless the full
`supabase/config.toml` has first been audited against production. That command
can update broader Auth settings such as site URL, redirect URLs, signup flags,
rate limits, and password policy.

## Templates covered

- Account confirmation
- Organization/Auth invite
- Magic link / OTP
- Email change confirmation
- Password recovery
- Reauthentication code

## Sender

Supabase Auth is configured to use Resend SMTP:

- Host: `smtp.resend.com`
- Port: `587`
- Username: `resend`
- Sender email: `noreply@kordyne.com`
- Sender name: `Kordyne`
- Password: `env(RESEND_API_KEY)`

Never commit the Resend API key. Set it in the shell before running
`supabase config push`.

## Safe production rollout

Preferred approach:

1. In Supabase Dashboard, open Authentication settings.
2. Configure SMTP using the values in `auth-email-config.production.toml`.
3. Configure each Auth email template by pasting the matching HTML from
   `supabase/templates`.
4. Keep existing production Auth settings unless intentionally changing them.
5. Send test emails before inviting external users.

CLI approach, only after auditing the full config:

```powershell
$env:RESEND_API_KEY = "<resend-api-key>"
npx.cmd supabase config push
```

After pushing, test:

- Forgot password email
- Invite/signup flow if enabled
- Magic link/OTP flow if enabled
- Email change flow

Check Gmail/Outlook rendering and spam placement before inviting external beta
users.
