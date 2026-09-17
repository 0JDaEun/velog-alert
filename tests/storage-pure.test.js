import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeSeenIds, mergeHistory } from '../src/storage/storage.js';

test('mergeSeenIds deduplicates with newest current ids first', () => {
  assert.deepEqual(
    mergeSeenIds(['2', '1'], ['4', '3', '2']).slice(0, 4),
    ['4', '3', '2', '1']
  );
});

test('mergeHistory deduplicates notification ids', () => {
  const merged = mergeHistory(
    [{ id: '1', createdAt: '2026-09-17T01:00:00Z' }],
    [
      {
        id: '2',
        type: 'comment',
        createdAt: '2026-09-17T02:00:00Z',
        displayTitle: 'Velog 새 댓글',
        displayMessage: '테스트',
        actor: {},
        post: null,
        url: 'https://velog.io/notifications',
      },
      {
        id: '1',
        type: 'comment',
        createdAt: '2026-09-17T01:00:00Z',
        displayTitle: 'Velog 새 댓글',
        displayMessage: '중복',
        actor: {},
        post: null,
        url: 'https://velog.io/notifications',
      },
    ]
  );

  assert.deepEqual(merged.map((item) => item.id), ['2', '1']);
});
