import {
  DEFAULT_RELAY_BASE,
  createPairingCode,
  getMobileState,
  listMobileDevices,
  saveMobileState,
} from "./push-client.js";

const $ = (selector) => document.querySelector(selector);

const els = {
  enabled: $("#enabled"),
  createCode: $("#createCode"),
  codeBox: $("#codeBox"),
  code: $("#code"),
  expires: $("#expires"),
  mobileUrl: $("#mobileUrl"),
  devices: $("#devices"),
  refreshDevices: $("#refreshDevices"),
  relayBase: $("#relayBase"),
  saveRelay: $("#saveRelay"),
  status: $("#status"),
};

function showStatus(message) {
  els.status.textContent = message;
  els.status.classList.remove("hidden");
  setTimeout(() => els.status.classList.add("hidden"), 3500);
}

async function renderState() {
  const state = await getMobileState();
  els.enabled.checked = state.enabled;
  els.relayBase.value = state.relayBase || DEFAULT_RELAY_BASE;
  els.mobileUrl.textContent = state.relayBase || DEFAULT_RELAY_BASE;
}

async function renderDevices() {
  els.devices.innerHTML = '<p class="muted">연결된 기기를 확인하는 중입니다.</p>';

  try {
    const devices = await listMobileDevices();

    if (devices.length === 0) {
      els.devices.innerHTML = '<p class="muted">아직 연결된 휴대폰이 없습니다.</p>';
      return;
    }

    els.devices.innerHTML = devices
      .map(
        (device) => `
          <div class="device">
            <strong>${device.name}</strong>
            <small>${device.enabled ? "알림 연결됨" : "Push 만료"} · ${new Date(device.createdAt).toLocaleString()}</small>
          </div>
        `,
      )
      .join("");
  } catch (error) {
    els.devices.innerHTML = `<p class="muted">기기 목록 확인 실패: ${error.message}</p>`;
  }
}

els.enabled.addEventListener("change", async () => {
  await saveMobileState({ enabled: els.enabled.checked });
  showStatus(els.enabled.checked ? "휴대폰 알림을 켰습니다." : "휴대폰 알림을 껐습니다.");
});

els.createCode.addEventListener("click", async () => {
  els.createCode.disabled = true;

  try {
    await saveMobileState({ enabled: true });
    els.enabled.checked = true;

    const payload = await createPairingCode();
    els.code.textContent = payload.formattedCode || payload.code;
    els.expires.textContent = `${new Date(payload.expiresAt).toLocaleTimeString()}까지 사용할 수 있습니다.`;
    els.codeBox.classList.remove("hidden");
  } catch (error) {
    showStatus(`연결 코드 생성 실패: ${error.message}`);
  } finally {
    els.createCode.disabled = false;
  }
});

els.refreshDevices.addEventListener("click", renderDevices);

els.saveRelay.addEventListener("click", async () => {
  const value = els.relayBase.value.trim().replace(/\/$/, "");

  if (!value.startsWith("https://") && !value.startsWith("http://localhost")) {
    showStatus("HTTPS Relay URL을 입력하세요.");
    return;
  }

  await saveMobileState({ relayBase: value });
  els.mobileUrl.textContent = value;
  showStatus("Relay URL을 저장했습니다.");
  await renderDevices();
});

await renderState();
await renderDevices();
