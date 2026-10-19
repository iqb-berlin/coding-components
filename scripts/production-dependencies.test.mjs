import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const readJson = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const library = await readJson('../projects/ngx-coding-components/package.json');
const root = await readJson('../package.json');
const lock = await readJson('../package-lock.json');

test('the production audit includes every shipped library runtime dependency', () => {
  for (const name of Object.keys(library.dependencies)) {
    assert.ok(root.dependencies[name], `${name} must be a production dependency in the audited root`);
    assert.equal(lock.packages[''].dependencies[name], root.dependencies[name], `${name} root manifest and lock differ`);
    const installed = lock.packages[`node_modules/${name}`];
    assert.ok(installed, `${name} must be present in the audited graph`);
    assert.notEqual(installed.dev, true, `${name} must not be omitted by npm audit --omit=dev`);
  }
});
