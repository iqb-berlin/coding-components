import assert from 'node:assert/strict';
import { test } from 'node:test';
import { load } from 'cheerio';
import {
  CodebookDocxGenerator,
  CodebookGenerator,
  hasCodebookManualInstruction,
} from '../dist/ngx-coding-components/fesm2022/iqb-ngx-coding-components-codebook-generator.mjs';
import { defaults, image } from './fixtures/codebook-synthetic.mjs';
import { docxParts } from './codebook-docx-test-utils.mjs';
async function render(html) {
  const parts = await docxParts(
    await CodebookDocxGenerator.generateDocx(
      [
        {
          key: 'U',
          name: 'Formatierung',
          items: [],
          missings: [],
          variables: [
            {
              id: 'V',
              label: 'Instruktion',
              sourceType: 'BASE',
              generalInstruction: '',
              codes: [{ id: '1', label: 'Code', score: '1', description: html }],
            },
          ],
        },
      ],
      defaults,
    ),
  );
  return load(parts['word/document.xml'], { xml: true });
}
const runs = ($, text) =>
  $('w\\:r')
    .toArray()
    .filter((r) => $(r).children('w\\:t').text() === text);
for (const start of [0, 7]) {
  test(`ordered decimal lists retain their explicit start ${start}`, async () => {
    const $ = await render(`<ol start="${start}"><li><p>ONE</p></li><li><p>TWO</p></li></ol>`);
    assert.ok($(runs($, 'ONE')[0]).closest('w\\:p').find('w\\:t').text().startsWith(`${start}.`));
    assert.ok($(runs($, 'TWO')[0]).closest('w\\:p').find('w\\:t').text().startsWith(`${start + 1}.`));
  });
}
for (const [command, position] of [['overline', 'top'], ['underline', 'bot']]) {
  test(`wide ${command} covers the full expression at the correct position`, async () => {
    const $ = await render(`<p>[[iqb-math:\\${command}{S\\cap M}]]</p>`);
    assert.equal($('m\\:barPr m\\:pos').attr('m:val'), position);
    assert.equal($('m\\:bar > m\\:e').text(), 'S∩M');
    assert.equal($('m\\:acc').length, 0);
  });
}
test('nested over/underlines keep both positions and a narrow bar accent remains an accent', async () => {
  const $ = await render('<p>[[iqb-math:\\overline{\\underline{S\\cap M}}]]</p><p>[[iqb-math:\\bar{x}]]</p>');
  assert.deepEqual($('m\\:barPr m\\:pos').toArray().map(node => $(node).attr('m:val')), ['top', 'bot']);
  assert.equal($('m\\:accPr m\\:chr').attr('m:val'), 'ˉ');
});
for (const [latex, structure] of [['\\frac{1}{2}', 'f'], ['\\sqrt{x}', 'rad'],
  ['\\sum_{i=1}^{3}i', 'nary'], ['\\begin{pmatrix}1&2\\\\3&4\\end{pmatrix}', 'm']]) {
  test(`compound math ${structure} inherits size and color for its control symbols`, async () => {
    const html = `<p><span style="font-size:36px;color:#ff0000"><strong>` +
      `<aspect-nodeview-math-formula formula="${latex.replaceAll('&', '&amp;')}"></aspect-nodeview-math-formula>` +
      '</strong></span></p>';
    const $ = await render(html);
    const control = $(`m\\:${structure}Pr > m\\:ctrlPr > w\\:rPr`);
    assert.equal(control.find('w\\:sz').attr('w:val'), '54');
    assert.equal(control.find('w\\:color').attr('w:val'), 'FF0000');
    assert.equal(control.find('w\\:b').length, 1);
  });
}
test('surrounding font size, color and marks also apply to native Aspect formulas', async () => {
  const $ = await render('<p>Vor <span style="font-size:36px;color:#ff0000"><strong><u>' +
    '<aspect-nodeview-math-formula formula="x^2"></aspect-nodeview-math-formula>' +
    '</u></strong></span> Nach</p><p>[[iqb-math:x^2]]</p>');
  const math = $('m\\:oMath');
  math.first().find('m\\:r').each((_, run) => {
    assert.equal($(run).find('w\\:sz').attr('w:val'), '54');
    assert.equal($(run).find('w\\:color').attr('w:val'), 'FF0000');
    assert.equal($(run).find('w\\:b').length, 1);
    assert.equal($(run).find('w\\:u').attr('w:val'), 'single');
  });
  assert.equal(math.last().find('w\\:sz,w\\:color,w\\:b,w\\:u').length, 0, 'unstyled math must not inherit cached marks');
});

test('Aspect tooltip text and visible anchor highlight survive static export', async () => {
  const $ = await render('<p><tooltip data-tooltip-text="Hinweis">SICHTBAR</tooltip>' +
    '<aspect-anchor style="background-color:#dccce6" data-anchor-id="a"><em>BEREICH</em></aspect-anchor></p>');
  assert.equal($(runs($, 'SICHTBAR')[0]).find('w\\:t').text(), 'SICHTBAR');
  assert.equal($(runs($, 'BEREICH')[0]).find('w\\:shd').attr('w:fill'), 'DCCCE6');
  assert.equal($(runs($, 'BEREICH')[0]).find('w\\:i').length, 1);
});
test('inline color, size and highlight stay inside their authored text boundaries', async () => {
  const $ = await render(
    '<p>Vor <span style="color:rgb(255,0,0);font-size:24px">ROT</span> Schwarz <mark style="background-color:#00ff00">GRUEN</mark> Ende</p>',
  );
  const r = (t) => $(runs($, t)[0]);
  assert.equal(r('Vor ').find('w\\:sz').attr('w:val'), '20');
  assert.equal(r('Vor ').find('w\\:color').attr('w:val'), '000000');
  assert.equal(r('ROT').find('w\\:sz').attr('w:val'), '36');
  assert.equal(r('ROT').find('w\\:color').attr('w:val'), 'FF0000');
  assert.equal(r('GRUEN').find('w\\:shd').attr('w:fill'), '00FF00');
  assert.equal(r(' Ende').find('w\\:shd').attr('w:fill'), 'FFFFFF');
});
for (const [size, halfPoints] of [
  ['8px', 12],
  ['18px', 27],
  ['24px', 36],
  ['36px', 54],
  ['18pt', 36],
])
  test(`font size ${size} uses Word half-points`, async () => {
    const $ = await render(`<p><span style="font-size:${size}">SIZE</span></p>`);
    assert.equal($(runs($, 'SIZE')[0]).find('w\\:sz').attr('w:val'), String(halfPoints));
  });
test('paragraph spacing, indent and hanging indent survive editor serialization', async () => {
  const $ = await render('<p style="padding-left:40px;text-indent:-20px;margin-top:0px;margin-bottom:10px">INDENT</p>');
  const p = $(runs($, 'INDENT')[0]).closest('w\\:p');
  assert.equal(p.find('w\\:ind').attr('w:start'), '600');
  assert.equal(p.find('w\\:ind').attr('w:hanging'), '300');
  assert.equal(p.find('w\\:spacing').attr('w:before'), '0');
  assert.equal(p.find('w\\:spacing').attr('w:after'), '150');
});
for (const [style, marker] of [
  ['decimal', '1.'],
  ['lower-latin', 'a.'],
  ['upper-latin', 'A.'],
  ['lower-roman', 'i.'],
  ['upper-roman', 'I.'],
  ['lower-greek', 'α.'],
  ['disc', '•'],
  ['circle', '○'],
  ['square', '▪'],
])
  test(`authored list style ${style} is retained`, async () => {
    const tag = ['disc', 'circle', 'square'].includes(style) ? 'ul' : 'ol';
    const $ = await render(`<${tag} style="list-style:${style}"><li><p>ONE</p></li><li><p>TWO</p></li></${tag}>`);
    const p = $(runs($, 'ONE')[0]).closest('w\\:p');
    assert.ok(p.text().startsWith(marker), p.text());
  });
test('inline image stays between text runs, without duplicate paragraph image', async () => {
  const $ = await render(
    `<p>vor<img style="display:inline-block;height:1em;vertical-align:middle" src="data:image/png;base64,${image}">nach</p>`,
  );
  const p = $(runs($, 'vor')[0]).closest('w\\:p');
  assert.equal(p.find('w\\:drawing').length, 1);
  assert.equal($('w\\:drawing').length, 1);
  assert.equal(p.find('w\\:t').text(), 'vornach');
});
for (const side of ['left', 'right'])
  test(`block image float ${side} is retained in Word`, async () => {
    const $ = await render(
      `<img style="float:${side};margin-${side === 'left' ? 'right' : 'left'}:10px" src="data:image/png;base64,${image}"><p>Daneben</p>`,
    );
    assert.equal($('wp\\:anchor').length, 1);
    assert.equal($('wp\\:positionH wp\\:align').text(), side);
    assert.equal($('wp\\:wrapSquare').length, 1);
  });
test('Aspect formula renders from LaTeX once instead of frozen MathLive fragments', async () => {
  const $ = await render(
    '<p>vor<aspect-nodeview-math-formula formula="x^2" formulahtml="ignored"><span>STALE</span></aspect-nodeview-math-formula>nach</p>',
  );
  assert.equal($('m\\:oMath').length, 1);
  assert.ok(!$('w\\:t').text().includes('STALE'));
});
test('math-only paragraph respects authored center alignment', async () => {
  const $ = await render('<p style="text-align:center">[[iqb-math:x^2]]</p>');
  assert.equal($('m\\:jc').attr('m:val'), 'center');
});

test('formula-only Aspect instructions survive the real manual-code filter', async () => {
  const html = '<aspect-nodeview-math-formula formula="x^2"></aspect-nodeview-math-formula>';
  assert.equal(hasCodebookManualInstruction(html), true);
  const raw = [
    {
      key: 'A',
      name: 'Aspect',
      scheme: JSON.stringify({
        version: '3.4',
        variableCodings: [
          {
            id: 'V',
            sourceType: 'BASE',
            manualInstruction: '',
            codes: [{ id: 1, type: 'FULL_CREDIT', label: 'Code', score: 1, manualInstruction: html, ruleSets: [] }],
          },
        ],
      }),
    },
  ];
  const data = CodebookGenerator.getCodebookData(raw, defaults, []);
  assert.equal(data[0].variables.length, 1);
  assert.equal(data[0].variables[0].codes.length, 1);
});
test('newlines in a LaTeX attribute do not become HTML break tags', async () => {
  const $ = await render(
    '<p><span class="iqb-math-formula" data-latex="\\begin{matrix}1&amp;2\\\\\n3&amp;4\\end{matrix}"></span></p>',
  );
  assert.equal($('m\\:oMath').length, 1);
  assert.equal($('m\\:m').length, 1);
  assert.ok(!$.root().text().includes('br'));
});
