import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function deriveKey(secret: string) {
  return createHash("sha256").update(secret).digest();
}

export function getAiConnectionEncryptionSecret() {
  return process.env.DAILY_SPARKS_AI_CONFIG_ENCRYPTION_SECRET?.trim() ?? "";
}

export function isAiConnectionEncryptionConfigured() {
  return Boolean(getAiConnectionEncryptionSecret());
}

export function encryptAiConnectionApiKey(secret: string, plainText: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(secret), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64url")}.${authTag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptAiConnectionApiKey(secret: string, cipherText: string) {
  const [ivBase64, authTagBase64, payloadBase64] = cipherText.split(".");

  if (!ivBase64 || !authTagBase64 || !payloadBase64) {
    throw new Error("Invalid AI connection ciphertext.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    deriveKey(secret),
    Buffer.from(ivBase64, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(authTagBase64, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(payloadBase64, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function buildAiConnectionApiKeyPreview(apiKey: string) {
  const trimmedApiKey = apiKey.trim();

  if (!trimmedApiKey) {
    return "";
  }

  if (trimmedApiKey.length <= 4) {
    return "••••";
  }

  return `••••••••${trimmedApiKey.slice(-4)}`;
}
