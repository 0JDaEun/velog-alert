import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('manifest includes cookies permission for Velog auth', async () => {
  const manifest = JSON.parse(
    await readFile(new URL('../manifest.json', import.meta.url), 'utf8')
  );
  assert.ok(manifest.permissions.includes('cookies'));
});

test('Velog auth reads access_token without persisting its value', async () => {
  const source = await readFile(
    new URL('../src/api/velog-auth.js', import.meta.url),
    'utf8'
  );
  assert.match(source, /chrome\.cookies\.get/);
  assert.match(source, /access_token/);
  assert.doesNotMatch(source, /chrome\.storage/);
});

test('GraphQL direct transport uses Authorization Bearer', async () => {
  const source = await readFile(
    new URL('../src/api/velog-api.js', import.meta.url),
    'utf8'
  );
  assert.match(source, /Authorization/);
  assert.match(source, /Bearer \$\{auth\.token\}/);
  assert.match(source, /credentials: 'omit'/);
});
