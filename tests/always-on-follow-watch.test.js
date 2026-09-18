import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('always-on follow watcher runs every minute without Velog auth tokens', async () => {
  const watcher = await readFile(
    new URL('../netlify/functions/follow-watch.mts', import.meta.url),
    'utf8'
  );
  const publicClient = await readFile(
    new URL('../netlify/functions/_shared/velog-public.mts', import.meta.url),
    'utf8'
  );

  assert.match(watcher, /schedule:\s*"\* \* \* \* \*"/);
  assert.match(publicClient, /https:\/\/v2\.velog\.io\/graphql/);
  assert.doesNotMatch(publicClient, /access_token|refresh_token|Authorization/i);
});

test('cloud follow post uses the same event key as desktop mobile push', async () => {
  const watcher = await readFile(
    new URL('../netlify/functions/follow-watch.mts', import.meta.url),
    'utf8'
  );

  assert.match(watcher, /followPost:feed-post:\$\{post\.id\}/);
  assert.match(watcher, /deliverEventToExtension/);
});

test('extension syncs usernames but not Velog credentials to always-on watcher', async () => {
  const client = await readFile(
    new URL('../src/mobile/push-client.js', import.meta.url),
    'utf8'
  );

  assert.match(client, /\/api\/followings\/sync/);
  assert.match(client, /usernames/);
  assert.doesNotMatch(client, /access_token|refresh_token/);
});
