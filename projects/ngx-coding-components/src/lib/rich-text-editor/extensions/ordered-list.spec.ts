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

  const expectStableRoundtrips = () => {
    const content = editor.getJSON();
    const html = editor.getHTML();
    editor.commands.setContent(html, { emitUpdate: false });
    expect(editor.getHTML()).toBe(html);
    editor.commands.setContent(content, { emitUpdate: false });
    expect(editor.getJSON()).toEqual(content);
    expect(editor.getHTML()).toBe(html);
  };

  [3, 0, -2].forEach(start => {
    it(`preserves the HTML clipboard numbering start ${start}`, () => {
      expect(editor.view.pasteHTML(`<ol start="${start}"><li>First</li><li>Second</li></ol>`)).toBeTrue();

      expect(editor.view.dom.querySelector('ol')?.start).toBe(start);
      expectStableRoundtrips();
    });
  });

  [
    ['a', 'lower-latin'], ['A', 'upper-latin'], ['i', 'lower-roman'], ['I', 'upper-roman'], ['1', 'decimal']
  ].forEach(([type, listStyle]) => {
    it(`preserves HTML clipboard type ${type} and maps it to the editor list style`, () => {
      editor.view.pasteHTML(`<ol start="3" type="${type}"><li>First</li><li>Second</li></ol>`);

      expect(editor.view.dom.querySelector('ol')?.start).toBe(3);
      expect(editor.getJSON().content?.[0].attrs?.['listStyle']).toBe(listStyle);
      expect(editor.view.dom.querySelector('ol')?.style.listStyleType).toBe(listStyle);
      expectStableRoundtrips();
    });
  });

  it('keeps CSS list styles and font sizes ahead of a conflicting HTML type', () => {
    editor.view.pasteHTML('<ol start="3" type="a" style="list-style-type: upper-roman; font-size: 18px">' +
      '<li>First</li><li>Second</li></ol>');

    expect(editor.getJSON().content?.[0].attrs).toEqual(jasmine.objectContaining({
      start: 3, listStyle: 'upper-roman', fontSize: '18px'
    }));
    expectStableRoundtrips();
  });

  it('imports the list style from a first list item, as supplied by Google Docs', () => {
    editor.view.pasteHTML('<ol start="3"><li style="list-style-type: lower-alpha">First</li><li>Second</li></ol>');

    expect(editor.getJSON().content?.[0].attrs).toEqual(jasmine.objectContaining({
      start: 3, listStyle: 'lower-alpha'
    }));
    expectStableRoundtrips();
  });

  it('preserves independent starts and styles in nested lists', () => {
    editor.view.pasteHTML('<ol start="3" type="a"><li>Outer' +
      '<ol start="4" type="I"><li>Inner</li></ol></li><li>Next</li></ol>');

    const lists = Array.from(editor.view.dom.querySelectorAll('ol'));
    expect(lists.map(list => list.start)).toEqual([3, 4]);
    expect(lists.map(list => list.style.listStyleType)).toEqual(['lower-latin', 'upper-roman']);
    expectStableRoundtrips();
  });

  it('keeps a user-selected custom style when a typed list is saved and reopened', () => {
    editor.view.pasteHTML('<ol start="3" type="a"><li>First</li><li>Second</li></ol>');
    editor.commands.selectAll();
    editor.commands.setOrderedListStyle('lower-greek');

    expect(editor.view.dom.querySelector('ol')?.style.listStyleType).toBe('lower-greek');
    expectStableRoundtrips();
    expect(editor.view.dom.querySelector('ol')?.start).toBe(3);
  });

  it('reopens legacy JSON lists without changing their custom style', () => {
    editor.commands.setContent({
      type: 'doc',
      content: [{
        type: 'orderedList',
        attrs: { listStyle: 'lower-greek', fontSize: '18px' },
        content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Legacy' }] }] }]
      }]
    });

    expect(editor.view.dom.querySelector('ol')?.start).toBe(1);
    expect(editor.view.dom.querySelector('ol')?.style.listStyleType).toBe('lower-greek');
    expectStableRoundtrips();
  });
});
