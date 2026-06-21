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

const resendApiKey =
  process.env.RESEND_NOTIFICATIONS_API_KEY ||
  process.env.RESEND_API_KEY ||
  "";

const resend = resendApiKey ? new Resend(resendApiKey) : null;

const fromEmail =
  process.env.RESEND_NOTIFICATIONS_FROM_EMAIL ||
  process.env.RESEND_FROM_EMAIL ||
  "";

const replyTo =
  process.env.RESEND_NOTIFICATIONS_REPLY_TO ||
  process.env.RESEND_REPLY_TO ||
  undefined;

const appBaseUrl = (
  process.env.APP_BASE_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  ""
).replace(/\/+$/, "");

const logoUrl =
  process.env.KORDYNE_EMAIL_LOGO_URL ??
  "https://www.kordyne.com/kordyne-email-logo.jpg";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildWorkflowEmailText(input: WorkflowEmailInput) {
  const lines: string[] = [];

  if (input.eyebrow) {
    lines.push(input.eyebrow.toUpperCase(), "");
  }

  lines.push(input.headline, "", input.intro);

  if (input.detailRows?.length) {
    lines.push("", "Details:");
    input.detailRows.forEach((row) => {
      lines.push(`${row.label}: ${row.value}`);
    });
  }

  if (input.primaryActionLabel && input.primaryActionUrl) {
    lines.push("", `${input.primaryActionLabel}: ${input.primaryActionUrl}`);
  }

  if (input.secondaryActionLabel && input.secondaryActionUrl) {
    lines.push(`${input.secondaryActionLabel}: ${input.secondaryActionUrl}`);
  }

  lines.push(
    "",
    input.footerNote ??
      "This message was sent by Kordyne because this workflow event requires attention.",
  );

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function getEmailDomain(value: string) {
  return value.match(/@([^>\s]+)/)?.[1] ?? null;
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

  return [
    ...new Map(
      (profiles ?? [])
        .filter(
          (profile) =>
            typeof profile.email === "string" && profile.email.trim().length > 0,
        )
        .map((profile) => [
          profile.email.trim().toLowerCase(),
          {
            email: profile.email.trim(),
            fullName: profile.full_name ?? null,
          },
        ]),
    ).values(),
  ];
}

function buildWorkflowEmailHtml(input: WorkflowEmailInput) {
  const details = (input.detailRows ?? [])
    .map(
      (row) => `
        <tr>
          <td style="padding: 9px 0; color: #5f7485; font-size: 13px; vertical-align: top; width: 150px;">
            ${escapeHtml(row.label)}
          </td>
          <td style="padding: 9px 0; color: #0b2530; font-size: 14px; font-weight: 700;">
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
            background: #00bdde;
            color: #003040;
            text-decoration: none;
            padding: 12px 18px;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 800;
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
            color: #003040;
            text-decoration: none;
            padding: 12px 18px;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 800;
            border: 1px solid #b8d7df;
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
      <div style="font-size: 18px; font-weight: 800; color: #003040;">
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
      <body style="margin: 0; padding: 0; background: #eef9fb; font-family: Arial, Helvetica, sans-serif;">
        <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">
          ${escapeHtml(input.previewText ?? input.subject)}
        </div>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #eef9fb; padding: 32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 640px; background: #ffffff; border: 1px solid #c8e2e8; border-radius: 24px; overflow: hidden;">
                <tr>
                  <td style="padding: 28px 28px 18px 28px; border-bottom: 4px solid #00bdde;">
                    ${logoBlock}
                  </td>
                </tr>

                <tr>
                  <td style="padding: 28px;">
                    ${
                      input.eyebrow
                        ? `
                          <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.16em; color: #0086a0;">
                            ${escapeHtml(input.eyebrow)}
                          </div>
                        `
                        : ""
                    }

                    <h1 style="margin: 14px 0 0 0; font-size: 28px; line-height: 1.2; color: #003040;">
                      ${escapeHtml(input.headline)}
                    </h1>

                    <p style="margin: 16px 0 0 0; font-size: 15px; line-height: 1.75; color: #38546a;">
                      ${escapeHtml(input.intro)}
                    </p>

                    ${
                      details
                        ? `
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px; background: #f5fbfc; border: 1px solid #d5e9ee; border-radius: 18px; padding: 16px 18px;">
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

                    <div style="margin-top: 28px; font-size: 12px; line-height: 1.7; color: #5f7485;">
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

export function isSkippedWorkflowEmailResult(
  result: unknown,
): result is { skipped: true } {
  if (!result || typeof result !== "object") return false;

  return (
    "skipped" in result &&
    (result as { skipped?: unknown }).skipped === true
  );
}

export async function sendWorkflowEmail(input: WorkflowEmailInput) {
  console.log("[workflow-email] config", {
    usingNotificationsApiKey: Boolean(process.env.RESEND_NOTIFICATIONS_API_KEY),
    usingDefaultApiKey:
      !process.env.RESEND_NOTIFICATIONS_API_KEY &&
      Boolean(process.env.RESEND_API_KEY),
    fromDomain: getEmailDomain(fromEmail),
    hasReplyTo: Boolean(replyTo),
    hasLogoUrl: Boolean(logoUrl),
  });

  if (!resend || !fromEmail) {
    console.warn("[workflow-email] skipped: missing resend client or from email");
    return { skipped: true };
  }

  const uniqueRecipients = [
    ...new Set(
      input.to.map((value) => value.trim()).filter((value) => value.length > 0),
    ),
  ];

  if (!uniqueRecipients.length) {
    console.warn("[workflow-email] skipped: no recipients");
    return { skipped: true };
  }

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: uniqueRecipients,
    subject: input.subject,
    html: buildWorkflowEmailHtml(input),
    text: buildWorkflowEmailText(input),
    ...(replyTo ? { replyTo } : {}),
  });

  if (error) {
    console.error("[workflow-email] resend send failed", error);
    throw new Error(error.message);
  }

  console.log("[workflow-email] resend send success", data);

  return data;
}
