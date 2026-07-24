import { NextResponse } from "next/server";
import { Resend } from "resend";

import { getEmailLogoUrl } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTurnstile } from "@/lib/turnstile";

const resendApiKey =
  process.env.RESEND_NOTIFICATIONS_API_KEY ||
  process.env.RESEND_API_KEY ||
  "";

const resend = resendApiKey ? new Resend(resendApiKey) : null;

const PROVIDER_ACCESS_TO_EMAIL =
  process.env.PROVIDER_ACCESS_TO_EMAIL ||
  "contact@kordyne.com";

const PROVIDER_ACCESS_FROM_EMAIL =
  process.env.CONTACT_FROM_EMAIL ||
  process.env.RESEND_FROM_EMAIL ||
  "Kordyne <noreply@kordyne.com>";

const EMAIL_LOGO_URL = getEmailLogoUrl();

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 4;

const rateLimit = new Map<string, { count: number; resetAt: number }>();

type ProviderAccessBody = {
  fullName?: unknown;
  email?: unknown;
  company?: unknown;
  website?: unknown;
  country?: unknown;
  capabilities?: unknown;
  certifications?: unknown;
  message?: unknown;
  turnstileToken?: unknown;
};

function readString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeWebsite(value: string) {
  if (!value) return "";

  try {
    const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(value)
      ? value
      : `https://${value}`;
    const url = new URL(candidate);

    if (
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      !url.hostname ||
      url.username ||
      url.password
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function getClientIp(request: Request) {
  const cloudflareIp = request.headers.get("cf-connecting-ip");
  const forwardedFor = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();

  return cloudflareIp || forwardedFor || "unknown";
}

function getSiteUrl(request: Request) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    new URL(request.url).origin
  ).replace(/\/+$/, "");
}

function isRateLimited(ip: string) {
  const now = Date.now();
  const current = rateLimit.get(ip);

  if (!current || current.resetAt <= now) {
    rateLimit.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  current.count += 1;
  rateLimit.set(ip, current);
  return false;
}

function buildProviderAccessEmail({
  fullName,
  email,
  company,
  website,
  country,
  capabilities,
  certifications,
  message,
  reviewUrl,
}: {
  fullName: string;
  email: string;
  company: string;
  website: string;
  country: string;
  capabilities: string;
  certifications: string;
  message: string;
  reviewUrl: string;
}) {
  const rows = [
    ["Contact", fullName],
    ["Work email", email],
    ["Company", company],
    ["Website", website || "Not provided"],
    ["Country / region", country],
    ["Capabilities", capabilities],
    ["Certifications", certifications || "Not provided"],
  ]
    .map(
      ([label, value]) => `
        <tr>
          <td style="width: 145px; padding: 9px 0; color: #5f7485; font-size: 13px; vertical-align: top;">
            ${escapeHtml(label)}
          </td>
          <td style="padding: 9px 0; color: #0b2530; font-size: 14px; font-weight: 700;">
            ${escapeHtml(value)}
          </td>
        </tr>
      `,
    )
    .join("");

  return `
    <!doctype html>
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>New Kordyne provider access request</title>
      </head>
      <body style="margin: 0; padding: 0; background: #eef9fb; font-family: Arial, Helvetica, sans-serif;">
        <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">
          ${escapeHtml(company)} requested access to the Kordyne provider network.
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #eef9fb; padding: 32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 640px; overflow: hidden; border: 1px solid #c8e2e8; border-radius: 24px; background: #ffffff;">
                <tr>
                  <td style="padding: 28px 28px 18px; border-bottom: 4px solid #00bdde;">
                    <img src="${escapeHtml(EMAIL_LOGO_URL)}" alt="Kordyne" style="display: block; width: auto; height: 34px; border: 0;" />
                  </td>
                </tr>
                <tr>
                  <td style="padding: 28px;">
                    <div style="color: #0086a0; font-size: 11px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase;">
                      Provider access request
                    </div>
                    <h1 style="margin: 14px 0 0; color: #003040; font-size: 28px; line-height: 1.2;">
                      ${escapeHtml(company)} wants to join Kordyne
                    </h1>
                    <p style="margin: 12px 0 0; color: #38546a; font-size: 14px; line-height: 1.65;">
                      Review this company before creating a provider organization or sending a scoped invitation. No access has been granted automatically.
                    </p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px; padding: 16px 18px; border: 1px solid #d5e9ee; border-radius: 18px; background: #f5fbfc;">
                      ${rows}
                    </table>
                    <div style="margin-top: 24px;">
                      <div style="color: #003040; font-size: 13px; font-weight: 800;">What work they want to receive</div>
                      <div style="margin-top: 10px; color: #38546a; font-size: 15px; line-height: 1.75;">
                        ${escapeHtml(message).replaceAll("\n", "<br />")}
                      </div>
                    </div>
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top: 26px;">
                      <tr>
                        <td style="border-radius: 10px; background: #00bdde;">
                          <a
                            href="${escapeHtml(reviewUrl)}"
                            style="display: inline-block; padding: 13px 18px; color: #003040; font-size: 14px; font-weight: 800; text-decoration: none;"
                          >
                            Review &amp; invite provider
                          </a>
                        </td>
                      </tr>
                    </table>
                    <div style="margin-top: 14px; color: #5f7485; font-size: 11px; line-height: 1.6; overflow-wrap: anywhere;">
                      If the button does not open, use this secure review link:<br />
                      <a href="${escapeHtml(reviewUrl)}" style="color: #0086a0;">${escapeHtml(reviewUrl)}</a>
                    </div>
                    <div style="margin-top: 28px; color: #5f7485; font-size: 12px; line-height: 1.7;">
                      Opening the review page does not grant access. A provider invitation is sent only after an authenticated Kordyne owner approves this request.
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

export async function POST(request: Request) {
  try {
    if (isRateLimited(getClientIp(request))) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    const body = (await request
      .json()
      .catch(() => null)) as ProviderAccessBody | null;

    if (!body) {
      return NextResponse.json(
        { success: false, error: "Invalid request body." },
        { status: 400 },
      );
    }

    const fullName = readString(body.fullName, 120);
    const email = readString(body.email, 180).toLowerCase();
    const company = readString(body.company, 160);
    const websiteInput = readString(body.website, 240);
    const website = normalizeWebsite(websiteInput);
    const country = readString(body.country, 120);
    const capabilities = readString(body.capabilities, 500);
    const certifications = readString(body.certifications, 500);
    const message = readString(body.message, 3000);
    const turnstileToken = readString(body.turnstileToken, 2048);

    if (
      !fullName ||
      !email ||
      !company ||
      !country ||
      !capabilities ||
      !message
    ) {
      return NextResponse.json(
        { success: false, error: "Please complete all required fields." },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: "Enter a valid work email address." },
        { status: 400 },
      );
    }

    if (website === null) {
      return NextResponse.json(
        {
          success: false,
          error: "Enter a valid company website, such as company.com.",
        },
        { status: 400 },
      );
    }

    if (!turnstileToken) {
      return NextResponse.json(
        { success: false, error: "Security verification is required." },
        { status: 400 },
      );
    }

    const verification = await verifyTurnstile({
      request,
      token: turnstileToken,
      expectedAction: "provider_access",
    });

    if (!verification.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Security verification failed. Please try again.",
        },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data: accessRequest, error: requestInsertError } = await admin
      .from("provider_access_requests")
      .insert({
        full_name: fullName,
        email,
        company,
        website: website || null,
        country,
        capabilities,
        certifications: certifications || null,
        message,
        status: "pending",
      })
      .select("id")
      .single();

    if (requestInsertError || !accessRequest) {
      console.error("Provider access request storage failed", requestInsertError);
      return NextResponse.json(
        { success: false, error: "Unable to securely store your request." },
        { status: 500 },
      );
    }

    const reviewPath = `/review/provider-access/${accessRequest.id}`;
    const reviewUrl = `${getSiteUrl(request)}/login?portal=admin&next=${encodeURIComponent(reviewPath)}`;

    if (!resend) {
      console.error("Provider access email delivery is not configured");
      await admin
        .from("provider_access_requests")
        .update({
          notification_error: "Email delivery is not configured.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", accessRequest.id);

      return NextResponse.json({
        success: true,
        notificationSent: false,
      });
    }

    const result = await resend.emails.send({
      from: PROVIDER_ACCESS_FROM_EMAIL,
      to: PROVIDER_ACCESS_TO_EMAIL,
      replyTo: email,
      subject: `Kordyne provider access request: ${company}`,
      html: buildProviderAccessEmail({
        fullName,
        email,
        company,
        website,
        country,
        capabilities,
        certifications,
        message,
        reviewUrl,
      }),
      text: [
        "New Kordyne provider access request",
        "",
        "No account or provider access has been created automatically.",
        "",
        `Contact: ${fullName}`,
        `Work email: ${email}`,
        `Company: ${company}`,
        `Website: ${website || "Not provided"}`,
        `Country / region: ${country}`,
        `Capabilities: ${capabilities}`,
        `Certifications: ${certifications || "Not provided"}`,
        "",
        "What work they want to receive:",
        message,
        "",
        `Review and invite provider: ${reviewUrl}`,
        "",
        "Opening the review page does not grant access. A provider invitation is sent only after an authenticated Kordyne owner approves this request.",
      ].join("\n"),
    });

    if (result.error) {
      console.error("Provider access email failed", result.error);
      await admin
        .from("provider_access_requests")
        .update({
          notification_error: result.error.message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", accessRequest.id);

      return NextResponse.json({
        success: true,
        notificationSent: false,
      });
    }

    await admin
      .from("provider_access_requests")
      .update({
        notification_sent_at: new Date().toISOString(),
        notification_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", accessRequest.id);

    return NextResponse.json({ success: true, notificationSent: true });
  } catch (error) {
    console.error("Provider access request failed", error);
    return NextResponse.json(
      { success: false, error: "Unable to send your request." },
      { status: 500 },
    );
  }
}
