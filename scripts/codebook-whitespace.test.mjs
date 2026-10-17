import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { load } from 'cheerio';
import { CodebookGenerator } from '../dist/ngx-coding-components/fesm2022/iqb-ngx-coding-components-codebook-generator.mjs';
import { whitespaceReferenceCases, whitespaceReferenceUnits } from './fixtures/codebook-whitespace.mjs';
import { docxParts, partHashes } from './codebook-docx-test-utils.mjs';

const require = createRequire(import.meta.url);
const commonjs = require('../dist/ngx-coding-components/cjs/codebook-generator.cjs');
const reference = JSON.parse(await readFile(new URL('./fixtures/studio-codebook/whitespace-reference.json', import.meta.url), 'utf8'));
const cases = [...whitespaceReferenceCases()];
assert.equal(reference.cases.length, cases.length);
assert.equal(reference.source, 'iqb-berlin/studio-lite@2504265721a59c7c65425072951ce82ab16f0fb8');

for (const [index, entry] of cases.entries()) {
  test(`original Studio spacing ${entry.id}, score=${entry.options.showScore}, ESM/CJS`, async () => {
    const expected = reference.cases[index];
    assert.deepEqual({ id: expected.id, html: expected.html, text: expected.text, options: expected.options }, entry);
    for (const generator of [CodebookGenerator, commonjs.CodebookGenerator]) {
      const units = whitespaceReferenceUnits(entry.html);
      const json = await generator.generateCodebook(units, { ...entry.options, exportFormat: 'json' }, []);
      assert.deepEqual(JSON.parse(await json.text()), expected.json);
      const parts = await docxParts(await generator.generateCodebook(units, entry.options, []));
      assert.deepEqual(partHashes(parts), expected.docxParts, 'all DOCX parts must match original Studio');
      const $ = load(parts['word/document.xml'], { xml: true });
      const paragraphs = $('w\\:body').children('w\\:p').toArray().map(p => $(p).find('w\\:t').text());
      assert.ok(paragraphs.includes(entry.text), 'general instruction must retain its exact spacing');
      const description = $('w\\:tr').first().children('w\\:tc').last().find('w\\:t').toArray().map(t => $(t).text()).join('');
      assert.equal(description, entry.text, 'code instruction must retain its exact spacing');
    }
  });
}
