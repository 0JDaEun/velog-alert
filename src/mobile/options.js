import {
  DEFAULT_RELAY_BASE,
  createPairingCode,
  getMobileState,
  listMobileDevices,
  saveMobileState,
  sendMobileTestPush,
  setAlwaysOnFollowWatchEnabled,
  enableCloudAuth,
  getCloudAuthStatus,
  disableCloudAuth,
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
  testMobilePush: $("#testMobilePush"),
  relayBase: $("#relayBase"),
  saveRelay: $("#saveRelay"),
  status: $("#status"),
  cloudAuthDot: $("#cloudAuthDot"),
  cloudAuthTitle: $("#cloudAuthTitle"),
  cloudAuthMessage: $("#cloudAuthMessage"),
  enableCloudAuth: $("#enableCloudAuth"),
  disableCloudAuth: $("#disableCloudAuth"),
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

async function renderCloudAuthStatus() {
  try {
    const auth = await getCloudAuthStatus();

    if (auth.enabled && auth.status === "active") {
      els.cloudAuthDot.className = "status-dot ok";
      els.cloudAuthTitle.textContent = "Always-on 활성화됨";
      const last = auth.lastSuccessAt
        ? new Date(auth.lastSuccessAt).toLocaleString()
        : "아직 없음";
      els.cloudAuthMessage.textContent = `${auth.username || "Velog"} · 마지막 Cloud 확인 ${last}`;
      els.enableCloudAuth.textContent = "Velog 인증 갱신";
      els.disableCloudAuth.classList.remove("hidden");
      return;
    }

    if (auth.status === "expired") {
      els.cloudAuthDot.className = "status-dot warn";
      els.cloudAuthTitle.textContent = "Velog 인증 갱신 필요";
      els.cloudAuthMessage.textContent = "PC에서 Velog에 로그인한 뒤 인증 갱신을 눌러 주세요.";
      els.enableCloudAuth.textContent = "Velog 인증 다시 연결";
      els.disableCloudAuth.classList.remove("hidden");
      return;
    }

    if (auth.status === "error") {
      els.cloudAuthDot.className = "status-dot error";
      els.cloudAuthTitle.textContent = "Cloud 확인 오류";
      els.cloudAuthMessage.textContent = "Velog 인증을 다시 연결해 주세요.";
      els.enableCloudAuth.textContent = "Velog 인증 다시 연결";
      els.disableCloudAuth.classList.remove("hidden");
      return;
    }

    els.cloudAuthDot.className = "status-dot";
    els.cloudAuthTitle.textContent = "Always-on 비활성화";
    els.cloudAuthMessage.textContent = "PC가 꺼져 있을 때는 현재 개인 알림을 확인하지 않습니다.";
    els.enableCloudAuth.textContent = "Always-on 전체 알림 활성화";
    els.disableCloudAuth.classList.add("hidden");
  } catch (error) {
    els.cloudAuthDot.className = "status-dot error";
    els.cloudAuthTitle.textContent = "상태 확인 실패";
    els.cloudAuthMessage.textContent = error.message;
  }
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

  try {
    await setAlwaysOnFollowWatchEnabled(els.enabled.checked);
  } catch (error) {
    console.warn("[Velog Alert] always-on toggle sync failed", error);
  }

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

els.testMobilePush.addEventListener("click", async () => {
  els.testMobilePush.disabled = true;

  try {
    const result = await sendMobileTestPush();
    const delivered = Number(result?.delivered ?? 0);

    if (result?.skipped) {
      showStatus("휴대폰 알림을 먼저 켜 주세요.");
    } else if (delivered > 0) {
      showStatus(`테스트 알림을 ${delivered}개 기기로 보냈습니다.`);
    } else {
      showStatus("연결된 활성 기기가 없습니다.");
    }
  } catch (error) {
    showStatus(`테스트 알림 실패: ${error.message}`);
  } finally {
    els.testMobilePush.disabled = false;
  }
});

els.enableCloudAuth.addEventListener("click", async () => {
  const accepted = confirm(
    "PC가 꺼져 있어도 모든 Velog 알림을 받기 위해 현재 Velog access/refresh token을 암호화하여 Push 서버에 저장합니다. Velog 비밀번호는 저장하지 않습니다. 계속할까요?"
  );
  if (!accepted) return;

  els.enableCloudAuth.disabled = true;
  try {
    const result = await enableCloudAuth();
    showStatus(`Always-on 활성화 완료: ${result.username}`);
    await renderCloudAuthStatus();
  } catch (error) {
    showStatus(`Always-on 활성화 실패: ${error.message}`);
  } finally {
    els.enableCloudAuth.disabled = false;
  }
});

els.disableCloudAuth.addEventListener("click", async () => {
  const accepted = confirm(
    "Cloud에 저장된 Velog 인증정보와 개인 알림 기준점을 삭제할까요?"
  );
  if (!accepted) return;

  els.disableCloudAuth.disabled = true;
  try {
    await disableCloudAuth();
    showStatus("Always-on 인증정보를 삭제했습니다.");
    await renderCloudAuthStatus();
  } catch (error) {
    showStatus(`Always-on 해제 실패: ${error.message}`);
  } finally {
    els.disableCloudAuth.disabled = false;
  }
});

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
await renderCloudAuthStatus();
