import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeNtfyMessage,
  publishNtfy,
} from '../src/mobile/ntfy-client.js';

test('normalizeNtfyMessage maps Velog item to ntfy payload', () => {
  const result = normalizeNtfyMessage({
    id: 'feed-post:123',
    type: 'followPost',
    displayTitle: 'Velog 새 게시물',
    displayMessage: '새 글이 올라왔습니다.',
    url: 'https://velog.io/@user/new-post',
  });

  assert.equal(result.title, 'Velog 새 게시물');
  assert.equal(result.message, '새 글이 올라왔습니다.');
  assert.equal(result.click, 'https://velog.io/@user/new-post');
  assert.deepEqual(result.tags, ['memo']);
});

test('publishNtfy POSTs directly to ntfy.sh', async () => {
  let captured;

  const fetchImpl = async (url, options) => {
    captured = { url, options };
    return {
      ok: true,
      json: async () => ({ id: 'message-id' }),
    };
  };

  await publishNtfy({
    topic: 'velog-alert-test-topic',
    item: {
      id: 'n1',
      type: 'comment',
      displayTitle: '새 댓글',
      displayMessage: '댓글이 달렸습니다.',
      url: 'https://velog.io/@user/post',
    },
    fetchImpl,
  });

  assert.equal(captured.url, 'https://ntfy.sh');
  const body = JSON.parse(captured.options.body);
  assert.equal(body.topic, 'velog-alert-test-topic');
  assert.equal(body.click, 'https://velog.io/@user/post');
});
