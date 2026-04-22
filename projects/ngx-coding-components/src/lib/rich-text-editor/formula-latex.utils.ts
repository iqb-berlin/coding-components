const PLACEHOLDER_REGEX = /\\placeholder(?:\[[^\]]*])?\{([^{}]*)}/g;
const EMPTY_SCRIPT_REGEX = /([_^])\{\s*}/g;
const EXPONENTIAL_E_REGEX = /\\exponentialE\b/g;

export const normalizeFormulaLatex = (latex: string): string => latex
  .trim()
  .replace(PLACEHOLDER_REGEX, '$1')
  .replace(EMPTY_SCRIPT_REGEX, '')
  .replace(EXPONENTIAL_E_REGEX, '\\mathrm{e}');
