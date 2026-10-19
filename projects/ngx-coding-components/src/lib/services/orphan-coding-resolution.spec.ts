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

  [
    { sourceType: 'SUM_SCORE', expectedValue: 7 },
    { sourceType: 'SUM_CODE', expectedValue: 4 },
    { sourceType: 'CONCAT_CODE', expectedValue: '3_1' }
  ].forEach(({ sourceType, expectedValue }) => {
    [['old-radio', 'new-radio'], ['new-radio', 'old-radio']].forEach(sources => {
      it(`counts a recovered source once for ${sourceType} with source order ${sources.join(', ')}`, () => {
        const calculation: VariableCodingData = {
          ...derived(),
          sourceType: sourceType as VariableCodingData['sourceType'],
          deriveSources: ['other', ...sources]
        };
        const target = { ...CodingFactory.createCodingVariable('new-radio'), alias: '01' };
        const other = CodingFactory.createCodingVariable('other');
        const codings = [previous(), target, other, calculation];
        const before = JSON.stringify(codings);
        const result = resolveOrphanCodings([variable(), variable('other', 'other')], codings, ['TRANSFER'])!;
        const resolved = result.find(coding => coding.id === 'derived')!;
        expect(resolved.deriveSources).toEqual(['other', 'new-radio']);
        expect(CodingSchemeFactory.deriveValue(result, resolved, [
          {
            id: 'new-radio', value: 2, code: 1, score: 2, status: 'CODING_COMPLETE'
          },
          {
            id: 'other', value: 3, code: 3, score: 5, status: 'CODING_COMPLETE'
          }
        ])).toEqual(jasmine.objectContaining({ value: expectedValue, status: 'VALUE_CHANGED' }));
        expect(JSON.stringify(codings)).toBe(before);
      });
    });
  });

  [
    {
      expression: '${Response} + 10 * ${response}',
      expectedExpression: '${response} + 10 * ${Other}',
      expectedValue: 52
    },
    {
      expression: '${ Response[0]:0:INC } + 10 * ${response[0]:0:INC}',
      expectedExpression: '${ response[0]:0:INC } + 10 * ${Other[0]:0:INC}',
      expectedValue: 52
    },
    {
      expression: '${Response} + 10 * ${response} + ${Response}',
      expectedExpression: '${response} + 10 * ${Other} + ${response}',
      expectedValue: 54
    }
  ].forEach(({ expression, expectedExpression, expectedValue }) => {
    it(`preserves every SOLVER source identity when the recovered alias shadows a technical ID: ${expression}`, () => {
      const old = { ...previous(), alias: 'Response' };
      const other = { ...CodingFactory.createCodingVariable('response'), alias: 'Other', fragmenting: '(.*)' };
      const calculation = derived();
      calculation.deriveSources = ['old-radio', 'response'];
      calculation.sourceParameters!.solverExpression = expression;
      const codings = [old, other, calculation];
      const before = JSON.stringify(codings);
      expect(CodingSchemeFactory.deriveValue(codings, calculation, [
        { id: 'old-radio', value: '2', status: 'VALUE_CHANGED' },
        { id: 'response', value: '5', status: 'VALUE_CHANGED' }
      ]).value).toBe(expectedValue);
      const result = resolveOrphanCodings(
        [variable('new-radio', 'response'), variable('response', 'Other')], codings, ['TRANSFER']
      )!;
      const resolved = result.find(coding => coding.id === 'derived')!;
      expect(resolved.sourceParameters?.solverExpression).toBe(expectedExpression);
      expect(resolved.deriveSources).toEqual(['new-radio', 'response']);
      expect(CodingSchemeFactory.deriveValue(result, resolved, [
        { id: 'new-radio', value: '2', status: 'VALUE_CHANGED' },
        { id: 'response', value: '5', status: 'VALUE_CHANGED' }
      ])).toEqual(jasmine.objectContaining({ value: expectedValue, status: 'VALUE_CHANGED' }));
      expect(JSON.stringify(codings)).toBe(before);
    });
  });

  it('preserves unrelated source lists and formula spelling during a transfer', () => {
    const other = { ...CodingFactory.createCodingVariable('other'), alias: 'Other' };
    const calculation = derived('other');
    calculation.deriveSources = ['other', 'other'];
    calculation.sourceParameters!.solverExpression = '${ other } + ${Other}';
    const result = resolveOrphanCodings(
      [variable(), variable('other', 'Other')], [previous(), other, calculation], ['TRANSFER']
    )!;
    expect(result.find(coding => coding.id === 'derived')).toEqual(calculation);
  });

  it('uses the authoritative host alias when an unchanged source has no stored alias', () => {
    const other = { ...CodingFactory.createCodingVariable('response'), alias: undefined };
    const calculation = derived();
    calculation.deriveSources = ['old-radio', 'response'];
    calculation.sourceParameters!.solverExpression = '${Response} + 10 * ${response}';
    const result = resolveOrphanCodings(
      [variable('new-radio', 'response'), variable('response', 'Other')],
      [{ ...previous(), alias: 'Response' }, other, calculation],
      ['TRANSFER']
    )!;
    const resolved = result.find(coding => coding.id === 'derived')!;
    expect(result.find(coding => coding.id === 'response')?.alias).toBe('Other');
    expect(resolved.sourceParameters?.solverExpression).toBe('${response} + 10 * ${Other}');
    expect(CodingSchemeFactory.deriveValue(result, resolved, [
      { id: 'new-radio', value: 2, status: 'VALUE_CHANGED' },
      { id: 'response', value: 5, status: 'VALUE_CHANGED' }
    ]).value).toBe(52);
  });

  it('keeps removed references and source lists but preserves surviving SOLVER identities for START_EMPTY', () => {
    const other = { ...CodingFactory.createCodingVariable('response'), alias: 'Other' };
    const calculation = derived();
    calculation.deriveSources = ['old-radio', 'response', 'response'];
    calculation.sourceParameters!.solverExpression = '${Response} + 10 * ${response}';
    const result = resolveOrphanCodings(
      [variable('new-radio', 'response'), variable('response', 'Other')],
      [{ ...previous(), alias: 'Response' }, other, calculation],
      ['START_EMPTY']
    )!;
    expect(result.find(coding => coding.id === 'derived')).toEqual({
      ...calculation,
      sourceParameters: { ...calculation.sourceParameters, solverExpression: '${Response} + 10 * ${Other}' }
    });
  });

  ['${response} + 1', '${ response[0]:0:INC } + 1'].forEach(expression => {
    it(`preserves an unrelated SOLVER source when starting empty: ${expression}`, () => {
      const other = { ...CodingFactory.createCodingVariable('response'), alias: 'Other', fragmenting: '(.*)' };
      const calculation = derived('response');
      calculation.sourceParameters!.solverExpression = expression;
      const codings = [{ ...previous(), alias: 'Response' }, other, calculation];
      const before = JSON.stringify(codings);
      const responses = [{ id: 'response', value: '5', status: 'VALUE_CHANGED' as const }];
      expect(CodingSchemeFactory.deriveValue(codings, calculation, responses).value).toBe(6);

      const result = resolveOrphanCodings(
        [variable('new-radio', 'response'), variable('response', 'Other')], codings, ['START_EMPTY']
      )!;
      const resolved = result.find(coding => coding.id === 'derived')!;
      expect(resolved.deriveSources).toEqual(['response']);
      expect(resolved.sourceParameters?.solverExpression).toBe(expression.replace('response', 'Other'));
      expect(CodingSchemeFactory.deriveValue(result, resolved, responses))
        .toEqual(jasmine.objectContaining({ value: 6, status: 'VALUE_CHANGED' }));
      expect(JSON.stringify(codings)).toBe(before);
    });
  });

  (['TRANSFER', 'START_EMPTY'] as const).forEach(decision => {
    it(`accounts for every new host variable before preserving SOLVER sources during ${decision}`, () => {
      const other = { ...CodingFactory.createCodingVariable('other'), alias: 'OtherSource' };
      const calculation = derived('other');
      calculation.sourceParameters!.solverExpression = '${other} + 1';
      const variables = [
        variable(), variable('other', 'OtherSource'), variable('additional', 'other'),
        { ...variable('caption', 'Caption'), type: 'no-value' as const }
      ];
      const result = resolveOrphanCodings(variables, [previous(), other, calculation], [decision])!;
      expect(result.find(coding => coding.id === 'additional')).toEqual(jasmine.objectContaining({
        alias: 'other', sourceType: 'BASE'
      }));
      expect(result.find(coding => coding.id === 'caption')).toEqual(jasmine.objectContaining({
        alias: 'Caption', sourceType: 'BASE_NO_VALUE'
      }));
      const resolved = result.find(coding => coding.id === 'derived')!;
      expect(resolved.sourceParameters?.solverExpression).toBe('${OtherSource} + 1');
      expect(CodingSchemeFactory.deriveValue(result, resolved, [
        { id: 'other', value: 5, status: 'VALUE_CHANGED' }
      ])).toEqual(jasmine.objectContaining({ value: 6, status: 'VALUE_CHANGED' }));
    });
  });

  it('preserves alias lookup when the surviving source has no stored alias during START_EMPTY', () => {
    const other = { ...CodingFactory.createCodingVariable('response'), alias: undefined };
    const calculation = derived('response');
    calculation.sourceParameters!.solverExpression = '${response} + 1';
    const result = resolveOrphanCodings(
      [variable('new-radio', 'response'), variable('response', 'Other')],
      [{ ...previous(), alias: 'Response' }, other, calculation],
      ['START_EMPTY']
    )!;
    const resolved = result.find(coding => coding.id === 'derived')!;
    expect(resolved.sourceParameters?.solverExpression).toBe('${Other} + 1');
    expect(CodingSchemeFactory.deriveValue(result, resolved, [
      { id: 'response', value: 5, status: 'VALUE_CHANGED' }
    ]).value).toBe(6);
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
