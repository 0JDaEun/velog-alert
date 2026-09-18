const $ = (selector) => document.querySelector(selector);

const els = {
  installButton: $("#installButton"),
  installHelp: $("#installHelp"),
  iosGuide: $("#iosGuide"),
  installedBadge: $("#installedBadge"),
  pairCode: $("#pairCode"),
  deviceName: $("#deviceName"),
  connectButton: $("#connectButton"),
  disconnectButton: $("#disconnectButton"),
  statusDot: $("#statusDot"),
  statusTitle: $("#statusTitle"),
  statusMessage: $("#statusMessage"),
};

const STORAGE = {
  deviceToken: "velogAlertDeviceToken",
  deviceId: "velogAlertDeviceId",
  deviceName: "velogAlertDeviceName",
};

const HANDOFF = window.VelogAlertHandoff;
const HANDOFF_MESSAGE = "VELOG_ALERT_OPEN_TARGET";

function handoffCacheRequest() {
  if (!HANDOFF) return null;
  return new Request(new URL(HANDOFF.CACHE_KEY_PATH, window.location.origin).href);
}

async function clearPendingHandoff() {
  if (!HANDOFF || !("caches" in window)) return;

  try {
    const cache = await caches.open(HANDOFF.CACHE_NAME);
    const request = handoffCacheRequest();
    if (request) await cache.delete(request);
  } catch {
    // Handoff cleanup must never block normal PWA startup.
  }
}

async function consumePendingHandoff() {
  if (!HANDOFF) return false;

  const currentUrl = new URL(window.location.href);
  const queryTarget = HANDOFF.normalizeVelogTarget(currentUrl.searchParams.get("open"));

  if (currentUrl.searchParams.has("open") || currentUrl.searchParams.has("from")) {
    currentUrl.searchParams.delete("open");
    currentUrl.searchParams.delete("from");
    history.replaceState(null, "", `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
  }

  if (queryTarget) {
    await clearPendingHandoff();
    window.location.assign(queryTarget);
    return true;
  }

  if (!("caches" in window)) return false;

  try {
    const cache = await caches.open(HANDOFF.CACHE_NAME);
    const request = handoffCacheRequest();
    if (!request) return false;

    const response = await cache.match(request);
    if (!response) return false;

    await cache.delete(request);
    const record = await response.json().catch(() => null);

    if (!HANDOFF.isFreshHandoff(record)) return false;

    const target = HANDOFF.normalizeVelogTarget(record.url);
    if (!target) return false;

    window.location.assign(target);
    return true;
  } catch {
    return false;
  }
}

function handleServiceWorkerMessage(event) {
  if (event.data?.type !== HANDOFF_MESSAGE || !HANDOFF) return;

  const target = HANDOFF.normalizeVelogTarget(event.data.url);
  if (!target) return;

  void clearPendingHandoff().finally(() => {
    window.location.assign(target);
  });
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);
}

let deferredInstallPrompt = null;

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function setStatus(kind, title, message) {
  els.statusDot.className = `dot${kind ? ` ${kind}` : ""}`;
  els.statusTitle.textContent = title;
  els.statusMessage.textContent = message;
}

function formatCode(value) {
  const digits = value.replace(/\D/g, "").slice(0, 6);
  return digits.length > 3 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : digits;
}

function base64UrlToUint8Array(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("이 브라우저는 Service Worker를 지원하지 않습니다.");
  }

  return navigator.serviceWorker.register("/sw.js?v=211-click-handoff", { updateViaCache: "none" });
}

async function getVapidPublicKey() {
  const response = await fetch("/api/push/config", { cache: "no-store" });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload.vapidPublicKey) {
    throw new Error("Push 서버가 아직 설정되지 않았습니다.");
  }

  return payload.vapidPublicKey;
}

async function createSubscription() {
  if (!("PushManager" in window)) {
    throw new Error("이 브라우저에서는 Web Push를 사용할 수 없습니다.");
  }

  if (isIOS() && !isStandalone()) {
    throw new Error("iPhone에서는 먼저 홈 화면에 추가한 Velog Alert 앱을 실행하세요.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("알림 권한을 허용해야 연결할 수 있습니다.");
  }

  const registration = await registerServiceWorker();
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    const vapidPublicKey = await getVapidPublicKey();
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(vapidPublicKey),
    });
  }

  return subscription;
}

async function connect() {
  const code = els.pairCode.value.replace(/\D/g, "");
  const deviceName = els.deviceName.value.trim() || (isIOS() ? "iPhone" : "Android");

  if (code.length !== 6) {
    throw new Error("PC에 표시된 6자리 연결 코드를 입력하세요.");
  }

  const subscription = await createSubscription();

  const response = await fetch("/api/pair/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      deviceName,
      subscription: subscription.toJSON(),
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const messages = {
      PAIRING_CODE_NOT_FOUND: "연결 코드를 찾을 수 없습니다.",
      PAIRING_CODE_EXPIRED: "연결 코드가 만료되었습니다. PC에서 새 코드를 만들어 주세요.",
      PAIRING_CODE_LOCKED: "연결 코드 입력 횟수가 초과되었습니다.",
      RATE_LIMITED: "잠시 후 다시 시도해 주세요.",
    };

    throw new Error(messages[payload.error] || "휴대폰 연결에 실패했습니다.");
  }

  localStorage.setItem(STORAGE.deviceToken, payload.deviceToken);
  localStorage.setItem(STORAGE.deviceId, payload.deviceId);
  localStorage.setItem(STORAGE.deviceName, payload.deviceName || deviceName);

  setStatus("ok", "연결 완료", `${payload.deviceName || deviceName}에서 Velog 알림을 받을 수 있습니다.`);
  els.disconnectButton.classList.remove("hidden");
  els.pairCode.value = "";
}

async function disconnect() {
  const token = localStorage.getItem(STORAGE.deviceToken);
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();

  if (token) {
    await fetch("/api/device", {
      method: "DELETE",
      headers: {
        "X-Device-Token": token,
      },
    }).catch(() => null);
  }

  if (subscription) {
    await subscription.unsubscribe().catch(() => {});
  }

  for (const key of Object.values(STORAGE)) localStorage.removeItem(key);

  setStatus("", "연결 해제됨", "새 연결 코드를 입력하면 다시 연결할 수 있습니다.");
  els.disconnectButton.classList.add("hidden");
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;

  if (!isStandalone()) {
    els.installButton.classList.remove("hidden");
  }
});

els.installButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  els.installButton.classList.add("hidden");
});

els.pairCode.addEventListener("input", () => {
  els.pairCode.value = formatCode(els.pairCode.value);
});

els.connectButton.addEventListener("click", async () => {
  els.connectButton.disabled = true;
  setStatus("", "연결 중", "알림 권한과 Push 연결을 준비하고 있습니다.");

  try {
    await connect();
  } catch (error) {
    setStatus("error", "연결 실패", error?.message || "알 수 없는 오류");
  } finally {
    els.connectButton.disabled = false;
  }
});

els.disconnectButton.addEventListener("click", async () => {
  els.disconnectButton.disabled = true;
  try {
    await disconnect();
  } finally {
    els.disconnectButton.disabled = false;
  }
});

async function bootstrap() {
  const redirected = await consumePendingHandoff();
  if (redirected) return;

  if (isStandalone()) {
    els.installedBadge.classList.remove("hidden");
    els.installHelp.textContent = "설치 완료";
  } else if (isIOS()) {
    els.iosGuide.classList.remove("hidden");
    els.installHelp.textContent = "iPhone에서는 Safari에서 홈 화면에 추가하세요.";
  }

  const savedToken = localStorage.getItem(STORAGE.deviceToken);
  const savedName = localStorage.getItem(STORAGE.deviceName);

  if (savedToken) {
    setStatus("ok", "연결됨", `${savedName || "이 휴대폰"}에서 Velog 알림을 받도록 연결되어 있습니다.`);
    els.disconnectButton.classList.remove("hidden");
  }

  await registerServiceWorker().catch(() => {});
}

void bootstrap();
