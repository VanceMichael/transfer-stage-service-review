import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const source = new URL('../data/', import.meta.url);
export async function readBundle(directory = source) {
  const manifest = JSON.parse(await readFile(new URL('manifest.json', directory), 'utf8'));
  const tables = {};
  for (const [name, contract] of Object.entries(manifest)) {
    if (!/^[a-z_]+$/.test(name)) throw new Error(`资料表名无效 ${name}`);
    const rows = JSON.parse(await readFile(new URL(`${name}.json`, directory), 'utf8'));
    if (!Array.isArray(rows)) throw new Error(`资料表应为数组 ${name}`);
    const names = contract.fields.slice().sort().join(',');
    const keys = new Set();
    for (const row of rows) {
      if (!row || Object.keys(row).sort().join(',') !== names) {
        throw new Error(`资料字段与清单不符 ${name}`);
      }
      const tuple = contract.key.map(field => row[field]);
      const key = JSON.stringify(tuple);
      if (tuple.some(value => value == null || value === '') || keys.has(key)) {
        throw new Error(`资料主键无效或重复 ${name} ${key}`);
      }
      keys.add(key);
    }
    tables[name] = rows;
  }
  return tables;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const dir = process.argv[2] ? pathToFileURL(resolve(process.argv[2]) + '/') : undefined;
  try {
    const bundle = await readBundle(dir);
    const counts = Object.fromEntries(Object.entries(bundle).map(([table, rows]) => [table, rows.length]));
    console.log(JSON.stringify(counts, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
