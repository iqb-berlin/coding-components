#!/usr/bin/env node

const fs = require('fs');
const { validateCodingScheme } = require('@iqbspecs/validate-json');

const schemeFile = process.argv[2] || './sample-data/coding-scheme-1.json';

try {
  const scheme = JSON.parse(fs.readFileSync(schemeFile, 'utf8'));
  const result = validateCodingScheme(scheme);

  if (result.valid) {
    // eslint-disable-next-line no-console
    console.log('✓ Coding scheme is VALID and compatible with the schema');
    process.exit(0);
  } else {
    // eslint-disable-next-line no-console
    console.log('✗ Coding scheme is INVALID. Validation errors:\n');
    result.errors.forEach((error, index) => {
      // eslint-disable-next-line no-console
      console.log(`${index + 1}. ${error.message}`);
      if (error.path) {
        // eslint-disable-next-line no-console
        console.log(`   Path: ${error.path}`);
      }
    });
    process.exit(1);
  }
} catch (error) {
  // eslint-disable-next-line no-console
  console.error('Error reading or parsing file:', error.message);
  process.exit(1);
}
