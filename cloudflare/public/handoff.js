(function initVelogAlertHandoff(root) {
  "use strict";

  const DEFAULT_TARGET = "https://velog.io/notifications";
  const CACHE_NAME = "velog-alert-notification-handoff-v1";
  const CACHE_KEY_PATH = "/__velog_alert_notification_target__";
  const MAX_AGE_MS = 2 * 60 * 1000;

  function normalizeVelogTarget(value) {
    if (typeof value !== "string" || !value.trim()) return null;

    try {
      const url = new URL(value.trim(), DEFAULT_TARGET);
      if (url.protocol !== "https:" || url.hostname !== "velog.io") {
        return null;
      }
      return url.href;
    } catch {
      return null;
    }
  }

  function buildHandoffUrl(target, origin) {
    const safeTarget = normalizeVelogTarget(target) || DEFAULT_TARGET;
    const url = new URL("/", origin);
    url.searchParams.set("open", safeTarget);
    url.searchParams.set("from", "push");
    return url.href;
  }

  function isFreshHandoff(record, now = Date.now()) {
    if (!record || !normalizeVelogTarget(record.url)) return false;
    if (!Number.isFinite(record.createdAt)) return false;

    const age = now - record.createdAt;
    return age >= 0 && age <= MAX_AGE_MS;
  }

  root.VelogAlertHandoff = Object.freeze({
    DEFAULT_TARGET,
    CACHE_NAME,
    CACHE_KEY_PATH,
    MAX_AGE_MS,
    normalizeVelogTarget,
    buildHandoffUrl,
    isFreshHandoff,
  });
})(typeof self !== "undefined" ? self : globalThis);
