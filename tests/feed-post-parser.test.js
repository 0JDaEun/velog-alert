import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeFeedPost } from '../src/core/feed-post-parser.js';

test('following feed post is normalized with direct Velog post URL', () => {
  const normalized = normalizeFeedPost({
    id: 'post-1',
    title: '새로운 Java 글',
    short_description: '설명',
    url_slug: 'new-java-post',
    released_at: '2026-09-17T01:00:00.000Z',
    user: {
      id: 'user-1',
      username: 'developer',
      profile: {
        display_name: '개발자',
        thumbnail: null,
      },
    },
  });

  assert.equal(normalized.id, 'feed-post:post-1');
  assert.equal(normalized.type, 'followPost');
  assert.equal(normalized.actor.id, 'user-1');
  assert.equal(normalized.post.title, '새로운 Java 글');
  assert.equal(
    normalized.url,
    'https://velog.io/@developer/new-java-post'
  );
});
