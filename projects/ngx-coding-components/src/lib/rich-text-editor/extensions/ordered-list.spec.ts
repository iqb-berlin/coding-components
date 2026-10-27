import { Editor } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { ListItem } from '@tiptap/extension-list-item';
import { OrderedListExtension } from './ordered-list';

describe('Instruction list paste compatibility', () => {
  let editor: Editor;
  beforeEach(() => {
    editor = new Editor({ extensions: [Document, Paragraph, Text, ListItem, OrderedListExtension] });
  });
  afterEach(() => editor.destroy());

  ['3. Third\n4. Fourth', 'a. Alpha\nb. Beta'].forEach(text => {
    it(`keeps the literal labels when pasting ${text.split('\n')[0]}`, () => {
      const clipboardData = new DataTransfer();
      clipboardData.setData('text/plain', text);
      const event = new ClipboardEvent('paste', { clipboardData });

      expect(editor.view.pasteText(text, event)).toBeTrue();
      expect(editor.getText({ blockSeparator: '\n' })).toBe(text);
      expect(editor.getHTML()).not.toContain('<ol');
    });
  });
});
