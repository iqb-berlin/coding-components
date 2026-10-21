/* SOLVER references are intentionally literal test data. */
/* eslint-disable no-template-curly-in-string */
import { CodingFactory } from '@iqb/responses/coding-factory';
import { VariableCodingData } from '@iqbspecs/coding-scheme/coding-scheme.interface';
import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';
import { getConflictingDerivedCodings, resolveDerivedCodingConflicts } from './derived-coding-conflict-resolution';

describe('Derived coding conflict resolution', () => {
  const variables = [{ id: 'new_mc', alias: '01', type: 'integer' }] as VariableInfo[];
  const oldRows = () => Array.from({ length: 5 }, (_, index) => ({
    ...CodingFactory.createCodingVariable(`old_row_${index}`),
    alias: `01${String.fromCharCode(97 + index)}`,
    codes: [{ id: 1, type: 'FULL_CREDIT', score: index + 1 }] as VariableCodingData['codes']
  }));
  const derived = (): VariableCodingData => ({
    ...CodingFactory.createCodingVariable('derived_01'),
    alias: '01',
    sourceType: 'SUM_SCORE',
    deriveSources: oldRows().map(row => row.id),
    label: 'Original total',
    manualInstruction: '<p>Keep all instructions</p>',
    processing: ['IGNORE_CASE'],
    codes: [{
      id: 1,
      type: 'FULL_CREDIT',
      score: 3,
      ruleSets: [{ rules: [{ method: 'NUMERIC_MATCH', parameters: ['5'] }] }]
    }]
  });
  const scheme = () => [...oldRows(), derived()];
  const rename = (alias = 'old_01') => [{ id: 'derived_01', action: 'RENAME' as const, alias }];
  const deletion = [{ id: 'derived_01', action: 'DELETE' as const }];

  it('finds the derived side of the original CMC-to-MC conflict', () => {
    const codings = scheme();
    expect(getConflictingDerivedCodings(variables, codings)).toEqual([codings[5]]);
  });

  it('renames only the derived alias and preserves every code, score, rule, source and instruction', () => {
    const codings = scheme();
    const before = structuredClone(codings);
    const hostBefore = structuredClone(variables);
    const result = resolveDerivedCodingConflicts(variables, codings, rename());
    expect(result.problems).toEqual([]);
    expect(result.variableCodings).toEqual([...before.slice(0, 5), { ...before[5], alias: 'old_01' }]);
    expect(codings).toEqual(before);
    expect(variables).toEqual(hostBefore);
    expect(result.variableCodings![5]).not.toBe(codings[5]);
  });

  it('deletes exactly the confirmed derived coding while retaining all five old row codings', () => {
    const codings = scheme();
    const before = structuredClone(codings);
    expect(resolveDerivedCodingConflicts(variables, codings, deletion).variableCodings).toBeNull();
    const result = resolveDerivedCodingConflicts(variables, codings, deletion, true);
    expect(result.variableCodings).toEqual(before.slice(0, 5));
    expect(codings).toEqual(before);
  });

  ['', '01', 'bad name', 'bad.name', 'ä', 'TAKEN', 'public_id'].forEach(alias => {
    it(`rejects the invalid or occupied alias ${JSON.stringify(alias)} without changing the scheme`, () => {
      const codings = [...scheme(), {
        ...CodingFactory.createCodingVariable('other'), alias: 'taken', manualInstruction: 'Keep existing work'
      }];
      const before = JSON.stringify(codings);
      const host = [...variables, { id: 'public_id', type: 'integer' } as VariableInfo];
      expect(resolveDerivedCodingConflicts(host, codings, rename(alias)).variableCodings).toBeNull();
      expect(JSON.stringify(codings)).toBe(before);
    });
  });

  it('cannot edit a base variable or a derived coding unrelated to the conflict', () => {
    const codings = [...scheme(), { ...derived(), id: 'other', alias: 'other' }];
    ['old_row_0', 'new_mc', 'other', 'missing'].forEach(id => {
      expect(resolveDerivedCodingConflicts(variables, codings, [{ id, action: 'DELETE' }], true)
        .variableCodings).toBeNull();
    });
    expect(resolveDerivedCodingConflicts(variables, codings, [...rename(), ...rename()]).variableCodings).toBeNull();
  });

  it('does not guess which coding to edit when technical IDs are ambiguous or shared with the host', () => {
    expect(getConflictingDerivedCodings(variables, [...scheme(), { ...derived(), id: 'DERIVED_01' }])).toEqual([]);
    expect(getConflictingDerivedCodings([{ ...variables[0], id: 'derived_01' }], scheme())).toEqual([]);
  });

  ['deriveSources', 'solverExpression'].forEach(referenceType => {
    it(`blocks deletion when a remaining coding references the derived variable through ${referenceType}`, () => {
      const dependent: VariableCodingData = {
        ...CodingFactory.createCodingVariable('dependent'),
        alias: 'dependent',
        sourceType: 'SOLVER',
        deriveSources: referenceType === 'deriveSources' ? ['derived_01'] : [],
        sourceParameters: { solverExpression: referenceType === 'solverExpression' ? '${01} + 1' : '', processing: [] }
      };
      const codings = [...scheme(), dependent];
      const result = resolveDerivedCodingConflicts(variables, codings, deletion, true);
      expect(result.variableCodings).toBeNull();
      expect(result.problems.join()).toContain('dependent');
      expect(codings).toHaveSize(7);
    });
  });

  it('preserves formula bindings, whitespace, fragment suffixes and technical source IDs when renaming', () => {
    const dependent: VariableCodingData = {
      ...CodingFactory.createCodingVariable('dependent'),
      alias: 'dependent',
      sourceType: 'SOLVER',
      deriveSources: ['derived_01', 'derived_01'],
      sourceParameters: { solverExpression: '${  01[2] : 0 : INC} + ${derived_01}', processing: [] }
    };
    const codings = [...scheme(), dependent];
    const before = structuredClone(codings);
    const result = resolveDerivedCodingConflicts(variables, codings, rename());
    expect(result.variableCodings![6]).toEqual({
      ...dependent,
      sourceParameters: { ...dependent.sourceParameters, solverExpression: '${  old_01[2] : 0 : INC} + ${derived_01}' }
    });
    expect(codings).toEqual(before);
  });

  it('keeps other formula sources when the new alias shadows a hidden technical ID', () => {
    const other = { ...CodingFactory.createCodingVariable('hidden'), alias: 'other_source' };
    const solver: VariableCodingData = {
      ...CodingFactory.createCodingVariable('solver'),
      alias: 'solver',
      sourceType: 'SOLVER',
      deriveSources: ['derived_01', 'hidden'],
      sourceParameters: { solverExpression: '${01} + ${hidden}', processing: [] }
    };
    const result = resolveDerivedCodingConflicts(variables, [...scheme(), other, solver], rename('hidden'));
    expect(result.variableCodings![7].sourceParameters!.solverExpression).toBe('${hidden} + ${other_source}');
    expect(result.variableCodings![7].deriveSources).toEqual(['derived_01', 'hidden']);
  });

  it('rejects an alias that would silently bind a previously missing formula source', () => {
    const solver: VariableCodingData = {
      ...CodingFactory.createCodingVariable('solver'),
      alias: 'solver',
      sourceType: 'SOLVER',
      deriveSources: ['missing'],
      sourceParameters: { solverExpression: '${missing}', processing: [] }
    };
    expect(resolveDerivedCodingConflicts(variables, [...scheme(), solver], rename('missing')).variableCodings)
      .toBeNull();
  });

  it('preserves a renamed formula source when the new alias belonged to a removable automatic base entry', () => {
    const empty = { ...CodingFactory.createCodingVariable('unused'), alias: 'old_01' };
    const solver: VariableCodingData = {
      ...CodingFactory.createCodingVariable('solver'),
      alias: 'solver',
      sourceType: 'SOLVER',
      deriveSources: ['derived_01'],
      sourceParameters: { solverExpression: '${01} + 1', processing: [] }
    };
    const codings = [empty, ...scheme(), solver];
    const result = resolveDerivedCodingConflicts(variables, codings, rename());
    expect(result.variableCodings!.find(coding => coding.id === 'solver')!.sourceParameters!.solverExpression)
      .toBe('${old_01} + 1');
    expect(result.variableCodings!.find(coding => coding.alias === 'old_01')!.id).toBe('derived_01');
    expect(result.variableCodings!.some(coding => coding.id === 'unused')).toBeFalse();
    expect(result.variableCodings!.filter(coding => coding.id.startsWith('old_row_'))).toEqual(oldRows());
  });

  it('can repair one derived conflict without discarding another unresolved conflict', () => {
    const host = [...variables, { id: 'new_mc_2', alias: '02', type: 'integer' } as VariableInfo];
    const codings = [...scheme(), { ...derived(), id: 'derived_02', alias: '02' }];
    const result = resolveDerivedCodingConflicts(host, codings, rename());
    expect(result.variableCodings![6]).toEqual(codings[6]);
    expect(result.variableCodings![5].alias).toBe('old_01');
  });
});
