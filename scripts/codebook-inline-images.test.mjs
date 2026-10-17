import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { load } from 'cheerio';
import { CodebookGenerator } from '../dist/ngx-coding-components/fesm2022/iqb-ngx-coding-components-codebook-generator.mjs';
import { defaults } from './fixtures/codebook-synthetic.mjs';
import { inlineImageCases, inlineImageUnits } from './fixtures/codebook-inline-images.mjs';
import { docxParts } from './codebook-docx-test-utils.mjs';

const require = createRequire(import.meta.url);
const commonjs = require('../dist/ngx-coding-components/cjs/codebook-generator.cjs');
const errorText = 'HTML konnte nicht verarbeitet werden.';

for (const [entryPoint, modulePath] of [
  ['ESM', './dist/ngx-coding-components/fesm2022/iqb-ngx-coding-components-codebook-generator.mjs'],
  ['CommonJS', './dist/ngx-coding-components/cjs/codebook-generator.cjs']
]) {
  test(`${entryPoint}: zero-length ICNS chunk cannot block DOCX generation`, () => {
    // Isolate the synchronous parser so a vulnerable version fails within the timeout.
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      import { defaults } from './scripts/fixtures/codebook-synthetic.mjs';
      import { inlineImageUnits } from './scripts/fixtures/codebook-inline-images.mjs';
      import { docxParts } from './scripts/codebook-docx-test-utils.mjs';
      const { CodebookGenerator } = await import(${JSON.stringify(modulePath)});
      const image = Buffer.from('69636e73000000106963303700000000', 'hex').toString('base64');
      const entry = { imageHtml: '<img src="data:image/icns;base64,' + image + '">' };
      const parts = await docxParts(await CodebookGenerator.generateCodebook(
        inlineImageUnits(entry, 'general'), defaults, []));
      const xml = parts['word/document.xml'];
      assert.ok(xml.includes('VOR') && xml.includes('NACH'));
      assert.ok(xml.includes(${JSON.stringify(errorText)}));
    `], { encoding: 'utf8', timeout: 15000 });
    assert.equal(result.error, undefined, 'image parsing must finish without blocking');
    assert.equal(result.status, 0, result.stderr);
  });
}

for (const [entryPoint, generator] of [['ESM', CodebookGenerator], ['CommonJS', commonjs.CodebookGenerator]]) {
  for (const location of ['general', 'code']) for (const showScore of [false, true]) {
    for (const entry of inlineImageCases) {
      test(`${entryPoint}: ${entry.id} inline image preserves ${location} instruction, score=${showScore}`, async () => {
        const parts = await docxParts(await generator.generateCodebook(inlineImageUnits(entry, location),
          { ...defaults, showScore }, []));
        const $ = load(parts['word/document.xml'], { xml: true });
        const paragraphs = $('w\\:p').toArray().filter(p => $(p).find('w\\:t').text().startsWith('VOR'));
        assert.equal(paragraphs.length, 1, 'the instruction paragraph must survive the failed image');
        const p = $(paragraphs[0]);
        assert.equal(p.find('w\\:t').text(), `VOR${errorText.repeat(entry.errors)}NACH`);
        assert.equal(p.closest('w\\:tbl').length, location === 'code' ? 1 : 0);
        const run = text => p.find('w\\:r').filter((_, node) => $(node).children('w\\:t').text() === text);
        assert.equal(run('VOR').find('w\\:b').length, 1, 'preceding text keeps its bold mark');
        assert.equal(run('NACH').find('w\\:color').attr('w:val'), 'FF0000');
        assert.equal(run('NACH').find('w\\:sz').attr('w:val'), '36');
        assert.equal($('w\\:t').toArray().filter(node => $(node).text() === 'WEITER').length, 1);
        assert.equal(p.find('w\\:drawing').length, entry.images, 'a later valid image still renders once');
        assert.equal(p.find('m\\:oMath').length, entry.formulas, 'a later formula still renders once');
        assert.equal($('w\\:drawing').length, entry.images);
        assert.equal(Object.keys(parts).filter(name => name.startsWith('word/media/')).length, entry.images);
      });
    }
  }
}
