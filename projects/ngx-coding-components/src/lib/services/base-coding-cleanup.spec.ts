/* SOLVER formulas deliberately use literal source tokens. */
/* eslint-disable no-template-curly-in-string */
import { CodingFactory } from '@iqb/responses/coding-factory';
import { VariableCodingData } from '@iqbspecs/coding-scheme/coding-scheme.interface';
import { getCodingDependents, getRemovableOrphanBaseCodings, isEmptyVariableCoding } from './base-coding-cleanup';
import { analyzeVariableIdentifiers } from './schemer-identifier-validation';

describe('safe base coding cleanup', () => {
  const variables = [{ id: 'current', alias: 'text_1' }];
  const empty = (): VariableCodingData => ({
    ...CodingFactory.createBaseCodingVariable('old-text', 'BASE_NO_VALUE'), alias: 'text_1'
  });

  (['BASE', 'BASE_NO_VALUE'] as const).forEach(sourceType => {
    (['RULES_ONLY', 'MANUAL_AND_RULES'] as const).forEach(codeModel => {
      it(`removes only the unused ${sourceType} default with ${codeModel}`, () => {
        const coding = { ...empty(), sourceType, codeModel };
        const before = JSON.stringify(coding);
        expect(isEmptyVariableCoding(coding)).toBeTrue();
        expect(getRemovableOrphanBaseCodings(variables, [coding])).toEqual(new Set([coding]));
        expect(analyzeVariableIdentifiers(variables, [coding]).hasProblems).toBeFalse();
        expect(JSON.stringify(coding)).toBe(before);
      });
    });
  });

  const customizations: Array<[string, Partial<VariableCodingData>]> = [
    ['label', { label: 'Keep this label' }],
    ['general instructions', { manualInstruction: '<p>Keep this instruction</p>' }],
    ['whitespace instructions', { manualInstruction: ' ' }],
    ['codes and scores', { codes: [{ id: 1, score: 0 }] }],
    ['manual model', { codeModel: 'MANUAL_ONLY' }],
    ['unspecified model', { codeModel: undefined }],
    ['processing', { processing: ['REPLAY_REQUIRED'] }],
    ['fragments', { fragmenting: '(.*)' }],
    ['sources', { deriveSources: ['source'] }],
    ['formula', { sourceParameters: { solverExpression: '1 + 1' } }],
    ['source processing', { sourceParameters: { processing: ['TO_NUMBER'] } }],
    ['unknown coding setting', JSON.parse('{"customSetting": true}')],
    ['unknown source setting', { sourceParameters: JSON.parse('{"customSetting": true}') }],
    ['malformed codes', JSON.parse('{"codes": {}}')],
    ['malformed instructions', JSON.parse('{"manualInstruction": false}')],
    ['malformed source settings', JSON.parse('{"sourceParameters": []}')]
  ];
  customizations.forEach(([name, settings]) => {
    it(`preserves ${name} and keeps its identifier conflict visible`, () => {
      const coding = { ...empty(), ...settings };
      expect(isEmptyVariableCoding(coding)).toBeFalse();
      expect(getRemovableOrphanBaseCodings(variables, [coding]).size).toBe(0);
      expect(analyzeVariableIdentifiers(variables, [coding]).hasDuplicateAlias).toBeTrue();
    });
  });

  [
    { deriveSources: ['old-text'] },
    { deriveSources: ['text_1'] },
    { sourceParameters: { solverExpression: '${text_1} + 1' } },
    { sourceParameters: { solverExpression: '${ old-text[0]:0:INC } + 1' } }
  ].forEach(references => {
    it(`preserves an empty source referenced by ${JSON.stringify(references)}`, () => {
      const source = empty();
      const dependent: VariableCodingData = {
        ...CodingFactory.createCodingVariable('derived'), sourceType: 'SOLVER', ...references
      };
      expect(getCodingDependents(source, [source, dependent])).toEqual([dependent]);
      expect(getRemovableOrphanBaseCodings(variables, [source, dependent]).size).toBe(0);
      expect(analyzeVariableIdentifiers(variables, [source, dependent]).hasDuplicateAlias).toBeTrue();
    });
  });

  it('preserves current, derived, ambiguous and hostless entries', () => {
    const coding = empty();
    expect(getRemovableOrphanBaseCodings([], [coding]).size).toBe(0);
    expect(getRemovableOrphanBaseCodings([{ id: 'OLD-TEXT' }], [coding]).size).toBe(0);
    expect(getRemovableOrphanBaseCodings(variables, [coding, { ...coding, id: 'OLD-TEXT' }]).size).toBe(0);
    expect(getRemovableOrphanBaseCodings(variables, [{ ...coding, sourceType: 'MANUAL' }]).size).toBe(0);
  });

  it('preserves every possible source of an ambiguous formula reference', () => {
    const first = empty();
    const second = { ...empty(), id: 'text_1', alias: 'other' };
    const dependent: VariableCodingData = {
      ...CodingFactory.createCodingVariable('derived'),
      sourceType: 'SOLVER',
      sourceParameters: { solverExpression: '${text_1} + 1' }
    };
    expect(getRemovableOrphanBaseCodings(variables, [first, second, dependent]).size).toBe(0);
  });
});
