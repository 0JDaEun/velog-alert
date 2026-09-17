import test from 'node:test';
import assert from 'node:assert/strict';
import { detectNewFeedPosts } from '../src/core/feed-post-detector.js';

function post(id, userId, createdAt) {
  return {
    id: `feed-post:${id}`,
    type: 'followPost',
    createdAt,
    actor: {
      id: userId,
    },
  };
}

test('first feed run creates baseline without old post notifications', () => {
  const result = detectNewFeedPosts(
    [
      post('p1', 'u1', '2026-09-17T01:00:00Z'),
      post('p2', 'u2', '2026-09-17T00:00:00Z'),
    ],
    {
      feedInitialized: false,
      seenFeedPostIds: [],
      knownFollowingUserIds: [],
    },
    [
      { userId: 'u1' },
      { userId: 'u2' },
    ]
  );

  assert.equal(result.initializedNow, true);
  assert.deepEqual(result.newPosts, []);
  assert.deepEqual(result.allCurrentIds, ['feed-post:p1', 'feed-post:p2']);
  assert.deepEqual(result.currentFollowingUserIds, ['u1', 'u2']);
});

test('new post from an already-followed user is detected', () => {
  const result = detectNewFeedPosts(
    [
      post('new', 'u1', '2026-09-17T02:00:00Z'),
      post('old', 'u1', '2026-09-17T01:00:00Z'),
    ],
    {
      feedInitialized: true,
      seenFeedPostIds: ['feed-post:old'],
      knownFollowingUserIds: ['u1'],
    },
    [{ userId: 'u1' }]
  );

  assert.equal(result.newPosts.length, 1);
  assert.equal(result.newPosts[0].id, 'feed-post:new');
});

test('backfilled posts from a newly followed user are suppressed', () => {
  const result = detectNewFeedPosts(
    [
      post('backfill-1', 'new-user', '2026-09-16T02:00:00Z'),
      post('old', 'existing-user', '2026-09-16T01:00:00Z'),
    ],
    {
      feedInitialized: true,
      seenFeedPostIds: ['feed-post:old'],
      knownFollowingUserIds: ['existing-user'],
    },
    [
      { userId: 'existing-user' },
      { userId: 'new-user' },
    ]
  );

  assert.deepEqual(result.newlyFollowedUserIds, ['new-user']);
  assert.deepEqual(result.newPosts, []);
  assert.ok(result.allCurrentIds.includes('feed-post:backfill-1'));
});

test('unseen posts are ordered from oldest to newest for notification display', () => {
  const result = detectNewFeedPosts(
    [
      post('p2', 'u1', '2026-09-17T02:00:00Z'),
      post('p1', 'u1', '2026-09-17T01:00:00Z'),
    ],
    {
      feedInitialized: true,
      seenFeedPostIds: [],
      knownFollowingUserIds: ['u1'],
    },
    [{ userId: 'u1' }]
  );

  assert.deepEqual(
    result.newPosts.map((item) => item.id),
    ['feed-post:p1', 'feed-post:p2']
  );
});
