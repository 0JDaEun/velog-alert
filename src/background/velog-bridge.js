import { CONFIG } from '../constants/config.js';
import { VelogApiError } from '../api/velog-api.js';

const ports = new Set();
const pending = new Map();
let creatingOffscreen = null;

function selectPort() {
  // Prefer an offscreen iframe bridge if available, otherwise any normal Velog tab.
  const candidates = [...ports];
  const offscreen = candidates.find((entry) =>
    entry.pageUrl?.includes('/notifications')
  );

  return offscreen ?? candidates[0] ?? null;
}

async function hasOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL(CONFIG.OFFSCREEN_PATH);

  if ('getContexts' in chrome.runtime) {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [offscreenUrl],
    });

    return contexts.length > 0;
  }

  const clientsList = await clients.matchAll();
  return clientsList.some((client) => client.url === offscreenUrl);
}

async function closeStaleOffscreenDocument() {
  if (!(await hasOffscreenDocument())) return false;

  try {
    console.info('[Velog Alert] stale offscreen bridge detected; recreating');
    await chrome.offscreen.closeDocument();
    return true;
  } catch (error) {
    console.warn('[Velog Alert] failed to close stale offscreen document', error);
    return false;
  }
}

export async function ensureVelogOffscreenBridge() {
  if (selectPort()) return;

  if (creatingOffscreen) {
    await creatingOffscreen;
    return;
  }

  creatingOffscreen = (async () => {
    // A Manifest V3 service worker can be terminated while the offscreen
    // document survives. In that case this new worker has no in-memory Port
    // for the old document, so recreate it to establish a fresh connection.
    await closeStaleOffscreenDocument();

    await chrome.offscreen.createDocument({
      url: CONFIG.OFFSCREEN_PATH,
      reasons: ['IFRAME_SCRIPTING'],
      justification:
        'Velog 페이지 컨텍스트에서 로그인 세션을 사용해 새 알림을 확인하기 위해 필요합니다.',
    });
  })().finally(() => {
    creatingOffscreen = null;
  });

  await creatingOffscreen;
}

function waitForBridge(timeoutMs = CONFIG.BRIDGE_TIMEOUT_MS) {
  const existing = selectPort();
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const timer = setInterval(() => {
      const bridge = selectPort();

      if (bridge) {
        clearInterval(timer);
        resolve(bridge);
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        clearInterval(timer);
        reject(
          new VelogApiError(
            'Velog 페이지 브리지를 준비하지 못했습니다.',
            'BRIDGE_UNAVAILABLE',
            null,
            {
              hint: 'Velog 탭을 한 번 열고 다시 시도하면 추가 진단이 가능합니다.',
            }
          )
        );
      }
    }, 100);
  });
}

export function registerVelogBridgePort(port) {
  if (port.name !== 'velog-page-bridge') return false;

  const entry = {
    port,
    pageUrl: '',
    topLevel: false,
    source: port.sender?.tab ? 'tab' : 'offscreen-frame',
  };

  ports.add(entry);

  port.onMessage.addListener((message) => {
    if (message?.type === 'BRIDGE_READY') {
      entry.pageUrl = message.pageUrl ?? '';
      entry.topLevel = Boolean(message.topLevel);

      console.info('[Velog Alert] page bridge ready', {
        pageUrl: entry.pageUrl,
        topLevel: entry.topLevel,
        source: entry.source,
      });

      return;
    }

    if (message?.type !== 'GRAPHQL_RESPONSE') return;

    const task = pending.get(message.requestId);
    if (!task) return;

    pending.delete(message.requestId);
    clearTimeout(task.timer);
    task.resolve({
      ...(message.result ?? {}),
      bridgeSource: entry.source,
    });
  });

  port.onDisconnect.addListener(() => {
    ports.delete(entry);

    for (const [requestId, task] of pending.entries()) {
      if (task.port !== port) continue;

      pending.delete(requestId);
      clearTimeout(task.timer);

      task.reject(
        new VelogApiError(
          'Velog 페이지 브리지 연결이 종료되었습니다.',
          'BRIDGE_DISCONNECTED'
        )
      );
    }
  });

  return true;
}

export async function requestViaVelogPage(request) {
  await ensureVelogOffscreenBridge();
  const entry = await waitForBridge();
  const requestId = crypto.randomUUID();

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(requestId);

      reject(
        new VelogApiError(
          'Velog 페이지 브리지 응답 시간이 초과되었습니다.',
          'BRIDGE_TIMEOUT',
          null,
          {
            timeoutMs: CONFIG.BRIDGE_TIMEOUT_MS,
            pageUrl: entry.pageUrl,
          }
        )
      );
    }, CONFIG.BRIDGE_TIMEOUT_MS);

    pending.set(requestId, {
      resolve,
      reject,
      timer,
      port: entry.port,
    });

    entry.port.postMessage({
      type: 'GRAPHQL_REQUEST',
      requestId,
      request,
    });
  });
}
