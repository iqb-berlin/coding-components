import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import JSZip from 'jszip';
import { load } from 'cheerio';
import { CodebookGenerator, CodebookDocxGenerator, hasCodebookManualInstruction } from '../dist/ngx-coding-components/fesm2022/iqb-ngx-coding-components-codebook-generator.mjs';

const options = { exportFormat: 'json', missingsProfile: '', hasOnlyManualCoding: false,
  hasClosedVars: false, hasOnlyVarsWithCodes: true, hasDerivedVars: true,
  hasGeneralInstructions: true, codeLabelToUpper: false, showScore: true, hideItemVarRelation: false };
const code = (id, manualInstruction = '', type = 'FULL_CREDIT') => ({ id, label: `Code ${id}`, manualInstruction, type, score: 1, ruleSets: [], ruleSetOperatorAnd: true });
const variable = (id, codes, extra = {}) => ({ id, alias: id, label: id, sourceType: 'BASE', manualInstruction: '', codes, ...extra });
const unit = (variables, key = 'U') => ({ id: 1, key, name: 'Aufgabe', scheme: JSON.stringify({ version: '3.0', variableCodings: variables }), metadata: { items: [{ id: 'ITEM', variableId: 'V' }] } });
const data = (variables, extra = {}) => CodebookGenerator.getCodebookData([unit(variables)], { ...options, ...extra }, [])[0].variables;

for (const manual of [false, true]) for (const closed of [false, true]) for (const onlyCodes of [false, true]) {
  test(`selection manual=${manual} closed=${closed} onlyCodes=${onlyCodes}`, () => {
    const vars = [variable('M', [code(1, '<p>Bewerten</p>'), code(2)]), variable('C', [code(0, '', 'RESIDUAL_AUTO')]),
      variable('X', [code(1, 'Bewerten'), code(0, '', 'RESIDUAL_AUTO')]), variable('A', [code(1)]), variable('E', [])];
    const actual = data(vars, { hasOnlyManualCoding: manual, hasClosedVars: closed, hasOnlyVarsWithCodes: onlyCodes });
    const expected = manual && closed ? ['C', 'M', 'X'] : manual ? ['M', 'X'] : closed ? ['C', 'X'] : onlyCodes ? ['A', 'C', 'M', 'X'] : ['A', 'C', 'E', 'M', 'X'];
    assert.deepEqual(actual.map(v => v.id), expected);
    if (manual && !closed) assert.deepEqual(actual.map(v => v.codes.map(c => c.id)), [['1'], ['1']]);
  });
}

test('manual rich text handles empty HTML, invisible text, image and formula-only content', () => {
  for (const empty of ['', '  ', '<p>&nbsp;&#8203;</p>', '<p><br></p>', '<script>foo</script>', '<p>&#8288;</p>', '<p>&shy;</p>', '<p>&#65039;</p>']) assert.equal(hasCodebookManualInstruction(empty), false, empty);
  for (const nonempty of ['Text', '<p>&lt;</p>', '<span class="iqb-math-formula" data-latex="x^2"></span>', '<img src="data:image/png;base64,aGVsbG8=">', '[[iqb-math:x^2]]']) assert.equal(hasCodebookManualInstruction(nonempty), true, nonempty);
});

test('IDs, code zero, derived filtering, BASE_NO_VALUE and stable sorting', () => {
  const vars = [variable('Z', [code(0)], { alias: 'A' }), variable('B', [code(-1)]), variable('NO', [code(1)], { sourceType: 'BASE_NO_VALUE' }), variable('D', [code(1)], { sourceType: 'COPY_VALUE' })];
  const actual = data(vars, { hasDerivedVars: false });
  assert.deepEqual(actual.map(v => v.id), ['A', 'B']);
  assert.equal(actual[0].codes[0].id, '0');
});

test('invalid schemas fail with the unit key and absent schemes are allowed', () => {
  assert.throws(() => CodebookGenerator.getCodebookData([{ id: 1, key: 'BAD', name: '', scheme: '{' }], options, []), /BAD/);
  assert.deepEqual(CodebookGenerator.getCodebookData([{ id: 1, key: 'EMPTY', name: '' }], options, [])[0].variables, []);
});

test('JSON contract omits items and score when disabled; units sorted by key', async () => {
  const blob = await CodebookGenerator.generateCodebook([unit([variable('V', [code(0)])], 'Z'), unit([], 'A')], { ...options, showScore: false }, [{ code: 0, label: 'Missing', description: 'Leer' }]);
  const parsed = JSON.parse(await blob.text());
  assert.deepEqual(parsed.map(u => u.key), ['A', 'Z']);
  assert.equal('items' in parsed[1], false);
  assert.equal('score' in parsed[1].variables[0].codes[0], false);
  assert.equal(parsed[1].missings[0].code, 0);
});

async function document(description, extra = {}) {
  const units = [{ key: 'U', name: 'Aufgabe', variables: [{ id: 'V', label: 'Variable', sourceType: 'BASE', generalInstruction: '', codes: [{ id: '0', label: 'CODE ZERO', score: '7', description }] }],
    items: [{ id: 'ITEM', variableId: 'V' }], missings: [{ code: 0, label: 'MISSING ZERO', description: 'Leer' }] }];
  const blob = await CodebookDocxGenerator.generateDocx(units, { ...options, ...extra });
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  return { zip, xml: await zip.file('word/document.xml').async('string') };
}

test('DOCX keeps Studio headings, item relations, score column order and neutral footer', async () => {
  const { zip, xml } = await document('<p>INSTRUCTION</p>');
  assert.match(xml, /U  Aufgabe/); assert.match(xml, /V  Variable/); assert.match(xml, /Item\(s\): ITEM/);
  assert.match(xml, /0 MISSING ZERO/);
  assert.ok(xml.indexOf('>7<') < xml.indexOf('INSTRUCTION'));
  const footer = await zip.file('word/footer1.xml').async('string');
  assert.match(footer, /IQB Codebook/); assert.doesNotMatch(footer, /IQB-Studio|IQB-Kodierbox/);
});

for (const description of ['<p><span class="iqb-math-formula" data-latex="x^2"></span></p>', '<p>[[iqb-math:x^2]]</p>']) {
  test(`DOCX retains mathematical content ${description}`, async () => {
    const { xml } = await document(description);
    assert.match(xml, /<m:oMath/); assert.match(xml, /<m:jc m:val="left"/); assert.doesNotMatch(xml, /<undefined/);
  });
}

test('DOCX preserves image and rich text formatting', async () => {
  const image = 'iVBORw0KGgoAAAANSUhEUgAAACgAAAAUCAIAAABwJOjsAAAAJElEQVR4nGOQSDgwIIhh1OJRi0ctHrV41OJRi0ctHrV45FgMAHBlzy43YLJ+AAAAAElFTkSuQmCC';
  const { zip, xml } = await document(`<p><u>unter</u><s>durch</s><br>neu</p><img src="data:image/png;base64,${image}">`);
  assert.match(xml, /<w:u /); assert.match(xml, /<w:strike/); assert.match(xml, /<w:br/);
  assert.ok(Object.keys(zip.files).some(name => name.startsWith('word/media/')));
});

test('empty exports produce JSON array and an actual DOCX archive', async () => {
  assert.equal(await (await CodebookGenerator.generateCodebook([], options, [])).text(), '[]');
  const blob = await CodebookGenerator.generateCodebook([], { ...options, exportFormat: 'docx' }, []);
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  assert.ok(zip.file('word/document.xml'));
});

test('CommonJS and ESM backend entry points agree without Angular or browser globals', async () => {
  const require = createRequire(import.meta.url);
  const commonjs = require('../dist/ngx-coding-components/cjs/codebook-generator.cjs');
  const units = [unit([variable('V', [code(0, 'Manuell')])])];
  const a = await CodebookGenerator.generateCodebook(units, options, []);
  const b = await commonjs.CodebookGenerator.generateCodebook(units, options, []);
  assert.equal(await a.text(), await b.text());
});

test('plain instructions and whitespace around formatted text are not lost', async () => {
  const plain = await document('Bitte bewerten'); assert.match(plain.xml, /Bitte bewerten/);
  const { xml } = await document('<p>vor <strong>fett</strong> nach</p>');
  assert.match(xml, />vor </); assert.match(xml, /> nach</);
});

function descriptionParagraphs(xml) {
  const $ = load(xml, { xml: true });
  return $('w\\:tr').first().children('w\\:tc').last().find('w\\:p').toArray()
    .map(paragraph => $(paragraph).find('w\\:t').text());
}

for (const tag of ['ul', 'ol']) {
  test(`DOCX retains direct ${tag} list text and existing paragraph list items exactly once`, async () => {
    const { xml } = await document(`<${tag}><li>Erstes <strong>Kriterium</strong></li><li><p>Zweites Kriterium</p></li></${tag}>`);
    assert.deepEqual(descriptionParagraphs(xml), ['Erstes Kriterium', 'Zweites Kriterium']);
    const $ = load(xml, { xml: true });
    assert.equal($('w\\:numPr').length, 2);
    assert.equal($('w\\:r').filter((_, run) => $(run).find('w\\:t').text() === 'Kriterium').find('w\\:b').length, 1);
  });
}

test('DOCX keeps loose text and formatting before, between and after blocks in source order', async () => {
  const { xml } = await document('Vor <strong>fett</strong><p>Regel</p>Zwischen <em>kursiv</em><h2>Hinweis</h2>Danach');
  assert.deepEqual(descriptionParagraphs(xml), ['Vor fett', 'Regel', 'Zwischen kursiv', 'Hinweis', 'Danach']);
  const $ = load(xml, { xml: true });
  assert.equal($('w\\:r').filter((_, run) => $(run).find('w\\:t').text() === 'fett').find('w\\:b').length, 1);
  assert.equal($('w\\:r').filter((_, run) => $(run).find('w\\:t').text() === 'kursiv').find('w\\:i').length, 1);
});

test('DOCX keeps mixed and nested list contents without repeating paragraphs or images', async () => {
  const image = 'iVBORw0KGgoAAAANSUhEUgAAACgAAAAUCAIAAABwJOjsAAAAJElEQVR4nGOQSDgwIIhh1OJRi0ctHrV41OJRi0ctHrV45FgMAHBlzy43YLJ+AAAAAElFTkSuQmCC';
  const { xml, zip } = await document(`<ul><li>Vor<p>Absatz</p>Danach<ul><li>Unterpunkt [[iqb-math:x^2]]</li></ul><img src="data:image/png;base64,${image}"></li></ul>`);
  assert.deepEqual(descriptionParagraphs(xml), ['Vor', 'Absatz', 'Danach', 'Unterpunkt ', '']);
  const $ = load(xml, { xml: true });
  assert.equal($('w\\:drawing').length, 1);
  assert.equal($('m\\:oMath').length, 1);
  assert.equal(Object.keys(zip.files).filter(name => name.startsWith('word/media/') && !zip.files[name].dir).length, 1);
});

test('complete DOCX exports keep list instructions and plain instructions after generated rules in ESM and CJS', async () => {
  const require = createRequire(import.meta.url);
  const commonjs = require('../dist/ngx-coding-components/cjs/codebook-generator.cjs');
  for (const [instruction, ruleSets, expected] of [
    ['<ul><li>Erstes Kriterium</li><li>Zweites Kriterium</li></ul>', [], ['Erstes Kriterium', 'Zweites Kriterium']],
    ['Manuelle Instruktion', [{ rules: [{ method: 'MATCH', parameters: ['ABC'] }], ruleOperatorAnd: true }], ['ABC', 'Manuelle Instruktion']]
  ]) {
    const units = [unit([variable('V', [{ ...code(1, instruction), ruleSets }])])];
    let reference;
    for (const generator of [CodebookGenerator, commonjs.CodebookGenerator]) {
      const blob = await generator.generateCodebook(units, { ...options, exportFormat: 'docx', hasOnlyManualCoding: true, hasClosedVars: true }, []);
      const zip = await JSZip.loadAsync(await blob.arrayBuffer());
      const xml = await zip.file('word/document.xml').async('string');
      assert.deepEqual(descriptionParagraphs(xml), expected);
      if (reference) assert.equal(xml, reference);
      reference = xml;
    }
  }
});

test('escaped inequality formulas produce valid XML text in inline and block form', async () => {
  const { xml } = await document('<p>Prefix [[iqb-math:a%3Cb]] suffix</p>');
  assert.match(xml, /a&lt;b/); assert.doesNotMatch(xml, /<undefined|a<b<\/m:t>/);
  assert.doesNotMatch(xml, /<m:oMathPara>/);
});

test('incomplete codes are closed and general instructions alone are not manual', () => {
  const variables = [variable('I', [code(0, '', 'INTENDED_INCOMPLETE')]),
    variable('G', [code(1)], { manualInstruction: '<p>Allgemeiner Hinweis</p>' })];
  assert.deepEqual(data(variables, { hasClosedVars: true }).map(v => v.id), ['I']);
  assert.deepEqual(data(variables, { hasOnlyManualCoding: true }), []);
});

test('malformed variable and code collections produce a named export error', () => {
  for (const variables of [[null], [{ id: 'V', codes: {} }], [{ id: 'V', codes: [null] }]]) {
    assert.throws(() => CodebookGenerator.getCodebookData([unit(variables, 'INVALID')], options, []), /INVALID/);
  }
});

test('Studio reference preserves document, styles, numbering, settings and page footer XML', async () => {
  const { readFile } = await import('node:fs/promises');
  const units = [{ key: 'A', name: 'Referenz', variables: [{ id: 'V', label: 'Variable', sourceType: 'BASE',
    generalInstruction: '<p>Hinweis</p>', codes: [{ id: '1', label: 'RICHTIG', score: '1',
      description: '<p><strong>Text</strong></p><p>[[iqb-math:x^2]]</p>' }] }],
    missings: [{ code: 99, label: 'MISSING', description: 'Keine Antwort' }], items: [] }];
  const blob = await CodebookDocxGenerator.generateDocx(units, { ...options, exportFormat: 'docx', codeLabelToUpper: true, hideItemVarRelation: true });
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  for (const file of ['document.xml', 'styles.xml', 'numbering.xml', 'settings.xml', 'footer1.xml']) {
    const expected = await readFile(new URL(`./fixtures/studio-codebook/${file}`, import.meta.url), 'utf8');
    const actual = (await zip.file(`word/${file}`).async('string')).replace(new Date().toLocaleDateString(), '{{DATE}}');
    assert.equal(actual, expected, file);
  }
});

test('invisible-only instructions do not include variables in manual exports', () => {
  for (const instruction of ['<p>&#8288;</p>', '<p>&shy;</p>', '<p>&#65039;</p>']) {
    assert.deepEqual(data([variable('EMPTY', [code(1, instruction)])], { hasOnlyManualCoding: true }), []);
  }
});

test('DOCX retains nested marks and spaces between differently formatted runs', async () => {
  const { xml } = await document('<p><strong><em>BEWERTEN</em></strong> <u><s>Text</s></u> <sub><em>unten</em></sub> <sup><strong>oben</strong></sup></p>');
  const $ = (await import('cheerio')).load(xml, { xml: true });
  const runs = $('w\\:r').toArray();
  const findRun = text => runs.find(run => $(run).find('w\\:t').text() === text);
  assert.equal($(findRun('BEWERTEN')).find('w\\:b').length, 1);
  assert.equal($(findRun('BEWERTEN')).find('w\\:i').length, 1);
  assert.equal($(findRun('Text')).find('w\\:u').length, 1);
  assert.equal($(findRun('Text')).find('w\\:strike').length, 1);
  assert.equal($(findRun('unten')).find('w\\:vertAlign').attr('w:val'), 'subscript');
  assert.equal($(findRun('oben')).find('w\\:vertAlign').attr('w:val'), 'superscript');
  assert.match($('w\\:t').toArray().map(element => $(element).text()).join(''), /BEWERTEN Text unten oben/);
  const spaced = await document('<p><strong>vor</strong> <em>nach</em></p>');
  const text = (await import('cheerio')).load(spaced.xml, { xml: true });
  assert.match(text('w\\:t').toArray().map(element => text(element).text()).join(''), /vor nach/);
});

test('shared training filters combine with manual/closed and derived-variable selection', () => {
  const vars = [variable('TRAIN', [code(0, 'Bewerten')], { processing: ['CODER_TRAINING_REQUIRED'] }),
    variable('OTHER', [code(1, 'Bewerten')]), variable('CLOSED', [code(0, '', 'RESIDUAL_AUTO')], { processing: ['CODER_TRAINING_REQUIRED'] }),
    variable('DERIVED', [code(1, 'Bewerten')], { sourceType: 'COPY_VALUE', processing: ['CODER_TRAINING_REQUIRED'] })];
  assert.deepEqual(data(vars, { trainingRequirement: 'required', hasOnlyManualCoding: true, hasDerivedVars: false }).map(v => v.id), ['TRAIN']);
  assert.deepEqual(data(vars, { trainingRequirement: 'not-required', hasOnlyManualCoding: true }).map(v => v.id), ['OTHER']);
  assert.deepEqual(data(vars, { trainingRequirement: 'required', hasClosedVars: true }).map(v => v.id), ['CLOSED']);
  assert.deepEqual(data(vars, { trainingRequirement: 'all' }).map(v => v.id), data(vars).map(v => v.id));
});
