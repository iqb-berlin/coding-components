// Supported inline marks shared by the coding-components instruction editor and
// Aspect's Tiptap editor. Subscript/superscript are mutually exclusive.
export function* editorMarkCases() {
  const marks = ['strong', 'em', 'u', 's'];
  for (let mask = 0; mask < 16; mask += 1) for (const vertical of ['', 'sub', 'sup']) {
    for (const reverse of [false, true]) for (const alignment of ['left', 'center', 'right', 'justify']) {
      const tags = marks.filter((_, bit) => mask & (1 << bit));
      if (vertical) tags.push(vertical);
      if (reverse) tags.reverse();
      const text = '10\u00a0kg; 20\u202fcm; Abstand  bleibt';
      const marked = tags.reduce((html, tag) => `<${tag}>${html}</${tag}>`, text);
      yield { id: `${mask}-${vertical || 'base'}-${reverse ? 'reverse' : 'forward'}-${alignment}`,
        html: `<p style="text-align:${alignment}">vor ${marked} nach</p>`, text, mask, vertical, alignment };
    }
  }
}
export function editorMarkUnits(html) {
  return [{ key: 'EDITOR', name: 'Synthetische Formatkombinationen', items: [], missings: [], variables: [{
    id: 'V', label: 'Formatkombination', sourceType: 'BASE', generalInstruction: html,
    codes: [{ id: '1', label: 'Code', score: '1', description: html }]
  }] }];
}
