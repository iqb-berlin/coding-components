import { OrderedList } from '@tiptap/extension-ordered-list';

const listStyleByType = new Map([
  ['1', 'decimal'], ['a', 'lower-latin'], ['A', 'upper-latin'], ['i', 'lower-roman'], ['I', 'upper-roman']
]);

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    orderedListExtension: {
      setOrderedListStyle: (newStyle: string) => ReturnType,
      setOrderedListFontSize: (fontSize: string) => ReturnType
    };
  }
}

export const OrderedListExtension = OrderedList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      listStyle: {
        default: 'upper-roman',
        parseHTML: element => element.style.listStyleType ||
          element.querySelector('li')?.style.listStyleType ||
          listStyleByType.get(element.getAttribute('type') || '') || '',
        renderHTML: attributes => ({ style: `list-style: ${attributes['listStyle']}` })
      },
      fontSize: {
        default: '20px',
        parseHTML: element => element.style.fontSize,
        renderHTML: attributes => ({ style: `font-size: ${attributes['fontSize']}` })
      }
    };
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setOrderedListStyle: (newStyle: string) => ({ commands }) => (
        commands.updateAttributes(this.name, { listStyle: newStyle })
      ),
      setOrderedListFontSize: (fontSize: string) => ({ commands }) => (
        commands.updateAttributes(this.name, { fontSize: fontSize })
      )
    };
  },

  addInputRules() {
    return [];
  },

  /** Keep pasted labels literal; Tiptap 3's auto-conversion loses numbering in this custom schema. */
  addProseMirrorPlugins() {
    return [];
  }
});
