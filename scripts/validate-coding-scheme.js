#!/usr/bin/env node

const fs = require('node:fs');
const { ValidationFactory } = require('@iqbspecs/validate-json/validation.factory');
const bundledSchemaFile = require.resolve(
  '@iqbspecs/coding-scheme/coding-scheme.schema.json'
);
const bundledSchema = require(bundledSchemaFile);

async function validateScheme(schemeFile, output = console) {
  let scheme;

  try {
    scheme = JSON.parse(fs.readFileSync(schemeFile, 'utf8'));
  } catch (error) {
    output.error(`Unable to read or parse ${schemeFile}: ${error.message}`);
    return 1;
  }

  const schemaVersion = scheme.version;
  if (typeof schemaVersion !== 'string' || !/^\d+\.\d+$/.test(schemaVersion)) {
    output.error(`Missing or invalid coding-scheme version in ${schemeFile}`);
    return 1;
  }

  if (bundledSchema.$id === `coding-scheme@iqb-standard@${schemaVersion}`) {
    const registration = ValidationFactory.addLocalSchema(
      bundledSchemaFile,
      'coding-scheme',
      schemaVersion
    );
    if (registration !== 'VALID') {
      output.error(`Unable to load bundled coding-scheme schema: ${registration}`);
      return 1;
    }
  }

  const result = await ValidationFactory.validate(
    schemeFile,
    'coding-scheme',
    schemaVersion
  );

  if (result === 'VALID') {
    output.log(`Coding scheme is valid against schema ${schemaVersion}`);
    return 0;
  }

  output.error(`Coding scheme validation failed (${result}, schema ${schemaVersion})`);
  const detail = ValidationFactory.lastErrorMessage;
  if (detail) {
    output.error(
      detail instanceof Error ? detail.message : JSON.stringify(detail, null, 2)
    );
  }
  return 1;
}

if (require.main === module) {
  validateScheme(process.argv[2] || './sample-data/coding-scheme-valid.json')
    .then(exitCode => {
      process.exitCode = exitCode;
    })
    .catch(error => {
      console.error('Coding scheme validation failed:', error);
      process.exitCode = 1;
    });
}

module.exports = { validateScheme };
