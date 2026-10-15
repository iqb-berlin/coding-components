import { Paragraph } from '@tiptap/extension-paragraph';
import { Command } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    setMargin: {
      setMargin: (newMargin: number) => ReturnType;
    };
  }
}

export const ParagraphExtension = Paragraph.extend({
  addAttributes() {
    return {
      margin: {
        default: 0,
        parseHTML: element => Number(element.style.marginBottom.slice(0, -2)),
        renderHTML: attributes => ({
          style: `margin-bottom: ${attributes['margin']}px; margin-top: 0;min-height: 1em;`
        })
      }
    };
  },

  addCommands() {
    const { name } = this;

    const applyMargin: (newMargin: number) => () => Command =
      newMargin => () => ({ tr, state, dispatch }) => {
        const { selection } = state;
        tr.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
          // Text nodes cannot receive node markup; only this paragraph owns margin.
          if (node.type.name !== name) return;
          tr.setNodeMarkup(pos, node.type, { ...node.attrs, margin: newMargin }, node.marks);
        });
        dispatch?.(tr);
        return true;
      };

    return {
      setMargin: (newMargin: number) => applyMargin(newMargin)()
    };
  }
});
