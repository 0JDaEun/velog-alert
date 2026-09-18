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

export type AlertSettings = {
  comment: boolean;
  commentReply: boolean;
  postLike: boolean;
  follow: boolean;
  followPost: boolean;
};

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  comment: true,
  commentReply: true,
  postLike: false,
  follow: false,
  followPost: true,
};

export type EncryptedPayload = {
  iv: string;
  ciphertext: string;
};

export type Frontier = {
  latestCreatedAt: string | null;
  idsAtLatest: string[];
};

export type AccountRecord = {
  extensionHash: string;
  devices: DeviceRecord[];
  encryptedTokens: EncryptedPayload | null;
  username: string | null;
  cloudEnabled: boolean;
  authStatus: "disabled" | "active" | "expired" | "error";
  settings: AlertSettings;
  heartbeatUntil: string | null;
  notificationFrontier: Frontier | null;
  feedFrontier: Frontier | null;
  dedupEventKeys: string[];
  createdAt: string;
  updatedAt: string;
  lastCloudSuccessAt: string | null;
  lastCloudErrorAt: string | null;
};

export type PairingRecord = {
  code: string;
  extensionHash: string;
  shardName: string;
  createdAt: string;
  expiresAt: string;
  attempts: number;
};

export type MobileEvent = {
  eventKey: string;
  type: string;
  title: string;
  body: string;
  url: string;
  createdAt?: string;
};

export interface Env {
  REGISTRY: DurableObjectNamespace;
  POLL_SHARDS: DurableObjectNamespace;
  ASSETS: Fetcher;
  AUTH_KEY: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;
}
