import "server-only";

import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

type OrgNotificationRecipient = {
  email: string;
  fullName: string | null;
};

type WorkflowEmailInput = {
  to: string[];
  subject: string;
  previewText?: string;
  eyebrow?: string;
  headline: string;
  intro: string;
  detailRows?: Array<{
    label: string;
    value: string;
  }>;
  primaryActionLabel?: string;
  primaryActionUrl?: string;
  secondaryActionLabel?: string;
  secondaryActionUrl?: string;
  footerNote?: string;
};

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const fromEmail = process.env.RESEND_FROM_EMAIL ?? "";
const appBaseUrl = (
  process.env.APP_BASE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  ""
).replace(/\/+$/, "");

const logoUrl = process.env.KORDYNE_EMAIL_LOGO_URL ?? "";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function absoluteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  if (!appBaseUrl) return path;
  return `${appBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function getOrgNotificationRecipients(
  organizationId: string,
  roles: string[] = ["admin", "engineer"],
): Promise<OrgNotificationRecipient[]> {
  const admin = createAdminClient();

  const { data: memberships, error: membershipsError } = await admin
    .from("organization_members")
    .select("user_id, role")
    .eq("organization_id", organizationId)
    .in("role", roles);

  if (membershipsError) {
    throw new Error(membershipsError.message);
  }

  const userIds = [...new Set((memberships ?? []).map((row) => row.user_id))];

  if (!userIds.length) {
    return [];
  }

  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("user_id, full_name, email")
    .in("user_id", userIds);

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  return [...new Map(
    (profiles ?? [])
      .filter((profile) => typeof profile.email === "string" && profile.email.trim().length > 0)
      .map((profile) => [
        profile.email.trim().toLowerCase(),
        {
          email: profile.email.trim(),
          fullName: profile.full_name ?? null,
        },
      ]),
  ).values()];
}

function buildWorkflowEmailHtml(input: WorkflowEmailInput) {
  const details = (input.detailRows ?? [])
    .map(
      (row) => `
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 13px; vertical-align: top; width: 140px;">
            ${escapeHtml(row.label)}
          </td>
          <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 600;">
            ${escapeHtml(row.value)}
          </td>
        </tr>
      `,
    )
    .join("");

  const primaryAction =
    input.primaryActionLabel && input.primaryActionUrl
      ? `
        <a
          href="${escapeHtml(input.primaryActionUrl)}"
          style="
            display: inline-block;
            background: #020617;
            color: #ffffff;
            text-decoration: none;
            padding: 12px 18px;
            border-radius: 999px;
            font-size: 14px;
            font-weight: 600;
            margin-right: 10px;
          "
        >
          ${escapeHtml(input.primaryActionLabel)}
        </a>
      `
      : "";

  const secondaryAction =
    input.secondaryActionLabel && input.secondaryActionUrl
      ? `
        <a
          href="${escapeHtml(input.secondaryActionUrl)}"
          style="
            display: inline-block;
            background: #ffffff;
            color: #0f172a;
            text-decoration: none;
            padding: 12px 18px;
            border-radius: 999px;
            font-size: 14px;
            font-weight: 600;
            border: 1px solid #cbd5e1;
          "
        >
          ${escapeHtml(input.secondaryActionLabel)}
        </a>
      `
      : "";

  const logoBlock = logoUrl
    ? `
      <img
        src="${escapeHtml(logoUrl)}"
        alt="Kordyne"
        style="height: 28px; width: auto; display: block;"
      />
    `
    : `
      <div style="font-size: 14px; font-weight: 700; letter-spacing: 0.18em; color: #0f172a;">
        KORDYNE
      </div>
    `;

  return `
    <!doctype html>
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>${escapeHtml(input.subject)}</title>
      </head>
      <body style="margin: 0; padding: 0; background: #f1f5f9; font-family: Arial, Helvetica, sans-serif;">
        <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">
          ${escapeHtml(input.previewText ?? input.subject)}
        </div>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f1f5f9; padding: 32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 640px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 28px; overflow: hidden;">
                <tr>
                  <td style="padding: 28px 28px 18px 28px; border-bottom: 1px solid #e2e8f0;">
                    ${logoBlock}
                  </td>
                </tr>

                <tr>
                  <td style="padding: 28px;">
                    ${
                      input.eyebrow
                        ? `
                          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.22em; color: #64748b;">
                            ${escapeHtml(input.eyebrow)}
                          </div>
                        `
                        : ""
                    }

                    <h1 style="margin: 14px 0 0 0; font-size: 28px; line-height: 1.2; color: #020617;">
                      ${escapeHtml(input.headline)}
                    </h1>

                    <p style="margin: 16px 0 0 0; font-size: 15px; line-height: 1.75; color: #475569;">
                      ${escapeHtml(input.intro)}
                    </p>

                    ${
                      details
                        ? `
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 20px; padding: 16px 18px;">
                            ${details}
                          </table>
                        `
                        : ""
                    }

                    ${
                      primaryAction || secondaryAction
                        ? `
                          <div style="margin-top: 26px;">
                            ${primaryAction}
                            ${secondaryAction}
                          </div>
                        `
                        : ""
                    }

                    <div style="margin-top: 28px; font-size: 12px; line-height: 1.7; color: #64748b;">
                      ${escapeHtml(
                        input.footerNote ??
                          "This message was sent by Kordyne because this workflow event requires attention.",
                      )}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export async function sendWorkflowEmail(input: WorkflowEmailInput) {
  if (!resend || !fromEmail) {
    console.warn("Email skipped: RESEND_API_KEY or RESEND_FROM_EMAIL is not configured.");
    return { skipped: true };
  }

  const uniqueRecipients = [...new Set(
    input.to
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
  )];

  if (!uniqueRecipients.length) {
    return { skipped: true };
  }

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: uniqueRecipients,
    subject: input.subject,
    html: buildWorkflowEmailHtml(input),
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}