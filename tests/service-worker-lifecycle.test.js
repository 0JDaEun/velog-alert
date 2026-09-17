import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('stale offscreen document is recreated when port state was lost', async () => {
  const source = await readFile(
    new URL('../src/background/velog-bridge.js', import.meta.url),
    'utf8'
  );

  assert.match(source, /closeStaleOffscreenDocument/);
  assert.match(source, /chrome\.offscreen\.closeDocument/);
  assert.match(source, /chrome\.offscreen\.createDocument/);
});

test('alarm firing is persisted for automatic-check diagnostics', async () => {
  const source = await readFile(
    new URL('../src/background/service-worker.js', import.meta.url),
    'utf8'
  );

  assert.match(source, /lastAlarmAt/);
  assert.match(source, /automatic alarm fired/);
  assert.match(source, /trigger: 'alarm'/);
});

test('matching alarm is not reset on every service-worker wake', async () => {
  const source = await readFile(
    new URL('../src/background/service-worker.js', import.meta.url),
    'utf8'
  );

  assert.match(source, /existing && periodMatches && !force/);
  assert.match(source, /return existing/);
  assert.match(source, /ensureAlarm\(\)\.catch/);
});
