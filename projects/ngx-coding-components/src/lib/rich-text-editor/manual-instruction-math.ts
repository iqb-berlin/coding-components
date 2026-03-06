import katex from 'katex';

const FORMULA_TOKEN_REGEX = /\[\[iqb-math:([\s\S]*?)\]\]/g;

const renderFormula = (latex: string): string => {
  const formula = latex.trim();
  if (!formula) return '';
  return katex.renderToString(formula, {
    output: 'mathml',
    throwOnError: false,
    strict: 'ignore'
  });
};

const decodeTokenFormula = (encodedFormula: string): string => {
  try {
    return decodeURIComponent(encodedFormula);
  } catch {
    return encodedFormula;
  }
};

export const renderManualInstructionMath = (html: string): string => {
  if (!html) return html;

  const withTokensRendered = html.replace(
    FORMULA_TOKEN_REGEX,
    (_, encodedFormula: string) => {
      const latex = decodeTokenFormula(encodedFormula);
      const escapedLatex = latex.replace(/"/g, '&quot;');
      return `<span class="iqb-math-formula" data-latex="${escapedLatex}">${renderFormula(latex)}</span>`;
    }
  );

  const container = document.createElement('div');
  container.innerHTML = withTokensRendered;

  container.querySelectorAll('span.iqb-math-formula[data-latex]').forEach(node => {
    const latex = node.getAttribute('data-latex') || '';
    node.innerHTML = renderFormula(latex);
  });

  return container.innerHTML;
};
