import { image } from './codebook-synthetic.mjs';
export const fontSizes = [8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 36];
export const alignments = ['left', 'center', 'right', 'justify'];
export const listStyles = [
  'disc',
  'circle',
  'square',
  'decimal',
  'lower-latin',
  'upper-latin',
  'lower-roman',
  'upper-roman',
  'lower-greek',
];
const attribute = (value) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
export function richFormatCases() {
  const cases = [];
  let index = 0;
  const add = (group, html, expected = {}) => {
    const id = `FMT${String(++index).padStart(4, '0')}`;
    cases.push({ id, group, html: html.replaceAll('CASE', id), expected });
  };
  for (let mask = 0; mask < 16; mask++)
    for (const vertical of ['', 'sub', 'sup'])
      for (const align of alignments)
        for (const size of fontSizes) {
          const tags = ['strong', 'em', 'u', 's'].filter((_, bit) => mask & (1 << bit));
          if (vertical) tags.push(vertical);
          const text = 'CASE 10\u00a0kg; 20\u202fcm; Abstand  bleibt';
          const marked = tags.reduce((s, t) => `<${t}>${s}</${t}>`, text);
          add(
            'marks-font-alignment',
            `<p style="text-align:${align}"><span style="font-size:${size}px">${marked}</span></p>`,
            { mask, vertical, align, size },
          );
        }
  for (const [value, hex] of [
    ['#234567', '234567'],
    ['rgb(255, 0, 0)', 'FF0000'],
    ['blue', '0000FF'],
    ['#0a3', '00AA33'],
  ])
    for (const align of alignments) {
      add(
        'format-boundaries',
        `<p style="text-align:${align}">CASE VOR <span style="color:${value};font-size:24px"><strong><em>FARBE</em></strong></span> NORMAL <mark style="background-color:#ffff00">MARK</mark> ENDE</p>`,
        { hex, align },
      );
    }
  for (const style of listStyles)
    for (let depth = 1; depth <= 5; depth++) {
      const tag = ['disc', 'circle', 'square'].includes(style) ? 'ul' : 'ol';
      let html = '<p>CASE LISTE</p>';
      for (let d = 0; d < depth; d++) html = `<${tag} style="list-style:${style}"><li>${html}</li></${tag}>`;
      add('list-styles-depth', html, { style, depth });
    }
  for (const align of alignments)
    for (const margin of [0, 10, 20])
      for (let indent = 0; indent <= 4; indent++)
        for (const hanging of [false, true]) {
          add(
            'paragraph-layout',
            `<p indent="${indent}" indentsize="20" style="text-align:${align};padding-left:${indent * 20}px;text-indent:${hanging ? -20 : 0}px;margin-top:0px;margin-bottom:${margin}px">CASE ABSATZ</p>`,
            { align, margin, indent, hanging },
          );
        }
  for (const level of [1, 2, 3, 4])
    for (const align of alignments)
      add('headings', `<h${level} style="text-align:${align}">CASE UEBERSCHRIFT</h${level}>`, { level, align });
  for (const float of ['none', 'left', 'right'])
    add(
      'block-images',
      `<p>CASE VOR BILD</p><img src="data:image/png;base64,${image}" style="${float === 'none' ? '' : `float:${float};margin-${float === 'left' ? 'right' : 'left'}:10px;`}"><p>NACH BILD</p>`,
      { float },
    );
  add(
    'inline-image',
    `<p>CASE VOR<img src="data:image/png;base64,${image}" style="display:inline-block;height:1em;vertical-align:middle">NACH</p>`,
  );
  for (const latex of [
    'x^2',
    '\\frac{1}{2}',
    '\\sqrt{x}',
    'a<b',
    '\\sum_{i=1}^{3}i',
    '\\begin{pmatrix}1&2\\\\3&4\\end{pmatrix}',
    '\\overline{S\\cap M}',
    '\\left\\{x\\right\\}',
    '\\text{10 kg}',
    'x_{1}+x^{2}',
  ])
    for (const align of alignments) {
      add(
        'formula',
        `<p style="text-align:${align}">CASE <span class="iqb-math-formula" data-latex="${attribute(latex)}"></span> DANACH</p>`,
        { latex, align },
      );
    }
  add(
    'linebreaks-specials',
    '<p>CASE 10&nbsp;kg;20&#8239;cm;<strong>FETT</strong> <em>KURSIV</em><br>ZEILE – ‑ ‘ ’ ‚ „ “ ” ‹ › « » µ ç Ç</p><p></p><p>ABSATZ</p>',
  );
  add(
    'blockquote',
    '<blockquote><p>CASE ZITAT <strong>FETT</strong></p><blockquote><p>VERSCHACHTELT</p></blockquote></blockquote>',
  );
  add(
    'horizontal-rules',
    '<p>CASE VOR</p><hr><p>MITTE</p><hr short="true" style="width:20%;margin-left:0"><p>NACH</p>',
  );
  return cases;
}
export function aspectHtml(html) {
  return html.replace(
    /<span class="iqb-math-formula" data-latex="([^"]+)"><\/span>/g,
    (_, latex) => `<aspect-nodeview-math-formula formula="${latex}" formulaHTML=""></aspect-nodeview-math-formula>`,
  );
}
