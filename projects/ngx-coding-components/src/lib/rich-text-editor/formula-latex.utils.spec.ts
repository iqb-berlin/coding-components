import { normalizeFormulaLatex } from './formula-latex.utils';

describe('normalizeFormulaLatex', () => {
  it('should convert MathLive exponential e to KaTeX-compatible latex', () => {
    expect(normalizeFormulaLatex('\\exponentialE')).toBe('\\mathrm{e}');
  });

  it('should remove empty MathLive placeholders from limit expressions', () => {
    expect(normalizeFormulaLatex('\\lim_{\\placeholder{}} x = y')).toBe('\\lim x = y');
  });

  it('should keep placeholder content while removing the wrapper', () => {
    expect(normalizeFormulaLatex('\\placeholder[id]{n}')).toBe('n');
  });
});
