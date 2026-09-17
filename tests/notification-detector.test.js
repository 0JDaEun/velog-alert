import test from 'node:test';
import assert from 'node:assert/strict';
import { detectNewNotifications } from '../src/core/notification-detector.js';

test('first run creates baseline without sending old notifications', () => {
  const result = detectNewNotifications(
    [{ id: '3' }, { id: '2' }, { id: '1' }],
    { initialized: false, seenNotificationIds: [] }
  );

  assert.equal(result.initializedNow, true);
  assert.deepEqual(result.newNotifications, []);
  assert.deepEqual(result.allCurrentIds, ['3', '2', '1']);
});

test('only unseen ids are returned and ordered oldest to newest', () => {
  const result = detectNewNotifications(
    [
      { id: '3', createdAt: '2026-09-17T03:00:00Z' },
      { id: '2', createdAt: '2026-09-17T02:00:00Z' },
      { id: '1', createdAt: '2026-09-17T01:00:00Z' },
    ],
    { initialized: true, seenNotificationIds: ['1'] }
  );

  assert.deepEqual(result.newNotifications.map((item) => item.id), ['2', '3']);
});
