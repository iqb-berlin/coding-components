import { mergeAttributes, Node } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import katex from 'katex';

const renderFormula = (latex: string): string => katex.renderToString(latex, {
  output: 'mathml',
  throwOnError: false,
  strict: 'ignore'
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    iqbMathFormula: {
      insertIqbMathFormula: (latex: string) => ReturnType;
    };
  }
}

const IqbMathFormula = Node.create({
  name: 'iqbMathFormula',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addOptions() {
    return {
      onFormulaClick: () => {}
    };
  },

  addAttributes() {
    return {
      latex: {
        default: '',
        parseHTML: element => element.getAttribute('data-latex') || ''
      }
    };
  },

  parseHTML() {
    return [{ tag: 'span.iqb-math-formula[data-latex]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const latex = (HTMLAttributes['latex'] || '').toString();
    const attributesWithoutLatex = { ...HTMLAttributes };
    delete attributesWithoutLatex['latex'];
    const content = document.createElement('span');
    content.innerHTML = renderFormula(latex);
    return ['span',
      mergeAttributes(attributesWithoutLatex, {
        class: 'iqb-math-formula',
        'data-latex': latex
      }),
      content
    ];
  },

  addCommands() {
    return {
      insertIqbMathFormula: latex => ({ commands }) => commands.insertContent({
        type: this.name,
        attrs: {
          latex: latex.trim()
        }
      })
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleClickOn: (_view, _pos, node, nodePos) => {
            if (node.type.name !== this.name) {
              return false;
            }
            this.options.onFormulaClick(node.attrs['latex'] || '', nodePos);
            return true;
          }
        }
      })
    ];
  }
});

export default IqbMathFormula;
