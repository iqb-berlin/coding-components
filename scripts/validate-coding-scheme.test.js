const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { ValidationFactory } = require('@iqbspecs/validate-json/validation.factory');
const { validateScheme } = require('./validate-coding-scheme');

const schemaFile = require.resolve(
  '@iqbspecs/coding-scheme/coding-scheme.schema.json'
);
const schema = JSON.parse(fs.readFileSync(schemaFile, 'utf8'));
const schemaVersion = schema.$id.split('@').at(-1);
const schemaStatus = ValidationFactory.addLocalSchema(
  schemaFile,
  'coding-scheme',
  schemaVersion
);

test('validates one coding-scheme file and reports schema errors', async t => {
  assert.equal(schemaStatus, 'VALID');
  const temporaryDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'coding-scheme-validation-')
  );
  t.after(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

  const schemeFile = path.join(temporaryDirectory, 'scheme.json');
  const messages = [];
  const output = {
    log: message => messages.push(message),
    error: message => messages.push(message)
  };

  fs.writeFileSync(schemeFile, JSON.stringify({
    version: schemaVersion,
    variableCodings: []
  }));
  assert.equal(await validateScheme(schemeFile, output), 0);
  assert.match(messages.at(-1), /valid against schema/);

  fs.writeFileSync(schemeFile, JSON.stringify({
    version: schemaVersion,
    variableCodings: 'not an array'
  }));
  assert.equal(await validateScheme(schemeFile, output), 1);
  assert.ok(messages.some(message => message.includes('/variableCodings')));

  fs.writeFileSync(schemeFile, JSON.stringify({ variableCodings: [] }));
  assert.equal(await validateScheme(schemeFile, output), 1);
  assert.match(messages.at(-1), /Missing or invalid coding-scheme version/);
});
