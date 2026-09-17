import webpush from "web-push";
import { getDeployStore, getStore } from "@netlify/blobs";

type VapidKeys = {
  publicKey: string;
  privateKey: string;
  subject: string;
  createdAt: string;
};

function vapidStore() {
  if (Netlify.context?.deploy?.context === "production") {
    return getStore("velog-alert-vapid", { consistency: "strong" });
  }

  return getDeployStore("velog-alert-vapid");
}

export async function getOrCreateVapidKeys(): Promise<VapidKeys> {
  const store = vapidStore();
  const key = "active";
  const existing = (await store.get(key, { type: "json" })) as VapidKeys | null;

  if (existing?.publicKey && existing?.privateKey) {
    return existing;
  }

  const generated = webpush.generateVAPIDKeys();
  const created: VapidKeys = {
    publicKey: generated.publicKey,
    privateKey: generated.privateKey,
    subject: "https://github.com/0JDaEun/velog-alert",
    createdAt: new Date().toISOString(),
  };

  await store.setJSON(key, created);
  return created;
}
