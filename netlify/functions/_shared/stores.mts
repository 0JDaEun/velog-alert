import { getStore } from "@netlify/blobs";

export type PushSubscriptionJSON = {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export type DeviceRecord = {
  id: string;
  tokenHash: string;
  name: string;
  subscription: PushSubscriptionJSON;
  createdAt: string;
  lastSeenAt: string;
  enabled: boolean;
};

export type ExtensionRecord = {
  extensionHash: string;
  createdAt: string;
  updatedAt: string;
  devices: DeviceRecord[];
};

export type PairingRecord = {
  extensionHash: string;
  expiresAt: string;
  createdAt: string;
  attempts: number;
};

export const pairingStore = () => getStore("velog-alert-pairing");
export const deviceStore = () => getStore("velog-alert-devices");
export const tokenStore = () => getStore("velog-alert-device-tokens");
export const dedupStore = () => getStore("velog-alert-dedup");
export const rateStore = () => getStore("velog-alert-rate");

export async function getExtensionRecord(extensionHash: string) {
  return deviceStore().get(`extension:${extensionHash}`, {
    type: "json",
    consistency: "strong",
  }) as Promise<ExtensionRecord | null>;
}

export async function saveExtensionRecord(record: ExtensionRecord) {
  await deviceStore().setJSON(`extension:${record.extensionHash}`, record);
}
