import { CodingSchemeFactory, CodingSchemeProblem } from '@iqb/responses';
import { VariableCodingData } from '@iqbspecs/coding-scheme/coding-scheme.interface';
import {
  CYCLIC_DERIVATION_PROBLEM_TYPE,
  getCyclicDerivationProblems,
  validateCodingScheme
} from './coding-scheme-validation';

describe('coding scheme validation', () => {
  const derivedCoding = (
    id: string,
    deriveSources: string[],
    alias?: string
  ): VariableCodingData => ({
    id,
    alias,
    sourceType: 'SUM_SCORE',
    deriveSources
  } as VariableCodingData);

  it('should append cyclic derivation problems to factory validation problems', () => {
    const existingProblems: CodingSchemeProblem[] = [
      {
        type: 'SOURCE_MISSING',
        breaking: true,
        variableId: 'missing',
        variableLabel: ''
      }
    ];
    spyOn(CodingSchemeFactory, 'validate').and.returnValue(existingProblems);

    const problems = validateCodingScheme([], [
      derivedCoding('A', ['A'], 'AliasA')
    ]);

    expect(problems).toEqual([
      ...existingProblems,
      {
        type: CYCLIC_DERIVATION_PROBLEM_TYPE,
        breaking: true,
        variableId: 'AliasA',
        variableLabel: ''
      }
    ]);
  });

  it('should detect direct cyclic derivations', () => {
    const problems = getCyclicDerivationProblems([
      derivedCoding('A', ['A'])
    ]);

    expect(problems).toEqual([
      {
        type: CYCLIC_DERIVATION_PROBLEM_TYPE,
        breaking: true,
        variableId: 'A',
        variableLabel: ''
      }
    ]);
  });

  it('should detect all variables in an indirect cyclic derivation', () => {
    const problems = getCyclicDerivationProblems([
      { id: 'base', sourceType: 'BASE' } as VariableCodingData,
      derivedCoding('A', ['B']),
      derivedCoding('B', ['C']),
      derivedCoding('C', ['A']),
      derivedCoding('D', ['A'])
    ]);

    expect(problems.map(problem => problem.variableId)).toEqual([
      'A',
      'B',
      'C'
    ]);
    expect(problems.every(problem => problem.breaking)).toBeTrue();
    expect(problems.every(
      problem => problem.type === CYCLIC_DERIVATION_PROBLEM_TYPE
    )).toBeTrue();
  });

  it('should resolve unique aliases in derivation sources', () => {
    const problems = getCyclicDerivationProblems([
      derivedCoding('idA', ['AliasB'], 'AliasA'),
      derivedCoding('idB', ['AliasA'], 'AliasB')
    ]);

    expect(problems.map(problem => problem.variableId)).toEqual([
      'AliasA',
      'AliasB'
    ]);
  });

  it('should not report acyclic derivations', () => {
    const problems = getCyclicDerivationProblems([
      { id: 'base', sourceType: 'BASE' } as VariableCodingData,
      derivedCoding('A', ['base']),
      derivedCoding('B', ['A'])
    ]);

    expect(problems).toEqual([]);
  });
});
