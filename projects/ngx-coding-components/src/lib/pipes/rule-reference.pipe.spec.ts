import { RuleReferencePipe } from './rule-reference.pipe';

describe('RuleReferencePipe', () => {
  let pipe: RuleReferencePipe;

  beforeEach(() => {
    pipe = new RuleReferencePipe();
  });

  it('should return 1-based index for non-negative numbers', () => {
    expect(pipe.transform(0)).toBe('1');
    expect(pipe.transform(4)).toBe('5');
  });

  it('should return "-" for negative numbers', () => {
    expect(pipe.transform(-1)).toBe('-');
  });

  it('should return special letters for SUM, LENGTH and ANY_OPEN', () => {
    expect(pipe.transform('SUM')).toBe('S');
    expect(pipe.transform('LENGTH')).toBe('L');
    expect(pipe.transform('ANY_OPEN')).toBe('O');
  });

  it('should return "-" for undefined and other values', () => {
    expect(pipe.transform(undefined)).toBe('-');
    expect(pipe.transform('ANY')).toBe('-');
  });
});
