import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { load } from 'cheerio';
import { CodebookDocxGenerator } from '../dist/ngx-coding-components/fesm2022/iqb-ngx-coding-components-codebook-generator.mjs';
import { defaults } from './fixtures/codebook-synthetic.mjs';
import { richFormatCases, aspectHtml } from './fixtures/codebook-rich-format-cases.mjs';
import { docxParts, partHashes } from './codebook-docx-test-utils.mjs';

const require = createRequire(import.meta.url);
const CommonJs = require('../dist/ngx-coding-components/cjs/codebook-generator.cjs').CodebookDocxGenerator;

for (const source of ['aspect', 'coding-components']) {
  for (const showScore of [false, true]) {
    test(`complete ${source} rich format matrix, score=${showScore}, ESM/CJS`, async () => {
      const cases = richFormatCases().filter(
        (entry) =>
          source === 'aspect' || !['inline-image', 'horizontal-rules', 'aspect-annotations'].includes(entry.group),
      );
      const units = [
        {
          key: 'FORMAT',
          name: 'Synthetic acceptance matrix',
          items: [],
          missings: [],
          variables: [
            {
              id: 'V',
              label: 'Formatting',
              sourceType: 'BASE',
              generalInstruction: '',
              codes: cases.map((entry, index) => ({
                id: String(index + 1),
                label: entry.group,
                score: '1',
                description: source === 'aspect' ? aspectHtml(entry.html) : entry.html,
              })),
            },
          ],
        },
      ];
      const options = { ...defaults, showScore };
      const parts = await docxParts(await CodebookDocxGenerator.generateDocx(units, options));
      const commonParts = await docxParts(await CommonJs.generateDocx(units, options));
      assert.deepEqual(partHashes(parts), partHashes(commonParts));
      const $ = load(parts['word/document.xml'], { xml: true });
      const paragraphs = new Map();
      $('w\\:p').each((_, paragraph) => {
        const id = $(paragraph)
          .find('w\\:t')
          .text()
          .match(/FMT\d{4}/)?.[0];
        if (id) paragraphs.set(id, paragraph);
      });
      assert.equal(paragraphs.size, cases.length);
      let markCases = 0;
      for (const entry of cases) {
        const p = $(paragraphs.get(entry.id));
        const expected = entry.expected;
        if (expected.align) {
          assert.equal(
            p.find('w\\:jc').attr('w:val'),
            expected.align === 'justify' ? 'both' : expected.align,
            entry.id,
          );
        }
        if (entry.group === 'marks-font-alignment') {
          const run = p.find('w\\:r').filter((_, node) => $(node).find('w\\:t').text().includes(entry.id));
          assert.equal(run.find('w\\:sz').attr('w:val'), String(Math.round(expected.size * 1.5)), entry.id);
          for (const [bit, tag] of ['b', 'i', 'u', 'strike'].entries()) {
            assert.equal(!!run.find(`w\\:${tag}`).length, !!(expected.mask & (1 << bit)), `${entry.id} ${tag}`);
          }
          const vertical = expected.vertical ? (expected.vertical === 'sup' ? 'superscript' : 'subscript') : undefined;
          assert.equal(run.find('w\\:vertAlign').attr('w:val'), vertical, entry.id);
          assert.ok(run.text().includes('10\u00a0kg; 20\u202fcm; Abstand  bleibt'), entry.id);
          markCases += 1;
        } else if (entry.group === 'format-boundaries') {
          const run = (text) => p.find('w\\:r').filter((_, node) => $(node).children('w\\:t').text() === text);
          assert.equal(run('FARBE').find('w\\:color').attr('w:val'), expected.hex, entry.id);
          assert.equal(run('FARBE').find('w\\:sz').attr('w:val'), '36', entry.id);
          assert.equal(run(' NORMAL ').find('w\\:color').attr('w:val'), '000000', entry.id);
          assert.equal(run(' ENDE').find('w\\:shd').attr('w:fill'), 'FFFFFF', entry.id);
        } else if (entry.group === 'paragraph-layout') {
          assert.equal(p.find('w\\:ind').attr('w:start'), String(expected.indent * 300), entry.id);
          assert.equal(p.find('w\\:ind').attr('w:hanging'), expected.hanging ? '300' : undefined, entry.id);
          assert.equal(p.find('w\\:spacing').attr('w:after'), String(expected.margin * 15), entry.id);
        } else if (entry.group === 'list-styles-depth') {
          const marker = {
            disc: '•',
            circle: '○',
            square: '▪',
            decimal: '1.',
            'lower-latin': 'a.',
            'upper-latin': 'A.',
            'lower-roman': 'i.',
            'upper-roman': 'I.',
            'lower-greek': 'α.',
          };
          assert.ok(p.find('w\\:t').text().startsWith(marker[expected.style]), entry.id);
          assert.equal(p.find('w\\:r > w\\:tab').length, 1, entry.id);
          assert.equal(p.find('w\\:ind').attr('w:start'), String(expected.depth * 600 + 100), entry.id);
        }
      }
      assert.equal(markCases, 2496);
      assert.equal($('m\\:oMath').length, 40);
      assert.equal($('w\\:drawing').length, source === 'aspect' ? 4 : 3);
      assert.equal($('wp\\:anchor').length, 2);
      assert.doesNotMatch(parts['word/document.xml'], /HTML konnte nicht verarbeitet werden|<undefined/);
    });
  }
}
