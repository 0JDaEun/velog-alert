import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeNotification } from '../src/core/notification-parser.js';

test('comment notification is normalized with direct post URL', () => {
  const result = normalizeNotification({
    id: 'n1',
    type: 'comment',
    action: {
      post_id: 'p1',
      post_title: '테스트 글',
      post_writer_username: 'dandonedan',
      post_url_slug: 'test-post',
      comment_text: '좋은 글입니다',
      actor_display_name: 'Tester',
      actor_username: 'tester',
    },
    created_at: '2026-09-17T01:00:00.000Z',
  });

  assert.equal(result.type, 'comment');
  assert.equal(result.post.title, '테스트 글');
  assert.equal(result.message, '좋은 글입니다');
  assert.equal(result.url, 'https://velog.io/@dandonedan/test-post');
});

test('commentReply does not require post_title', () => {
  const result = normalizeNotification({
    id: 'n2',
    type: 'commentReply',
    action: {
      post_id: 'p1',
      post_writer_username: 'dandonedan',
      post_url_slug: 'test-post',
      reply_comment_text: '답글입니다',
      actor_display_name: 'Tester',
    },
  });

  assert.equal(result.post.title, '댓글 답글');
  assert.equal(result.message, '답글입니다');
  assert.equal(result.url, 'https://velog.io/@dandonedan/test-post');
});
