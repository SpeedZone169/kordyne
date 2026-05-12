import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const CONTACT_TO_EMAIL =
  process.env.CONTACT_TO_EMAIL || "speedzonefamily@gmail.com";

const CONTACT_FROM_EMAIL =
  process.env.CONTACT_FROM_EMAIL || "Kordyne <onboarding@resend.dev>";

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
      subject: `New Kordyne demo request from ${name}`,
      html: `
        <h2>New Kordyne demo request</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Company:</strong> ${escapeHtml(company || "Not provided")}</p>
        <p><strong>Team size:</strong> ${escapeHtml(teamSize || "Not provided")}</p>
        <p><strong>Primary manufacturing interest:</strong> ${escapeHtml(
          manufacturingProcess || "Not provided"
        )}</p>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(message).replaceAll("\n", "<br />")}</p>
      `,
      text: [
        "New Kordyne demo request",
        "",
        `Name: ${name}`,
        `Email: ${email}`,
        `Company: ${company || "Not provided"}`,
        `Team size: ${teamSize || "Not provided"}`,
        `Primary manufacturing interest: ${manufacturingProcess || "Not provided"}`,
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

