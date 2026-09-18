import { cloudAuthStore } from "./stores.mts";

type EncryptedPayload = {
  iv: string;
  ciphertext: string;
};

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function getKey() {
  const raw = Netlify.env.get("VELOG_ALERT_AUTH_KEY");
  if (!raw) throw new Error("AUTH_VAULT_KEY_MISSING");

  const bytes = base64UrlToBytes(raw);
  if (bytes.byteLength !== 32) throw new Error("AUTH_VAULT_KEY_INVALID");

  return crypto.subtle.importKey(
    "raw",
    bytes,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptAuthTokens(tokens: {
  accessToken?: string | null;
  refreshToken: string;
}) {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(tokens));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);

  return {
    iv: bytesToBase64Url(iv),
    ciphertext: bytesToBase64Url(new Uint8Array(encrypted)),
  } satisfies EncryptedPayload;
}

export async function decryptAuthTokens(payload: EncryptedPayload) {
  const key = await getKey();
  const iv = base64UrlToBytes(payload.iv);
  const ciphertext = base64UrlToBytes(payload.ciphertext);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );

  const parsed = JSON.parse(new TextDecoder().decode(decrypted));
  if (!parsed?.refreshToken) throw new Error("AUTH_VAULT_PAYLOAD_INVALID");

  return parsed as {
    accessToken?: string | null;
    refreshToken: string;
  };
}

export async function deleteCloudAuth(extensionHash: string) {
  await cloudAuthStore().delete(`auth:${extensionHash}`);
  await cloudAuthStore().delete(`state:${extensionHash}`);
}
