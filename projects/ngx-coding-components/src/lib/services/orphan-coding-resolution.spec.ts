/* SOLVER formulas deliberately contain literal placeholder tokens. */
/* eslint-disable no-template-curly-in-string */
import { CodingFactory } from '@iqb/responses/coding-factory';
import { CodingSchemeFactory } from '@iqb/responses';
import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';
import { VariableCodingData } from '@iqbspecs/coding-scheme/coding-scheme.interface';
import { getOrphanCodingResolutionPlan, resolveOrphanCodings } from './orphan-coding-resolution';

describe('orphan coding resolution', () => {
  const variable = (id = 'new-radio', alias = '01'): VariableInfo => ({
    id,
    alias,
    type: 'number',
    format: '',
    multiple: false,
    nullable: false,
    values: [],
    valuePositionLabels: [],
    page: 'current-page'
  });
  const previous = (): VariableCodingData => ({
    ...CodingFactory.createCodingVariable('old-radio'),
    alias: '01',
    label: 'Original label',
    page: 'previous-page',
    processing: ['IGNORE_CASE'],
    fragmenting: '(.*)',
    codeModel: 'MANUAL_AND_RULES',
    manualInstruction: '<p>Hinweis <img src="data:image/png;base64,AA=="></p>[[iqb-math:x]]',
    codes: [{
      id: 1,
      score: 2,
      type: 'FULL_CREDIT',
      manualInstruction: '<p>Vollständige Anweisung</p>',
      ruleSets: [{ rules: [{ method: 'NUMERIC_MATCH', parameters: ['2'] }] }]
    }]
  });
  const derived = (source = 'old-radio'): VariableCodingData => ({
    ...CodingFactory.createCodingVariable('derived'),
    alias: 'calculation',
    sourceType: 'SOLVER',
    deriveSources: [source],
    sourceParameters: { processing: [], solverExpression: '${01} + 1' }
  });

  it('finds the orphan by current IDs and compares public names without letter case', () => {
    const old = { ...previous(), alias: 'Response' };
    const plan = getOrphanCodingResolutionPlan([variable('new-radio', 'response')], [old, derived()]);
    expect(plan.problems).toEqual([]);
    expect(plan.conflicts.length).toBe(1);
    expect(plan.conflicts[0].previous).toBe(old);
    expect(plan.conflicts[0].dependents.map(coding => coding.id)).toEqual(['derived']);
  });

  it('copies all coding content, keeps the new identity and page, and does not mutate its inputs', () => {
    const old = previous();
    const codings = [old, derived()];
    const before = JSON.stringify(codings);
    const variables = [variable()];
    const result = resolveOrphanCodings(variables, codings, ['TRANSFER'])!;
    const transferred = result.find(coding => coding.id === 'new-radio')!;
    expect(transferred).toEqual({ ...old, id: 'new-radio', page: 'current-page' });
    expect(result.map(coding => coding.id)).not.toContain('old-radio');
    expect(result.find(coding => coding.id === 'derived')?.deriveSources).toEqual(['new-radio']);
    expect(result.find(coding => coding.id === 'derived')?.sourceParameters?.solverExpression).toBe('${01} + 1');
    expect(JSON.stringify(codings)).toBe(before);
    expect(variables[0].id).toBe('new-radio');
    transferred.codes![0].manualInstruction = 'changed';
    expect(old.codes![0].manualInstruction).toBe('<p>Vollständige Anweisung</p>');
  });

  ['old-radio', 'old,radio'].forEach(source => {
    it(`remaps SOLVER source ${source} including fragments and value policies`, () => {
      const calculation = derived(source);
      calculation.sourceParameters!.solverExpression = `\u0024{ ${source}[0]:0:INC } + \u0024{01}`;
      const result = resolveOrphanCodings([variable()], [{ ...previous(), id: source }, calculation], ['TRANSFER'])!;
      expect(result.find(coding => coding.id === 'derived')?.sourceParameters?.solverExpression)
        .toBe('${ 01[0]:0:INC } + ${01}');
    });
  });

  it('remaps legacy technical SOLVER IDs containing commas supported by the runtime', () => {
    const old = {
      ...previous(), id: 'old,radio', processing: [], fragmenting: ''
    };
    const calculation = derived('old,radio');
    calculation.sourceParameters!.solverExpression = '${old,radio} + 1';
    const result = resolveOrphanCodings([variable()], [old, calculation], ['TRANSFER'])!;
    const resolvedCalculation = result.find(coding => coding.id === 'derived')!;
    expect(resolvedCalculation.sourceParameters?.solverExpression).toBe('${01} + 1');
    const responses = [{ id: 'new-radio', value: 2, status: 'VALUE_CHANGED' as const }];
    expect(CodingSchemeFactory.deriveValue(result, resolvedCalculation, responses))
      .toEqual(jasmine.objectContaining({ value: 3 }));
  });

  it('preserves alias precedence when a SOLVER token also matches another technical ID', () => {
    const calculation = derived();
    calculation.sourceParameters!.solverExpression = '${old-radio} + ${01}';
    const other = { ...CodingFactory.createCodingVariable('other'), alias: 'old-radio' };
    const result = resolveOrphanCodings([variable(), variable('other', 'old-radio')],
      [previous(), calculation, other],
      ['TRANSFER'])!;
    expect(result.find(coding => coding.id === 'derived')?.sourceParameters?.solverExpression)
      .toBe('${old-radio} + ${01}');
  });

  it('keeps dependent codings untouched for START_EMPTY and exposes their missing source', () => {
    const calculation = derived();
    const result = resolveOrphanCodings([variable()], [previous(), calculation], ['START_EMPTY'])!;
    expect(result.find(coding => coding.id === 'new-radio')?.codes).toEqual([]);
    expect(result.find(coding => coding.id === 'new-radio')?.manualInstruction).toBe('');
    expect(result.find(coding => coding.id === 'derived')).toEqual(calculation);
    expect(CodingSchemeFactory.validate([variable()], result)).toContain(jasmine.objectContaining({
      type: 'SOURCE_MISSING', variableId: 'calculation', breaking: true
    }));
  });

  it('repairs the actual derived calculation after a transfer without rewriting its alias token', () => {
    const old = { ...previous(), processing: [], fragmenting: '' };
    const result = resolveOrphanCodings([variable()], [old, derived()], ['TRANSFER'])!;
    const calculation = result.find(coding => coding.id === 'derived')!;
    expect(CodingSchemeFactory.validate([variable()], result).filter(problem => problem.breaking)).toEqual([]);
    const responses = [{ id: 'new-radio', value: 2, status: 'VALUE_CHANGED' as const }];
    expect(CodingSchemeFactory.deriveValue(result, calculation, responses))
      .toEqual(jasmine.objectContaining({ value: 3, status: 'VALUE_CHANGED' }));
  });

  it('accepts a factory-created target but refuses a target with user content', () => {
    const target = { ...CodingFactory.createCodingVariable('new-radio'), alias: '01' };
    expect(resolveOrphanCodings([variable()], [previous(), target], ['TRANSFER'])).not.toBeNull();
    target.manualInstruction = '<p>Existing target instructions</p>';
    expect(resolveOrphanCodings([variable()], [previous(), target], ['TRANSFER'])).toBeNull();
    expect(target.manualInstruction).toContain('Existing target');
  });

  it('does not select arbitrarily between multiple previous codings', () => {
    const codings = [previous(), { ...previous(), id: 'even-older' }];
    const plan = getOrphanCodingResolutionPlan([variable()], codings);
    expect(plan.problems.join(' ')).toContain('mehrere alte Kodierungen');
    expect(resolveOrphanCodings([variable()], codings, ['TRANSFER'])).toBeNull();
  });

  it('leaves genuine active duplicates, duplicate technical IDs and NO_VALUE conflicts diagnostic-only', () => {
    expect(resolveOrphanCodings([variable(), variable('second')], [previous()], ['TRANSFER'])).toBeNull();
    expect(resolveOrphanCodings([variable()], [previous(), previous()], ['TRANSFER'])).toBeNull();
    expect(resolveOrphanCodings([{ ...variable(), type: 'no-value' }], [previous()], ['TRANSFER'])).toBeNull();
    expect(resolveOrphanCodings([variable('old-radio')], [previous()], ['TRANSFER'])).toBeNull();
  });

  it('does not offer a partial repair while unrelated identifier errors remain', () => {
    const invalid = { ...derived(), alias: 'invalid.alias' };
    expect(resolveOrphanCodings([variable()], [previous(), invalid], ['TRANSFER'])).toBeNull();
  });

  it('requires one valid decision for every conflict and supports mixed choices', () => {
    const vars = [variable(), variable('new-second', '02')];
    const codings = [previous(), { ...previous(), id: 'old-second', alias: '02' }, derived('old-second')];
    expect(resolveOrphanCodings(vars, codings, ['TRANSFER'])).toBeNull();
    expect(resolveOrphanCodings(vars, codings, ['TRANSFER', 'invalid' as never])).toBeNull();
    const result = resolveOrphanCodings(vars, codings, ['TRANSFER', 'START_EMPTY'])!;
    expect(result.find(coding => coding.id === 'new-radio')?.codes?.length).toBe(1);
    expect(result.find(coding => coding.id === 'new-second')?.codes).toEqual([]);
    expect(result.find(coding => coding.id === 'derived')?.deriveSources).toEqual(['old-second']);
  });
});
