const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const Ajv = require('ajv');
const { ValidationFactory } = require('@iqbspecs/validate-json/validation.factory');

test('Ajv compiles and resolves cross-schema references with the fast-uri override', () => {
  const ajv = new Ajv();

  ajv.addSchema({
    $id: 'https://schemas.iqb.example/variable.schema.json',
    $defs: {
      variable: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', minLength: 1 }
        }
      }
    }
  });

  const validate = ajv.compile({
    $id: 'https://schemas.iqb.example/coding-scheme.schema.json',
    type: 'object',
    required: ['variableCodings'],
    properties: {
      variableCodings: {
        type: 'array',
        items: {
          $ref: 'variable.schema.json#/$defs/variable'
        }
      }
    }
  });

  assert.equal(validate({ variableCodings: [{ id: 'A' }] }), true);
  assert.equal(validate({ variableCodings: [{ id: '' }] }), false);
  assert.equal(validate.errors[0].instancePath, '/variableCodings/0/id');
});

test('validate-json compiles and applies the bundled coding-scheme schema', async t => {
  const schemaFile = require.resolve(
    '@iqbspecs/coding-scheme/coding-scheme.schema.json'
  );
  const schema = JSON.parse(fs.readFileSync(schemaFile, 'utf8'));
  const schemaVersion = schema.$id.split('@').at(-1);
  assert.equal(
    ValidationFactory.addLocalSchema(schemaFile, 'coding-scheme', schemaVersion),
    'VALID'
  );

  const temporaryDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'ajv-override-')
  );
  t.after(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));
  const schemeFile = path.join(temporaryDirectory, 'scheme.json');

  fs.writeFileSync(schemeFile, JSON.stringify({
    version: schemaVersion,
    variableCodings: []
  }));
  assert.equal(
    await ValidationFactory.validate(schemeFile, 'coding-scheme', schemaVersion),
    'VALID'
  );

  fs.writeFileSync(schemeFile, JSON.stringify({
    version: schemaVersion,
    variableCodings: 'invalid'
  }));
  assert.equal(
    await ValidationFactory.validate(schemeFile, 'coding-scheme', schemaVersion),
    'INVALID'
  );
});
