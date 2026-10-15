import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { load } from 'cheerio';
import { CodebookDocxGenerator } from '../dist/ngx-coding-components/fesm2022/iqb-ngx-coding-components-codebook-generator.mjs';
import { defaults } from './fixtures/codebook-synthetic.mjs';
import { editorMarkCases, editorMarkUnits } from './fixtures/codebook-editor-matrix.mjs';
import { docxParts, partHashes } from './codebook-docx-test-utils.mjs';
const require = createRequire(import.meta.url);
const cjs = require('../dist/ngx-coding-components/cjs/codebook-generator.cjs');
for (const entry of editorMarkCases()) test(`editor mark combination ${entry.id}`, async () => {
  const units = editorMarkUnits(entry.html);
  const parts = await docxParts(await CodebookDocxGenerator.generateDocx(units, defaults));
  const common = await docxParts(await cjs.CodebookDocxGenerator.generateDocx(units, defaults));
  assert.deepEqual(partHashes(parts), partHashes(common), 'ESM and CommonJS document parts');
  const $ = load(parts['word/document.xml'], { xml: true });
  const marked = $('w\\:r').toArray().filter(run => $(run).children('w\\:t').text() .includes(entry.text));
  assert.equal(marked.length, 2, 'general and code instruction each retain exact Unicode/spacing');
  for (const run of marked) {
    for (const [bit, tag] of ['b', 'i', 'u', 'strike'].entries()) {
      assert.equal($(run).find(`w\\:${tag}`).length > 0, !!(entry.mask & (1 << bit)), tag);
    }
    assert.equal($(run).find('w\\:vertAlign').attr('w:val'),
      entry.vertical ? (entry.vertical === 'sup' ? 'superscript' : 'subscript') : undefined);
    const paragraph = $(run).closest('w\\:p');
    assert.equal(paragraph.find('w\\:jc').attr('w:val'), entry.alignment === 'justify' ? 'both' : entry.alignment);
    assert.equal(paragraph.find('w\\:t').toArray().map(node => $(node).text()).join(''), `vor ${entry.text} nach`);
  }
});
