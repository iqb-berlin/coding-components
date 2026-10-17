import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { load } from 'cheerio';
import { CodebookGenerator } from '../dist/ngx-coding-components/fesm2022/iqb-ngx-coding-components-codebook-generator.mjs';
import { defaults, selectionCorpus, expectedSelection, optionMatrix, missingCases, referenceCorpus, referenceOptions } from './fixtures/codebook-synthetic.mjs';
import { docxParts, partHashes, originalStudioCompatibleParts } from './codebook-docx-test-utils.mjs';

const corpus = selectionCorpus();
const compactRows = corpus.rows.filter(({ variable }) => variable.sourceType === 'BASE' ||
  (variable.id.endsWith('_MIXED') && ['SUM_SCORE', 'BASE_NO_VALUE'].includes(variable.sourceType)));
const compactUnits = [{ ...corpus.units[1], scheme: JSON.stringify({ version: '3.4', variableCodings: compactRows.map(r => r.variable).reverse() }) }];
const projection = variables => variables.map(({ id, codes }) => ({ id, codes: codes.map(c => c.id) }));

for (const options of optionMatrix()) {
  test(`all options ${JSON.stringify(options)}`, async () => {
    const expected = expectedSelection(corpus.rows, options);
    const compactExpected = expectedSelection(compactRows, options);
    for (const missings of missingCases) {
      const json = JSON.parse(await (await CodebookGenerator.generateCodebook(corpus.units, { ...options, exportFormat: 'json' }, missings)).text());
      assert.deepEqual(json.map(unit => unit.key), ['A', 'Z']);
      assert.deepEqual(projection(json[0].variables), expected);
      assert.deepEqual(json[1].variables, []);
      assert.deepEqual(json[0].missings, missings);
      assert.equal('items' in json[0], false);
      for (const variable of json[0].variables) {
        assert.equal(!!variable.generalInstruction, options.hasGeneralInstructions);
        for (const code of variable.codes) {
          assert.equal('score' in code, options.showScore);
          if (options.showScore && code.id === '0') assert.equal(code.score, '0');
          if (options.codeLabelToUpper) assert.equal(code.label, code.label.toUpperCase());
        }
      }
      const parts = await docxParts(await CodebookGenerator.generateCodebook(compactUnits, { ...options, exportFormat: 'docx' }, missings));
      const $ = load(parts['word/document.xml'], { xml: true });
      const headings = $('w\\:p').filter((_, p) => $(p).find('w\\:pStyle').attr('w:val') === 'Heading2');
      assert.deepEqual(headings.toArray().map(p => $(p).find('w\\:t').text().split('  ')[0]), compactExpected.map(v => v.id));
      const tables = $('w\\:tbl').toArray();
      assert.equal(tables.length, compactExpected.length);
      tables.forEach((table, i) => {
        const rows = $(table).children('w\\:tr').toArray();
        assert.deepEqual(rows.map(row => $(row).children('w\\:tc').first().text()), compactExpected[i].codes);
        rows.forEach(row => assert.equal($(row).children('w\\:tc').length, options.showScore ? 4 : 3));
        assert.equal($(table).find('w\\:cantSplit').length, rows.length);
        // Widths needed by Microsoft Word and the grid needed by Writer are both preserved.
        assert.equal($(table).children('w\\:tblGrid').children().length, options.showScore ? 4 : 3);
        assert.equal($(table).find('w\\:tcW').length, rows.length * (options.showScore ? 4 : 3));
      });
      const paragraphs = $('w\\:body').children('w\\:p').toArray().map(p => $(p).find('w\\:t').text());
      assert.equal(paragraphs.filter(t => t.startsWith('Item(s):')).length, options.hideItemVarRelation ? 0 : compactExpected.length);
      assert.equal(paragraphs.includes('Allgemeiner Hinweis'), options.hasGeneralInstructions && compactExpected.some(v => v.id.endsWith('_GENERAL_ONLY')));
      assert.equal(paragraphs.some(t => /^\s+$/.test(t)), false, 'whitespace instructions must not change page layout');
      for (const missing of missings) assert.ok(paragraphs.includes(`${missing.code} ${missing.label}`));
      const formulaCount = compactExpected.filter(v => v.id.endsWith('_FORMULA')).length;
      const imageCount = compactExpected.filter(v => v.id.endsWith('_IMAGE')).length;
      assert.equal($('m\\:oMath').length, formulaCount);
      assert.equal($('w\\:drawing').length, imageCount);
      assert.doesNotMatch(parts['word/document.xml'], /<undefined|HTML konnte nicht verarbeitet werden/);
      assert.match(parts['word/footer1.xml'], /IQB Codebook/);
      assert.match(parts['word/footer1.xml'], /PAGE/);
      assert.match(parts['word/footer1.xml'], /NUMPAGES/);
    }
  });
}

test('all supported input versions preserve synthetic data and malformed schemas fail by unit key', async () => {
  for (const version of ['3.0', '3.3', '3.4']) {
    const unit = { ...compactUnits[0], scheme: JSON.stringify({ ...JSON.parse(compactUnits[0].scheme), version }) };
    assert.deepEqual(projection(CodebookGenerator.getCodebookData([unit], defaults, [])[0].variables), expectedSelection(compactRows, defaults));
  }
  for (const scheme of ['{', '{}', '{"variableCodings":null}', '{"variableCodings":[null]}']) {
    await assert.rejects(CodebookGenerator.generateCodebook([{ ...compactUnits[0], key: 'BROKEN', scheme }], defaults, []), /BROKEN/);
  }
});

test('raw synthetic schemas match original Studio JSON and complete DOCX parts for all formatting combinations', async () => {
  const expected = JSON.parse(await readFile(new URL('./fixtures/studio-codebook/synthetic-reference.json', import.meta.url), 'utf8'));
  let index = 0;
  for (const options of referenceOptions()) {
    const entry = expected.cases[index++];
    assert.deepEqual(entry.options, options);
    const units = referenceCorpus();
    const missings = [{ code: 99, label: 'Missing', description: 'Keine Antwort' }];
    const json = JSON.parse(await (await CodebookGenerator.generateCodebook(units, { ...options, exportFormat: 'json' }, missings)).text());
    assert.deepEqual(json, entry.json, `original Studio raw-schema JSON: case ${index}`);
    const parts = await docxParts(await CodebookGenerator.generateCodebook(units, options, missings));
    assert.deepEqual(partHashes(originalStudioCompatibleParts(parts)), entry.docxParts, `original Studio DOCX: case ${index}`);
  }
  assert.equal(index, 32);
});
