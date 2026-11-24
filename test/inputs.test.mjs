import assert from 'node:assert/strict';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {pathToFileURL} from 'node:url';
import {readBundle} from '../scripts/inspect.mjs';

test('资料可按声明的主键和字段完整读取', async () => {
  const bundle = await readBundle();
  assert(Object.values(bundle).every(rows => rows.length > 0));
  const {projects, packages, events, services} = bundle;
  assert(events.every(row => packages.some(pkg => pkg.project === row.project && pkg.package === row.package)));
  assert(events.filter(row => row.previous).every(row => events.some(previous => previous.id === row.previous && previous.project === row.project)));
  assert(services.every(row => projects.some(project => project.id === row.project)));
  assert(events.some(row => row.event === 'accepted' && row.occurred < row.available));
});

test('读取资料时拒绝重复主键', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'record-check-'));
  try {
    await writeFile(join(dir, 'manifest.json'), '{"entries":{"fields":["id","value"],"key":["id"]}}');
    await writeFile(join(dir, 'entries.json'), '[{"id":"x","value":1},{"id":"x","value":2}]');
    await assert.rejects(readBundle(pathToFileURL(dir + '/')), /主键/);
  } finally {
    await rm(dir, {recursive: true, force: true});
  }
});
