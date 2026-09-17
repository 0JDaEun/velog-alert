const els = {
  statusText: document.querySelector('#statusText'),
  statusDot: document.querySelector('#statusDot'),
  lastCheck: document.querySelector('#lastCheck'),
  lastAutoCheck: document.querySelector('#lastAutoCheck'),
  nextAutoCheck: document.querySelector('#nextAutoCheck'),
  authStatus: document.querySelector('#authStatus'),
  transport: document.querySelector('#transport'),
  fetchedCount: document.querySelector('#fetchedCount'),
  newCount: document.querySelector('#newCount'),
  errorBox: document.querySelector('#errorBox'),
  checkNow: document.querySelector('#checkNow'),
  testNotification: document.querySelector('#testNotification'),
  enabled: document.querySelector('#enabled'),
  comment: document.querySelector('#comment'),
  commentReply: document.querySelector('#commentReply'),
  postLike: document.querySelector('#postLike'),
  follow: document.querySelector('#follow'),
  intervalMinutes: document.querySelector('#intervalMinutes'),
  saveState: document.querySelector('#saveState'),
  clearHistory: document.querySelector('#clearHistory'),
  historyList: document.querySelector('#historyList'),
  historyEmpty: document.querySelector('#historyEmpty'),
};

let rendering = false;

function formatTime(iso) {
  if (!iso) return '-';

  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(iso));
}

function formatHistoryTime(iso) {
  if (!iso) return '';

  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  return new Intl.DateTimeFormat('ko-KR', sameDay
    ? { hour: '2-digit', minute: '2-digit' }
    : { month: 'numeric', day: 'numeric' }
  ).format(date);
}

function iconFor(type) {
  return {
    comment: 'C',
    commentReply: 'R',
    postLike: '♥',
    follow: '+',
  }[type] ?? 'V';
}

function readSettingsFromForm() {
  return {
    enabled: els.enabled.checked,
    comment: els.comment.checked,
    commentReply: els.commentReply.checked,
    postLike: els.postLike.checked,
    follow: els.follow.checked,
    intervalMinutes: Number(els.intervalMinutes.value),
  };
}

function renderHistory(history = []) {
  els.historyList.replaceChildren();
  els.historyEmpty.classList.toggle('hidden', history.length > 0);

  for (const item of history.slice(0, 12)) {
    const button = document.createElement('button');
    button.className = 'history-item';
    button.type = 'button';
    button.dataset.url = item.url || 'https://velog.io/notifications';

    const icon = document.createElement('span');
    icon.className = 'history-icon';
    icon.textContent = iconFor(item.type);

    const content = document.createElement('span');
    content.className = 'history-content';

    const title = document.createElement('div');
    title.className = 'history-title';
    title.textContent = item.title || 'Velog 알림';

    const message = document.createElement('div');
    message.className = 'history-message';
    message.textContent = item.message || `${item.actorName || '사용자'}의 새 활동`;

    const time = document.createElement('span');
    time.className = 'history-time';
    time.textContent = formatHistoryTime(item.createdAt || item.detectedAt);

    content.append(title, message);
    button.append(icon, content, time);
    els.historyList.append(button);
  }
}

async function getState() {
  const { velogAlertState = {} } =
    await chrome.storage.local.get('velogAlertState');
  return velogAlertState;
}

async function render() {
  rendering = true;
  const state = await getState();
  const settings = state.settings ?? {};
  const error = state.lastError;

  let alarmStatus = null;
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_ALARM_STATUS',
    });
    alarmStatus = response?.alarm ?? null;
  } catch {
    alarmStatus = null;
  }

  let authStatus = null;
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_AUTH_STATUS',
    });
    authStatus = response?.auth ?? null;
  } catch {
    authStatus = null;
  }

  els.lastCheck.textContent = formatTime(state.lastCheckAt);

  if (els.lastAutoCheck) {
    els.lastAutoCheck.textContent = formatTime(state.lastAlarmAt);
  }

  if (els.nextAutoCheck) {
    els.nextAutoCheck.textContent = alarmStatus?.scheduledTime
      ? formatTime(new Date(alarmStatus.scheduledTime).toISOString())
      : '미예약';
  }

  if (els.authStatus) {
    if (authStatus?.accessTokenPresent) {
      els.authStatus.textContent = '로그인 확인';
    } else if (authStatus?.refreshTokenPresent) {
      els.authStatus.textContent = '세션 갱신 필요';
    } else {
      els.authStatus.textContent = '로그인 필요';
    }
  }
  if (els.transport) {
    els.transport.textContent =
      state.lastTransport === 'velog-page'
        ? 'Velog 페이지 브리지'
        : state.lastTransport === 'bearer-cookie'
          ? '백그라운드 인증'
          : state.lastTransport === 'service-worker'
            ? '직접 호출'
            : '-';
  }

  els.fetchedCount.textContent = String(state.lastFetchedCount ?? 0);
  els.newCount.textContent = String(state.lastNewCount ?? 0);

  els.enabled.checked = settings.enabled !== false;
  els.comment.checked = settings.comment !== false;
  els.commentReply.checked = settings.commentReply !== false;
  els.postLike.checked = Boolean(settings.postLike);
  els.follow.checked = Boolean(settings.follow);
  els.intervalMinutes.value = String(settings.intervalMinutes ?? 1);

  if (!els.enabled.checked) {
    els.statusText.textContent = '일시 중지';
    els.statusDot.className = 'status-dot off';
    els.errorBox.classList.add('hidden');
  } else if (error) {
    els.statusText.textContent =
      error.code === 'UNAUTHORIZED' ? '로그인 필요' : '확인 실패';
    els.statusDot.className = 'status-dot error';
    const details = error.details ?? {};
    const detailParts = [];

    if (details.status !== undefined) {
      detailParts.push(`HTTP ${details.status}${details.statusText ? ` ${details.statusText}` : ''}`);
    }

    if (details.contentType) {
      detailParts.push(`Content-Type: ${details.contentType}`);
    }

    if (details.bodyLength !== undefined) {
      detailParts.push(`Body: ${details.bodyLength} bytes`);
    }

    els.errorBox.textContent = [
      `${error.code}: ${error.message}`,
      detailParts.length ? detailParts.join(' · ') : '',
    ].filter(Boolean).join('\n');

    els.errorBox.classList.remove('hidden');
  } else if (state.lastSuccessAt) {
    els.statusText.textContent = '정상 작동';
    els.statusDot.className = 'status-dot ok';
    els.errorBox.classList.add('hidden');
  } else {
    els.statusText.textContent = '초기화 중';
    els.statusDot.className = 'status-dot';
    els.errorBox.classList.add('hidden');
  }

  renderHistory(state.notificationHistory ?? []);
  rendering = false;
}

async function saveSettings() {
  if (rendering) return;

  els.saveState.textContent = '저장 중';
  els.saveState.className = 'save-state saving';

  const response = await chrome.runtime.sendMessage({
    type: 'UPDATE_SETTINGS',
    settings: readSettingsFromForm(),
  });

  if (response?.ok) {
    els.saveState.textContent = '저장됨';
    els.saveState.className = 'save-state saved';
    setTimeout(() => {
      els.saveState.textContent = '자동 저장';
      els.saveState.className = 'save-state';
    }, 1100);
  } else {
    els.saveState.textContent = '저장 실패';
    els.saveState.className = 'save-state';
  }

  await render();
}

for (const id of ['enabled', 'comment', 'commentReply', 'postLike', 'follow', 'intervalMinutes']) {
  els[id].addEventListener('change', saveSettings);
}

els.checkNow.addEventListener('click', async () => {
  els.checkNow.disabled = true;
  const original = els.checkNow.textContent;
  els.checkNow.textContent = '확인 중...';

  await chrome.runtime.sendMessage({ type: 'CHECK_NOW' });
  await render();

  els.checkNow.disabled = false;
  els.checkNow.textContent = original;
});

els.testNotification.addEventListener('click', async () => {
  els.testNotification.disabled = true;
  const original = els.testNotification.textContent;
  els.testNotification.textContent = '전송 중...';

  await chrome.runtime.sendMessage({ type: 'SHOW_TEST_NOTIFICATION' });

  els.testNotification.disabled = false;
  els.testNotification.textContent = original;
});

els.clearHistory.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'CLEAR_HISTORY' });
  await render();
});

els.historyList.addEventListener('click', async (event) => {
  const target = event.target.closest('.history-item');
  if (!target?.dataset?.url) return;
  await chrome.tabs.create({ url: target.dataset.url });
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.velogAlertState) {
    render();
  }
});

await chrome.runtime.sendMessage({ type: 'RESET_BADGE' });
await render();
