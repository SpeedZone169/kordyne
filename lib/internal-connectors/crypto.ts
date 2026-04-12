import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

type EncryptedSecret = {
  ciphertext: string;
  iv: string;
  tag: string;
};

function getEncryptionKey(): Buffer {
  const raw = process.env.KORDYNE_CONNECTOR_ENCRYPTION_KEY?.trim();

  if (!raw) {
    throw new Error(
      "Missing KORDYNE_CONNECTOR_ENCRYPTION_KEY. Add a 32-byte base64 or 64-character hex key.",
    );
  }

  let key: Buffer;

  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    key = Buffer.from(raw, "hex");
  } else {
    key = Buffer.from(raw, "base64");
  }

  if (key.length !== 32) {
    throw new Error(
      "KORDYNE_CONNECTOR_ENCRYPTION_KEY must decode to exactly 32 bytes.",
    );
  }

  return key;
}

export function encryptConnectorSecret(secret: string): EncryptedSecret {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
  };
}

export function decryptConnectorSecret(input: EncryptedSecret): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(input.iv, "hex");
  const tag = Buffer.from(input.tag, "hex");
  const ciphertext = Buffer.from(input.ciphertext, "base64");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}