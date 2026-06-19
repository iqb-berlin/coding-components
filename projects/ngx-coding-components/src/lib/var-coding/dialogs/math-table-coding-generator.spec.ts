import {
  createMathTableResultRule,
  createMathTableResultRulePattern,
  isMathTableVariableInfo,
  normaliseMathTableExpectedResult
} from './math-table-coding-generator';

describe('math-table-coding-generator', () => {
  const createMathTableResponseValue = (resultValues: string[]): string => JSON.stringify([
    {
      rowType: 'normal',
      cells: [
        { value: '1', isEditable: false },
        { value: '2', isEditable: false }
      ]
    },
    {
      rowType: 'result',
      cells: resultValues.map(value => ({ value, isEditable: true }))
    }
  ]);

  it('isMathTableVariableInfo should detect json math-table variables', () => {
    expect(isMathTableVariableInfo({
      id: 'v1',
      alias: 'V1',
      type: 'json',
      format: 'math-table',
      multiple: false,
      nullable: false,
      values: [],
      valuePositionLabels: []
    })).toBeTrue();

    expect(isMathTableVariableInfo({
      id: 'v1',
      alias: 'V1',
      type: 'string',
      format: '',
      multiple: false,
      nullable: false,
      values: [],
      valuePositionLabels: []
    })).toBeFalse();
  });

  it('normaliseMathTableExpectedResult should remove spaces and use math-table char replacements', () => {
    expect(normaliseMathTableExpectedResult(' - 12 / 3 * 4 ')).toBe('\u221212:3\u20224');
  });

  it('createMathTableResultRulePattern should match the result row value', () => {
    const pattern = createMathTableResultRulePattern('579');
    const responseValue = createMathTableResponseValue(['', '', '5', '7', '9']);

    expect(new RegExp(pattern).test(responseValue)).toBeTrue();
  });

  it('createMathTableResultRulePattern should rely on the current Aspect row property order', () => {
    const pattern = createMathTableResultRulePattern('579');
    const responseValue = JSON.stringify([
      {
        cells: ['5', '7', '9'].map(value => ({ value, isEditable: true })),
        rowType: 'result'
      }
    ]);

    expect(new RegExp(pattern).test(responseValue)).toBeFalse();
  });

  it('createMathTableResultRulePattern should not match a different result row value', () => {
    const pattern = createMathTableResultRulePattern('579');
    const responseValue = createMathTableResponseValue(['', '', '5', '7', '8']);

    expect(new RegExp(pattern).test(responseValue)).toBeFalse();
  });

  it('createMathTableResultRule should create a MATCH_REGEX rule', () => {
    const rule = createMathTableResultRule('579');

    expect(rule.method).toBe('MATCH_REGEX');
    expect(rule.parameters?.length).toBe(1);
  });
});
