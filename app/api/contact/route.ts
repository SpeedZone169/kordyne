import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const CONTACT_TO_EMAIL =
  process.env.CONTACT_TO_EMAIL ||
  process.env.RESEND_REPLY_TO ||
  "speedzonefamily@gmail.com";

const CONTACT_FROM_EMAIL =
  process.env.CONTACT_FROM_EMAIL ||
  process.env.RESEND_FROM_EMAIL ||
  "Kordyne <noreply@kordyne.com>";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

const contactRateLimit = new Map<string, { count: number; resetAt: number }>();

type ContactBody = {
  name?: unknown;
  email?: unknown;
  company?: unknown;
  teamSize?: unknown;
  process?: unknown;
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

function buildContactEmailHtml({
  name,
  email,
  company,
  teamSize,
  manufacturingProcess,
  message,
}: {
  name: string;
  email: string;
  company: string;
  teamSize: string;
  manufacturingProcess: string;
  message: string;
}) {
  const rows = [
    ["Full name", name],
    ["Work email", email],
    ["Company", company || "Not provided"],
    ["Team size", teamSize || "Not provided"],
    ["Primary interest", manufacturingProcess || "Not provided"],
  ]
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding: 9px 0; color: #5f7485; font-size: 13px; vertical-align: top; width: 150px;">
            ${escapeHtml(label)}
          </td>
          <td style="padding: 9px 0; color: #0b2530; font-size: 14px; font-weight: 700;">
            ${escapeHtml(value)}
          </td>
        </tr>
      `
    )
    .join("");

  return `
    <!doctype html>
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>New Kordyne demo request</title>
      </head>
      <body style="margin: 0; padding: 0; background: #eef9fb; font-family: Arial, Helvetica, sans-serif;">
        <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">
          New Kordyne demo request from ${escapeHtml(company || name)}.
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #eef9fb; padding: 32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 640px; background: #ffffff; border: 1px solid #c8e2e8; border-radius: 24px; overflow: hidden;">
                <tr>
                  <td style="padding: 28px 28px 18px 28px; border-bottom: 4px solid #00bdde;">
                    <div style="font-size: 18px; font-weight: 800; color: #003040;">KORDYNE</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 28px;">
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.16em; color: #0086a0;">
                      Demo request
                    </div>
                    <h1 style="margin: 14px 0 0 0; font-size: 28px; line-height: 1.2; color: #003040;">
                      ${escapeHtml(company || name)} wants to talk about Kordyne
                    </h1>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px; background: #f5fbfc; border: 1px solid #d5e9ee; border-radius: 18px; padding: 16px 18px;">
                      ${rows}
                    </table>
                    <div style="margin-top: 24px;">
                      <div style="font-size: 13px; font-weight: 800; color: #003040;">What they want Kordyne to help coordinate</div>
                      <div style="margin-top: 10px; color: #38546a; font-size: 15px; line-height: 1.75;">
                        ${escapeHtml(message).replaceAll("\n", "<br />")}
                      </div>
                    </div>
                    <div style="margin-top: 28px; font-size: 12px; line-height: 1.7; color: #5f7485;">
                      Reply directly to this email to contact ${escapeHtml(name)}.
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

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getClientIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const cloudflareIp = req.headers.get("cf-connecting-ip");

  if (cloudflareIp) return cloudflareIp;

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return "unknown";
}

function isRateLimited(ip: string) {
  const now = Date.now();
  const existing = contactRateLimit.get(ip);

  if (!existing || existing.resetAt <= now) {
    contactRateLimit.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });

    return false;
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  existing.count += 1;
  contactRateLimit.set(ip, existing);

  return false;
}

async function verifyTurnstileToken(token: string, ip: string) {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    console.error("TURNSTILE_SECRET_KEY is not configured");
    return false;
  }

  const formData = new FormData();
  formData.append("secret", secretKey);
  formData.append("response", token);

  if (ip !== "unknown") {
    formData.append("remoteip", ip);
  }

  const result = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: formData,
    }
  );

  if (!result.ok) {
    return false;
  }

  const data = (await result.json()) as { success?: boolean };

  return data.success === true;
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = (await req.json().catch(() => null)) as ContactBody | null;

    if (!body) {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 }
      );
    }

    const name = readString(body.name, 120);
    const email = readString(body.email, 180).toLowerCase();
    const company = readString(body.company, 160);
    const teamSize = readString(body.teamSize, 80);
    const manufacturingProcess = readString(body.process, 120);
    const message = readString(body.message, 3000);
    const turnstileToken = readString(body.turnstileToken, 2048);

    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email address" },
        { status: 400 }
      );
    }

    if (!turnstileToken) {
      return NextResponse.json(
        { success: false, error: "Verification is required" },
        { status: 400 }
      );
    }

    const turnstileOk = await verifyTurnstileToken(turnstileToken, ip);

    if (!turnstileOk) {
      return NextResponse.json(
        { success: false, error: "Verification failed. Please try again." },
        { status: 400 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured");

      return NextResponse.json(
        { success: false, error: "Contact form is not configured" },
        { status: 500 }
      );
    }

    await resend.emails.send({
      from: CONTACT_FROM_EMAIL,
      to: CONTACT_TO_EMAIL,
      replyTo: email,
      subject: `Kordyne demo request: ${company || name}`,
      html: buildContactEmailHtml({
        name,
        email,
        company,
        teamSize,
        manufacturingProcess,
        message,
      }),
      text: [
        "New Kordyne demo request",
        "",
        `Name: ${name}`,
        `Email: ${email}`,
        `Company: ${company || "Not provided"}`,
        `Team size: ${teamSize || "Not provided"}`,
        `Primary manufacturing interest: ${
          manufacturingProcess || "Not provided"
        }`,
        "",
        "Message:",
        message,
      ].join("\n"),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact form error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to send message" },
      { status: 500 }
    );
  }
}
