import { getDeployStore, getStore } from "@netlify/blobs";

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

export type FollowWatchRecord = {
  extensionHash: string;
  enabled: boolean;
  followingUsernames: string[];
  updatedAt: string;
};

export type GlobalPostState = {
  initialized: boolean;
  seenPostIds: string[];
  updatedAt: string;
};

function isProductionDeploy() {
  return Netlify.context?.deploy?.context === "production";
}

function blobStore(name: string) {
  if (isProductionDeploy()) {
    return getStore(name, { consistency: "strong" });
  }

  return getDeployStore(name);
}

export const pairingStore = () => blobStore("velog-alert-pairing");
export const deviceStore = () => blobStore("velog-alert-devices");
export const tokenStore = () => blobStore("velog-alert-device-tokens");
export const dedupStore = () => blobStore("velog-alert-dedup");
export const rateStore = () => blobStore("velog-alert-rate");
export const followWatchStore = () => blobStore("velog-alert-follow-watch");

export async function getExtensionRecord(extensionHash: string) {
  return deviceStore().get(`extension:${extensionHash}`, {
    type: "json",
  }) as Promise<ExtensionRecord | null>;
}

export async function saveExtensionRecord(record: ExtensionRecord) {
  await deviceStore().setJSON(`extension:${record.extensionHash}`, record);
}

export async function getFollowWatchRecord(extensionHash: string) {
  return followWatchStore().get(`watch:${extensionHash}`, {
    type: "json",
  }) as Promise<FollowWatchRecord | null>;
}

export async function saveFollowWatchRecord(record: FollowWatchRecord) {
  await followWatchStore().setJSON(`watch:${record.extensionHash}`, record);
}
