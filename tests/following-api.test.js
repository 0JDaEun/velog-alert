import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('alert snapshot queries current user and feedPosts', async () => {
  const source = await readFile(
    new URL('../src/api/velog-api.js', import.meta.url),
    'utf8'
  );

  assert.match(source, /query velogAlertSnapshot/);
  assert.match(source, /currentUser/);
  assert.match(source, /feedPosts\(input: \$feedInput\)/);
});

test('followings query is used to suppress follow backfill false positives', async () => {
  const source = await readFile(
    new URL('../src/api/velog-api.js', import.meta.url),
    'utf8'
  );

  assert.match(source, /query getFollowings/);
  assert.match(source, /fetchFollowingsPages/);
});
