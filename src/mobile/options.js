import {
  generateNtfyTopic,
  getMobilePushConfig,
  publishNtfy,
  saveMobilePushConfig,
} from './ntfy-client.js';

const els = {
  enabled: document.querySelector('#enabled'),
  setup: document.querySelector('#setup'),
  topic: document.querySelector('#topic'),
  copyTopic: document.querySelector('#copyTopic'),
  regenerateTopic: document.querySelector('#regenerateTopic'),
  testPush: document.querySelector('#testPush'),
  status: document.querySelector('#status'),
};

function setStatus(message, kind = '') {
  els.status.textContent = message;
  els.status.className = `status${kind ? ` ${kind}` : ''}`;
}

async function render() {
  const config = await getMobilePushConfig();
  els.enabled.checked = Boolean(config.enabled);
  els.setup.classList.toggle('hidden', !config.enabled);
  els.topic.textContent = config.topic || '-';
}

els.enabled.addEventListener('change', async () => {
  let config = await getMobilePushConfig();

  if (els.enabled.checked && !config.topic) {
    config = await saveMobilePushConfig({
      enabled: true,
      topic: generateNtfyTopic(),
    });
  } else {
    config = await saveMobilePushConfig({
      enabled: els.enabled.checked,
    });
  }

  setStatus(
    config.enabled
      ? '휴대폰의 ntfy 앱에서 Topic을 구독하세요.'
      : '휴대폰 알림을 껐습니다.',
    config.enabled ? 'ok' : ''
  );

  await render();
});

els.copyTopic.addEventListener('click', async () => {
  const config = await getMobilePushConfig();
  if (!config.topic) return;

  await navigator.clipboard.writeText(config.topic);
  setStatus('Topic을 복사했습니다.', 'ok');
});

els.regenerateTopic.addEventListener('click', async () => {
  const confirmed = confirm(
    '새 Topic을 만들면 휴대폰 ntfy 앱에서도 새 Topic을 다시 구독해야 합니다.'
  );
  if (!confirmed) return;

  await saveMobilePushConfig({
    enabled: true,
    topic: generateNtfyTopic(),
  });

  setStatus('새 Topic을 만들었습니다. 휴대폰에서 다시 구독하세요.', 'ok');
  await render();
});

els.testPush.addEventListener('click', async () => {
  const config = await getMobilePushConfig();

  if (!config.enabled || !config.topic) {
    setStatus('휴대폰 알림을 먼저 켜주세요.', 'error');
    return;
  }

  els.testPush.disabled = true;
  setStatus('테스트 알림을 보내는 중입니다.');

  try {
    await publishNtfy({
      topic: config.topic,
      item: {
        id: `mobile-test:${Date.now()}`,
        type: 'comment',
        displayTitle: 'Velog Alert 모바일 테스트',
        displayMessage: '휴대폰 알림 연결이 정상입니다.',
        url: 'https://velog.io/notifications',
      },
    });

    setStatus('전송했습니다. 휴대폰 알림을 확인하세요.', 'ok');
  } catch (error) {
    setStatus(`전송 실패: ${error?.message || '알 수 없는 오류'}`, 'error');
  } finally {
    els.testPush.disabled = false;
  }
});

await render();
