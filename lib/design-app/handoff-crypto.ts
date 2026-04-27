import crypto from "node:crypto";

function getKey() {
  const secret = process.env.DESIGN_APP_HANDOFF_SECRET;
  if (!secret) {
    throw new Error("Missing DESIGN_APP_HANDOFF_SECRET.");
  }

  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptHandoffToken(plainText: string) {
  const iv = crypto.randomBytes(12);
  const key = getKey();

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptHandoffToken(payload: string) {
  const raw = Buffer.from(payload, "base64");

  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);

  const key = getKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}