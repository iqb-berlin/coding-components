import { Editor } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { TextStyle, Color } from '@tiptap/extension-text-style';
import { FontSize } from './font-size';

describe('Instruction font size with Tiptap 3', () => {
  let editor: Editor;
  beforeEach(() => {
    editor = new Editor({
      extensions: [Document, Paragraph, Text, TextStyle, Color, FontSize],
      content: '<p>Instruction</p>'
    });
    editor.commands.selectAll();
    editor.commands.setColor('red');
  });
  afterEach(() => editor.destroy());

  it('retains the existing 20px default on styled instruction text', () => {
    expect(editor.getAttributes('textStyle')['fontSize']).toBe('20px');
  });

  it('uses the built-in set and unset commands without removing other styles', () => {
    editor.commands.setFontSize('18px');
    expect(editor.getAttributes('textStyle')['fontSize']).toBe('18px');
    const stored = editor.getHTML();
    editor.commands.setContent(stored);
    editor.commands.selectAll();
    expect(editor.getAttributes('textStyle')['fontSize']).toBe('18px');

    editor.commands.unsetFontSize();
    expect(editor.getAttributes('textStyle')['fontSize']).toBeNull();
    expect(editor.getAttributes('textStyle')['color']).toBe('red');
  });
});
