import type { EncryptedPayload } from "./types";

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function importAuthKey(raw: string) {
  const bytes = base64UrlToBytes(raw);
  if (bytes.byteLength !== 32) throw new Error("AUTH_KEY_INVALID");

  return crypto.subtle.importKey(
    "raw",
    bytes,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptJson(value: unknown, rawKey: string): Promise<EncryptedPayload> {
  const key = await importAuthKey(rawKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify(value));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);

  return {
    iv: bytesToBase64Url(iv),
    ciphertext: bytesToBase64Url(new Uint8Array(encrypted)),
  };
}

export async function decryptJson<T>(
  payload: EncryptedPayload,
  rawKey: string,
): Promise<T> {
  const key = await importAuthKey(rawKey);
  const iv = base64UrlToBytes(payload.iv);
  const ciphertext = base64UrlToBytes(payload.ciphertext);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}

export function randomToken(bytes = 32) {
  const value = crypto.getRandomValues(new Uint8Array(bytes));
  return bytesToBase64Url(value);
}

export function randomPairCode() {
  const bytes = crypto.getRandomValues(new Uint32Array(1));
  return String(bytes[0] % 1_000_000).padStart(6, "0");
}
