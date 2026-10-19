import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { load } from 'cheerio';
import * as esm from '../dist/ngx-coding-components/fesm2022/iqb-ngx-coding-components-codebook-generator.mjs';
import { defaults, image } from './fixtures/codebook-synthetic.mjs';
import { docxParts } from './codebook-docx-test-utils.mjs';

const require = createRequire(import.meta.url);
const cjs = require('../dist/ngx-coding-components/cjs/codebook-generator.cjs');
const options = { ...defaults, hasOnlyManualCoding: false, hasClosedVars: false };
const code = (instruction = '', ruleSets = []) => ({ id: 1, label: 'CODE', type: 'FULL_CREDIT', score: 1,
  manualInstruction: instruction, ruleSets, ruleSetOperatorAnd: true });
const units = codes => [{ id: 1, key: 'REGRESSION', name: 'Synthetic review fixture',
  scheme: JSON.stringify({ version: '3.4', variableCodings: [{ id: 'V', label: 'V', alias: 'V',
    sourceType: 'BASE', manualInstruction: '', codes }] }), metadata: { items: [] } }];

async function render(api, description, generalInstruction = '') {
  const data = [{ key: 'REGRESSION', name: 'Synthetic review fixture', items: [], missings: [],
    variables: [{ id: 'V', label: 'V', sourceType: 'BASE', generalInstruction,
      codes: [{ id: '1', label: 'CODE', score: '1', description }] }] }];
  const parts = await docxParts(await api.CodebookDocxGenerator.generateDocx(data, options));
  return load(parts['word/document.xml'], { xml: true });
}

for (const [name, api] of [['ESM', esm], ['CJS', cjs]]) {
  for (const criterion of ['<none>', 'A&B', '</p><img src="not-an-image">']) {
    test(`${name}: generated rule text stays literal in JSON and DOCX: ${criterion}`, async () => {
      const input = units([code('<p><em>MANUAL</em></p>', [
        { ruleOperatorAnd: true, rules: [{ method: 'MATCH', parameters: [criterion] }] }
      ])]);
      const json = JSON.parse(await (await api.CodebookGenerator.generateCodebook(input,
        { ...options, exportFormat: 'json' }, [])).text());
      const description = load(json[0].variables[0].codes[0].description);
      assert.ok(description.root().text().includes(criterion));
      assert.equal(description('img').length, 0, 'generated plain text cannot create markup');
      assert.equal(description('em').text(), 'MANUAL', 'authored rich text remains markup');
      const parts = await docxParts(await api.CodebookGenerator.generateCodebook(input,
        { ...options, exportFormat: 'docx' }, []));
      const $ = load(parts['word/document.xml'], { xml: true });
      assert.ok($('w\\:t').text().includes(criterion));
      assert.equal($('w\\:drawing').length, 0);
    });
  }

  for (const [mime, payload] of [['svg+xml', '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"/>'],
    ['webp', 'RIFF image'], ['avif', 'ftyp avif']]) {
    test(`${name}: image-only ${mime} instructions are retained by manual filtering`, () => {
      const html = `<img src="data:image/${mime};base64,${Buffer.from(payload).toString('base64')}">`;
      assert.equal(api.hasCodebookManualInstruction(html), true);
      const data = api.CodebookGenerator.getCodebookData(units([code(html)]),
        { ...options, hasOnlyManualCoding: true }, []);
      assert.equal(data[0].variables.length, 1);
      assert.equal(data[0].variables[0].codes[0].description, html);
    });
  }

  test(`${name}: unsupported Word image formats retain the variable and a visible error`, async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"/>').toString('base64');
    const input = units([code(`<img src="data:image/svg+xml;base64,${svg}">`)]);
    const parts = await docxParts(await api.CodebookGenerator.generateCodebook(input,
      { ...options, exportFormat: 'docx', hasOnlyManualCoding: true }, []));
    const $ = load(parts['word/document.xml'], { xml: true });
    assert.ok($('w\\:t').text().includes('V  V'));
    assert.ok($('w\\:t').text().includes('HTML konnte nicht verarbeitet werden.'));
    assert.equal($('w\\:drawing').length, 0);
  });

  for (const html of ['<p>&nbsp;&#8203;</p>', '<p><br></p>', '[[iqb-math:]]', '[[iqb-math:%20]]']) {
    test(`${name}: visually empty instructions do not select codes or add paragraphs: ${html}`, async () => {
      assert.equal(api.hasCodebookManualInstruction(html), false);
      const filtered = api.CodebookGenerator.getCodebookData(units([code(html)]),
        { ...options, hasOnlyManualCoding: true }, []);
      assert.equal(filtered[0].variables.length, 0);
      const baseline = await render(api, '<p>VISIBLE</p>');
      const actual = await render(api, '<p>VISIBLE</p>', html);
      assert.equal(actual('w\\:p').length, baseline('w\\:p').length);
    });
  }

  test(`${name}: an absent rule set keeps its existing empty-description behavior`, () => {
    const data = api.CodebookGenerator.getCodebookData(units([code()]), options, []);
    assert.equal(data[0].variables[0].codes[0].description, '');
  });

  test(`${name}: SIMPLE mode keeps empty rule sets without the EXTENDED no-rules placeholder`, () => {
    const html = '<p><br></p>';
    const data = api.CodebookGenerator.getCodebookData(units([
      code(html, [{ rules: [], ruleOperatorAnd: true }])
    ]), options, []);
    assert.equal(data[0].variables[0].codes[0].description, `<p></p>${html}`);
  });

  test(`${name}: explicit horizontal rules remain visible without text`, async () => {
    const $ = await render(api, '<hr>');
    assert.ok($('w\\:tr').find('w\\:pBdr').length > 0);
  });

  for (const latex of ['50\\%20', '\\text{\\&copy;}', '\\text{"quoted" < value}']) {
    test(`${name}: current and encoded legacy formulas preserve LaTeX exactly once: ${latex}`, async () => {
      const escaped = latex.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
      const current = await render(api, `<p><span class="iqb-math-formula" data-latex="${escaped}"></span></p>`);
      const legacy = await render(api, `<p>[[iqb-math:${encodeURIComponent(latex)}]]</p>`);
      assert.equal(current('m\\:oMath').length, 1);
      assert.equal(legacy('m\\:oMath').length, 1);
      assert.equal(current('m\\:oMath').toString(), legacy('m\\:oMath').toString());
      if (latex.includes('%20')) assert.ok(current('m\\:oMath').text().includes('%20'));
      if (latex.includes('&copy;')) assert.ok(current('m\\:oMath').text().includes('&copy;'));
    });
  }

  for (const latex of ['constructor', 'toString']) {
    test(`${name}: formula ${latex} does not collide with prototype properties`, async () => {
      const $ = await render(api, `<p><span class="iqb-math-formula" data-latex="${latex}"></span></p>`);
      assert.equal($('m\\:oMath').length, 1);
      assert.equal($('m\\:oMath').text(), latex);
    });
  }

  test(`${name}: formula cache remains bounded across exports and evicted formulas regenerate`, async () => {
    const formula = n => `<p><span class="iqb-math-formula" data-latex="x+${n}"></span></p>`;
    const count = 300;
    const first = await render(api, Array.from({ length: count }, (_, n) => formula(n)).join(''));
    assert.equal(first('m\\:oMath').length, count);
    assert.ok(api.CodebookDocxGenerator.ommlCache.size <= 256, 'long-lived exporters must retain bounded state');
    const next = await render(api, formula(0));
    assert.equal(next('m\\:oMath').text(), 'x+0');
    assert.ok(api.CodebookDocxGenerator.ommlCache.size <= 256);
  });

  test(`${name}: superscript and subscript apply to formula runs without contaminating the cache`, async () => {
    const $ = await render(api, '<p>BASE<sup><span class="iqb-math-formula" data-latex="x"></span></sup>' +
      '<sub><span class="iqb-math-formula" data-latex="x"></span></sub>' +
      '<span class="iqb-math-formula" data-latex="x"></span></p>');
    assert.deepEqual($('m\\:oMath').toArray().map(m => $(m).find('w\\:vertAlign').attr('w:val')),
      ['superscript', 'subscript', undefined]);
  });

  for (const [style, ratio] of [['width:20px', 2], ['height:10px', 2], ['width:20px;height:20px', 1]]) {
    test(`${name}: image dimensions respect authored size and intrinsic ratio: ${style}`, async () => {
      const $ = await render(api, `<img style="${style}" src="data:image/png;base64,${image}">`);
      assert.equal(Number($('wp\\:extent').attr('cx')) / Number($('wp\\:extent').attr('cy')), ratio);
    });
  }

  test(`${name}: array-shaped codes fail explicitly rather than producing incomplete exports`, () => {
    assert.throws(() => api.CodebookGenerator.getCodebookData(units([[]]), options, []),
      error => error.name === 'CodebookGenerationError' && error.message.includes('REGRESSION'));
  });
}
