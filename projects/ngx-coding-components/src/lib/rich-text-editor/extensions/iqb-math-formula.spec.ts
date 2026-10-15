import { Editor } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { Bold } from '@tiptap/extension-bold';
import IqbMathFormula from './iqb-math-formula';

describe('IqbMathFormula input interoperability', () => {
  let editor: Editor;
  beforeEach(() => {
    editor = new Editor({ extensions: [Document, Paragraph, Text, Bold, IqbMathFormula] });
  });
  afterEach(() => editor.destroy());

  [
    '<aspect-nodeview-math-formula formula="\\frac{1}{2}"><span>STALE</span></aspect-nodeview-math-formula>',
    '<span class="iqb-math-formula" data-latex="\\frac{1}{2}"><span>STALE</span></span>'
  ].forEach(tag => {
    it(`imports native LaTeX from ${tag.startsWith('<span') ? 'shared' : 'Aspect'} HTML and survives reopening`, () => {
      editor.commands.setContent(`<p>Vor <strong>${tag}</strong> Nach</p>`);
      const formula = editor.getJSON().content?.[0].content?.[1];
      expect(formula?.type).toBe('iqbMathFormula');
      expect(formula?.attrs?.['latex']).toBe('\\frac{1}{2}');
      expect(formula?.marks).toEqual([{ type: 'bold' }]);
      expect(editor.getHTML()).not.toContain('STALE');
      const html = editor.getHTML();
      editor.commands.setContent(html);
      expect(editor.getHTML()).toBe(html);
    });
  });
});
