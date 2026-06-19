import { CodingFactory } from '@iqb/responses/coding-factory';
import { transformValue } from '@iqb/responses/value-transform';
import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';
import { TranslateService } from '@ngx-translate/core';
import { MatDialogRef } from '@angular/material/dialog';
import {
  CodeData,
  CodeType,
  VariableCodingData
} from '@iqbspecs/coding-scheme/coding-scheme.interface';
import { SchemerService } from '../../services/schemer.service';
import { GenerateCodingDialogComponent } from './generate-coding-dialog.component';

describe('GenerateCodingDialogComponent', () => {
  const createComponent = (overrides: Partial<VariableInfo> = {}) => {
    const dialogRef = jasmine.createSpyObj<MatDialogRef<GenerateCodingDialogComponent>>('MatDialogRef', ['close']);

    const translateService = jasmine.createSpyObj<TranslateService>('TranslateService', ['instant']);
    translateService.instant.and.callFake((key: string) => key);

    const schemerService = jasmine.createSpyObj<SchemerService>('SchemerService', ['addCode', 'sortCodes']);

    const varInfo: VariableInfo = {
      id: 'v1',
      alias: 'V1',
      type: 'string',
      format: '',
      multiple: false,
      nullable: false,
      values: [],
      valuesComplete: true,
      valuePositionLabels: [],
      ...overrides
    } as VariableInfo;

    const component = new GenerateCodingDialogComponent(
      varInfo,
      translateService,
      schemerService,
      dialogRef
    );

    return {
      component,
      dialogRef,
      translateService,
      schemerService,
      varInfo
    };
  };

  beforeEach(() => {
    spyOn(CodingFactory, 'getValueAsNumber').and.callFake((v: unknown) => {
      if (v === null || typeof v === 'undefined') return null;
      const s = String(v).trim();
      if (!s) return null;
      const num = Number(s);
      return Number.isFinite(num) ? num : null;
    });
  });

  it('constructor should set generationModel to single-choice-many when values > 20 ' +
    'and set elseMethod based on valuesComplete', () => {
    const values = Array.from({ length: 21 }).map((_, i) => ({
      value: `v${i}`,
      label: `label${i}`
    }));

    const { component } = createComponent({
      values,
      valuesComplete: true,
      multiple: false
    });

    expect(component.generationModel).toBe('single-choice-many');
    expect(component.elseMethod).toBe('auto');
    expect(component.options.length).toBe(21);
  });

  it('resetOptions should truncate long values and labels and clear selections', () => {
    const { component } = createComponent({
      values: [
        { value: '1234567890123456789012345678901', label: 'abcdefghijabcdefghijabcdefghijabcd' }
      ]
    });

    component.selectedOptions = ['x'];
    component.selectedDragOptions = [{ value: 'x', oldIndex: 0 }];

    component.resetOptions();

    expect(component.options[0].value.endsWith('…')).toBeTrue();
    expect(component.options[0].label?.endsWith('…')).toBeTrue();
    expect(component.selectedOptions).toEqual([]);
    expect(component.selectedDragOptions).toEqual([]);
  });

  it('updateNumericRuleText should build NUMERIC_MATCH text when numericMatch is set', () => {
    const { component } = createComponent({
      type: 'integer',
      multiple: false
    });

    component.numericMatch = '12';
    component.updateNumericRuleText();

    expect(component.numericRuleError).toBeFalse();
    expect(component.numericRuleText).toContain('rule.NUMERIC_MATCH');
    expect(component.numericRuleText).toContain('12');
  });

  it('updateNumericRuleText should detect conflicting lower/upper limits', () => {
    const { component } = createComponent({
      type: 'integer',
      multiple: false
    });

    component.numericMoreThen = '1';
    component.numericMin = '2';
    component.numericLessThen = '9';
    component.numericMax = '10';

    component.updateNumericRuleText();

    expect(component.numericRuleError).toBeTrue();
    expect(component.numericRuleText).toContain('coding.generate.only-one-lower-limit');
    expect(component.numericRuleText).toContain('coding.generate.only-one-upper-limit');
  });

  it('updateNumericRuleText should build full range text when moreThen < max', () => {
    const { component } = createComponent({
      type: 'integer',
      multiple: false
    });

    component.numericMoreThen = '1';
    component.numericMax = '10';

    component.updateNumericRuleText();

    expect(component.numericRuleError).toBeFalse();
    expect(component.numericRuleText).toContain('rule.NUMERIC_FULL_RANGE');
    expect(component.numericRuleText).toContain('1');
    expect(component.numericRuleText).toContain('10');
  });

  it('updateNumericRuleText should show empty-value error when no numeric constraints are provided', () => {
    const { component } = createComponent({
      type: 'integer',
      multiple: false
    });

    component.numericMatch = '';
    component.numericMoreThen = '';
    component.numericMin = '';
    component.numericLessThen = '';
    component.numericMax = '';

    component.updateNumericRuleText();

    expect(component.numericRuleError).toBeTrue();
    expect(component.numericRuleText).toBe('coding.generate.empty-value');
  });

  it('generateButtonClick should close null when generationModel is none', () => {
    const { component, dialogRef } = createComponent();

    component.generationModel = 'none';
    component.generateButtonClick();

    expect(dialogRef.close).toHaveBeenCalledWith(null);
  });

  it('constructor should detect math-table variables and require an expected result for auto mode', () => {
    const { component } = createComponent({
      type: 'json',
      format: 'math-table'
    });

    expect(component.generationModel).toBe('math-table');
    expect(component.elseMethod).toBe('auto');
    expect(component.canGenerate()).toBeFalse();

    component.mathTableExpectedResult = '579';

    expect(component.canGenerate()).toBeTrue();
  });

  it('generateButtonClick should not generate math-table result coding without expected result', () => {
    const { component, dialogRef, schemerService } = createComponent({
      type: 'json',
      format: 'math-table'
    });

    component.generateButtonClick();

    expect(dialogRef.close).toHaveBeenCalledWith(null);
    expect(schemerService.addCode).not.toHaveBeenCalled();
  });

  it('generateButtonClick should generate math-table result MATCH_REGEX and residual auto code', () => {
    const { component, dialogRef, schemerService } = createComponent({
      type: 'json',
      format: 'math-table'
    });

    component.mathTableExpectedResult = '579';

    schemerService.addCode.and.callFake((codes: CodeData[], type: CodeType) => {
      const code = {
        id: type === 'RESIDUAL_AUTO' ? 0 : codes.length + 1,
        type
      } as CodeData;
      codes.push(code);
      return code;
    });

    component.generateButtonClick();

    const closed = (dialogRef.close as jasmine.Spy).calls.mostRecent().args[0] as unknown as
      { codeModel: string; codes: CodeData[] };
    const fullCredit = closed.codes.find(c => c.type === 'FULL_CREDIT')!;
    const residualAuto = closed.codes.find(c => c.type === 'RESIDUAL_AUTO');

    expect(closed.codeModel).toBe('RULES_ONLY');
    expect(fullCredit.ruleSets?.[0].rules[0].method).toBe('MATCH_REGEX');
    expect(fullCredit.ruleSets?.[0].rules[0].parameters?.[0]).toContain('"rowType"');
    expect(residualAuto).toBeDefined();
  });

  it('generateButtonClick should generate manual math-table code structure without rules', () => {
    const { component, dialogRef, schemerService } = createComponent({
      type: 'json',
      format: 'math-table'
    });

    component.mathTableMode = 'manual';

    schemerService.addCode.and.callFake((codes: CodeData[], type: CodeType) => {
      const code = {
        id: codes.length + 1,
        type,
        ruleSets: [{ ruleOperatorAnd: false, rules: [] }]
      } as CodeData;
      codes.push(code);
      return code;
    });

    component.generateButtonClick();

    const closed = (dialogRef.close as jasmine.Spy).calls.mostRecent().args[0] as unknown as
      { codeModel: string; manualInstruction: string; codes: CodeData[] };

    expect(closed.codeModel).toBe('MANUAL_ONLY');
    expect(closed.manualInstruction).toContain('Rechenweg');
    const codeTypes: string[] = closed.codes.map(c => c.type || '').sort();
    expect(codeTypes).toEqual([
      'FULL_CREDIT',
      'NO_CREDIT',
      'PARTIAL_CREDIT',
      'TO_CHECK'
    ].sort());
    expect(closed.codes.every(c => (c.ruleSets || []).length === 0)).toBeTrue();
  });

  it('generateButtonClick should generate numeric MATCH rule for integer model and close var data', () => {
    const { component, dialogRef, schemerService } = createComponent({
      type: 'integer',
      multiple: false
    });

    component.generationModel = 'integer';
    component.numericMatch = '7';

    schemerService.addCode.and.callFake((codes: CodeData[], type: CodeType) => {
      const code = { id: 1, type } as CodeData;
      codes.push(code);
      return code;
    });

    component.generateButtonClick();

    expect(dialogRef.close).toHaveBeenCalled();
    const closed = (dialogRef.close as jasmine.Spy).calls.mostRecent().args[0] as unknown as
      { id: string; codes: unknown[] };
    expect(closed.id).toBe('v1');
    expect(closed.codes.length).toBeGreaterThan(0);

    const fullCredit = (closed.codes as Array<
    { type: string; ruleSets: Array<{ rules: Array<{ method: string; parameters: string[] }> }> }>)
      .find(c => c.type === 'FULL_CREDIT')!;
    expect(fullCredit.ruleSets[0].rules[0].method).toBe('NUMERIC_MATCH');
    expect(fullCredit.ruleSets[0].rules[0].parameters).toEqual(['7']);
  });

  it('generateButtonClick should close null when addCode fails for integer model', () => {
    const { component, dialogRef, schemerService } = createComponent({
      type: 'integer',
      multiple: false
    });

    component.generationModel = 'integer';
    component.numericMatch = '7';

    schemerService.addCode.and.returnValue('error');

    component.generateButtonClick();

    expect(dialogRef.close).toHaveBeenCalledWith(null);
  });

  it('generateButtonClick should generate MATCH rule for simple-input model', () => {
    const { component, dialogRef, schemerService } = createComponent({
      type: 'string',
      multiple: false
    });

    component.generationModel = 'simple-input';
    component.selectedOption = 'abc';

    schemerService.addCode.and.callFake((codes: CodeData[], type: CodeType) => {
      const code = { id: 1, type } as CodeData;
      codes.push(code);
      return code;
    });

    component.generateButtonClick();

    const closed = (dialogRef.close as jasmine.Spy).calls.mostRecent().args[0] as unknown as { codes: unknown[] };
    expect((closed as { fragmenting?: string }).fragmenting).toBe('');
    const fullCredit = (closed.codes as Array<{ type: string; ruleSets:
    Array<{ rules: Array<{ method: string; parameters: string[] }> }> }>)
      .find(c => c.type === 'FULL_CREDIT')!;
    expect(fullCredit.ruleSets[0].rules[0]).toEqual({
      method: 'MATCH',
      parameters: ['abc']
    });
  });

  it('generateButtonClick should fragment GeoGebra numeric values before numeric rules', () => {
    const { component, dialogRef, schemerService } = createComponent({
      id: 'ggb_490000',
      alias: 'GGB',
      type: 'string',
      format: 'ggb-variable'
    });

    expect(component.generationModel).toBe('simple-input');
    expect(component.textAsNumeric).toBeTrue();
    expect(component.geogebraExtractValue).toBeTrue();

    component.numericMatch = '429979.167';

    schemerService.addCode.and.callFake((codes: CodeData[], type: CodeType) => {
      const code = {
        id: type === 'RESIDUAL_AUTO' ? 0 : 1,
        type,
        score: type === 'FULL_CREDIT' ? 1 : 0
      } as CodeData;
      codes.push(code);
      return code;
    });

    component.generateButtonClick();

    const closed = (dialogRef.close as jasmine.Spy).calls.mostRecent().args[0] as VariableCodingData;
    const fullCredit = (closed.codes || []).find(c => c.type === 'FULL_CREDIT') as CodeData;

    expect(closed.fragmenting).toBe(
      '^\\s*ggb_490000\\s*=\\s*([-+]?\\d+(?:[.,]\\d+)?)\\s*$'
    );
    expect(fullCredit.ruleSets?.[0].rules[0]).toEqual({
      method: 'NUMERIC_MATCH',
      parameters: ['429979.167']
    });

    const coded = CodingFactory.code(
      {
        id: 'ggb_490000',
        value: 'ggb_490000 = 429979.167',
        status: 'VALUE_CHANGED'
      },
      closed
    );

    expect(coded.code).toBe(1);
    expect(coded.score).toBe(1);
  });

  it('generateButtonClick should fragment GeoGebra angle values without the degree symbol', () => {
    const { component, dialogRef, schemerService } = createComponent({
      id: 'α',
      alias: 'Winkel',
      type: 'string',
      format: 'ggb-variable'
    });

    component.setGeoGebraCodingMode('angle');
    component.numericMatch = '-42.14159';

    schemerService.addCode.and.callFake((codes: CodeData[], type: CodeType) => {
      const code = {
        id: type === 'RESIDUAL_AUTO' ? 0 : 1,
        type,
        score: type === 'FULL_CREDIT' ? 1 : 0
      } as CodeData;
      codes.push(code);
      return code;
    });

    component.generateButtonClick();

    const closed = (dialogRef.close as jasmine.Spy).calls.mostRecent().args[0] as VariableCodingData;

    expect(closed.fragmenting).toBe(
      '^\\s*α\\s*=\\s*([-+]?\\d+(?:[.,]\\d+)?)\\s*°?\\s*$'
    );
    expect(transformValue('α = -42.14159°', closed.fragmenting || '', false)).toEqual(['-42.14159']);
  });

  it('generateButtonClick should generate GeoGebra point rules for both coordinates', () => {
    const { component, dialogRef, schemerService } = createComponent({
      id: 'A',
      alias: 'Punkt A',
      type: 'string',
      format: 'ggb-variable'
    });

    component.setGeoGebraCodingMode('point');
    component.geogebraPointX = '-1.3';
    component.geogebraPointY = '2.4';

    schemerService.addCode.and.callFake((codes: CodeData[], type: CodeType) => {
      const code = {
        id: type === 'RESIDUAL_AUTO' ? 0 : 1,
        type,
        score: type === 'FULL_CREDIT' ? 1 : 0
      } as CodeData;
      codes.push(code);
      return code;
    });

    component.generateButtonClick();

    const closed = (dialogRef.close as jasmine.Spy).calls.mostRecent().args[0] as VariableCodingData;
    const fullCredit = (closed.codes || []).find(c => c.type === 'FULL_CREDIT') as CodeData;

    expect(closed.fragmenting).toBe(
      '^\\s*A\\s*=\\s*\\(\\s*([-+]?\\d+(?:[.,]\\d+)?)\\s*,\\s*([-+]?\\d+(?:[.,]\\d+)?)\\s*\\)\\s*$'
    );
    expect(transformValue('A = (-1.3, 2.4)', closed.fragmenting || '', false)).toEqual(['-1.3', '2.4']);
    expect(fullCredit.ruleSets?.[0]).toEqual({
      ruleOperatorAnd: true,
      rules: [
        {
          method: 'NUMERIC_MATCH',
          parameters: ['-1.3'],
          fragment: 0
        },
        {
          method: 'NUMERIC_MATCH',
          parameters: ['2.4'],
          fragment: 1
        }
      ]
    });

    const correct = CodingFactory.code(
      {
        id: 'A',
        value: 'A = (-1.3, 2.4)',
        status: 'VALUE_CHANGED'
      },
      closed
    );
    const wrongY = CodingFactory.code(
      {
        id: 'A',
        value: 'A = (-1.3, 999)',
        status: 'VALUE_CHANGED'
      },
      closed
    );

    expect(correct.code).toBe(1);
    expect(correct.score).toBe(1);
    expect(wrongY.code).not.toBe(1);
    expect(wrongY.score).toBe(0);
  });

  it('generateButtonClick should force GeoGebra fragmenting for point rules', () => {
    const { component, dialogRef, schemerService } = createComponent({
      id: 'A',
      alias: 'Punkt A',
      type: 'string',
      format: 'ggb-variable'
    });

    component.geogebraExtractValue = false;
    component.setGeoGebraCodingMode('point');
    expect(component.geogebraExtractValue).toBeTrue();
    component.geogebraExtractValue = false;
    component.geogebraPointX = '-1.3';
    component.geogebraPointY = '2.4';

    schemerService.addCode.and.callFake((codes: CodeData[], type: CodeType) => {
      const code = {
        id: type === 'RESIDUAL_AUTO' ? 0 : 1,
        type,
        score: type === 'FULL_CREDIT' ? 1 : 0
      } as CodeData;
      codes.push(code);
      return code;
    });

    component.generateButtonClick();

    const closed = (dialogRef.close as jasmine.Spy).calls.mostRecent().args[0] as VariableCodingData;
    const coded = CodingFactory.code(
      {
        id: 'A',
        value: 'A = (-1.3, 2.4)',
        status: 'VALUE_CHANGED'
      },
      closed
    );

    expect(closed.fragmenting).toBe(
      '^\\s*A\\s*=\\s*\\(\\s*([-+]?\\d+(?:[.,]\\d+)?)\\s*,\\s*([-+]?\\d+(?:[.,]\\d+)?)\\s*\\)\\s*$'
    );
    expect(coded.code).toBe(1);
    expect(coded.score).toBe(1);
  });

  it('generateButtonClick should generate GeoGebra boolean rules for extracted true values', () => {
    const { component, dialogRef, schemerService } = createComponent({
      id: 'ggb_PunktRichtig',
      alias: 'GGB Boolean',
      type: 'boolean',
      format: 'ggb-variable'
    });

    expect(component.generationModel).toBe('geogebra-boolean');
    expect(component.geogebraExtractValue).toBeTrue();

    component.geogebraBooleanValue = 'true';

    schemerService.addCode.and.callFake((codes: CodeData[], type: CodeType) => {
      const code = {
        id: type === 'RESIDUAL_AUTO' ? 0 : 1,
        type,
        score: type === 'FULL_CREDIT' ? 1 : 0
      } as CodeData;
      codes.push(code);
      return code;
    });

    component.generateButtonClick();

    const closed = (dialogRef.close as jasmine.Spy).calls.mostRecent().args[0] as VariableCodingData;
    const fullCredit = (closed.codes || []).find(c => c.type === 'FULL_CREDIT') as CodeData;

    expect(closed.fragmenting).toBe('^\\s*ggb_PunktRichtig\\s*=\\s*(true|false)\\s*$');
    expect(fullCredit.ruleSets?.[0].rules[0]).toEqual({
      method: 'IS_TRUE',
      parameters: []
    });

    const coded = CodingFactory.code(
      {
        id: 'ggb_PunktRichtig',
        value: 'ggb_PunktRichtig = true',
        status: 'VALUE_CHANGED'
      },
      closed
    );

    expect(coded.code).toBe(1);
    expect(coded.score).toBe(1);
  });

  it('generateButtonClick should create multi-choice order-dependent ruleSets and close', () => {
    const { component, dialogRef, schemerService } = createComponent({
      type: 'string',
      multiple: true,
      values: [{ value: 'A', label: 'A' }, { value: 'B', label: 'B' }],
      valuePositionLabels: ['p1', 'p2']
    });

    component.generationModel = 'multi-choice';
    component.multiChoiceOrderMatters = true;
    component.selectedDragOptions = [
      { value: 'A', oldIndex: 0 },
      { value: 'B', oldIndex: 1 }
    ];

    schemerService.addCode.and.callFake((codes: CodeData[], type: CodeType) => {
      const code = { id: 1, type } as CodeData;
      codes.push(code);
      return code;
    });

    component.generateButtonClick();

    const closed = (dialogRef.close as jasmine.Spy).calls.mostRecent().args[0] as unknown as { codes: unknown[] };
    const fullCredit = (closed.codes as Array<{ type: string; ruleSets: Array<
    { valueArrayPos?: number; rules: unknown[] }> }>)
      .find(c => c.type === 'FULL_CREDIT')!;
    expect(fullCredit.ruleSets.length).toBe(2);
    expect(fullCredit.ruleSets[0].valueArrayPos).toBe(0);
    expect(fullCredit.ruleSets[1].valueArrayPos).toBe(1);
  });

  it('generateButtonClick should create boolean-multi ruleSets with IS_TRUE/IS_FALSE', () => {
    const { component, dialogRef, schemerService } = createComponent({
      type: 'boolean',
      multiple: true,
      valuePositionLabels: ['p1', 'p2']
    });

    component.generationModel = 'boolean-multi';
    component.booleanMultiSelections = [true, false];

    schemerService.addCode.and.callFake((codes: CodeData[], type: CodeType) => {
      const code = { id: 1, type } as CodeData;
      codes.push(code);
      return code;
    });

    component.generateButtonClick();

    const closed = (dialogRef.close as jasmine.Spy).calls.mostRecent().args[0] as unknown as { codes: unknown[] };
    const fullCredit = (closed.codes as Array<{ type: string; ruleSets: Array<{ rules: Array<{ method: string }> }> }>)
      .find(c => c.type === 'FULL_CREDIT')!;
    expect(fullCredit.ruleSets[0].rules[0].method).toBe('IS_TRUE');
    expect(fullCredit.ruleSets[1].rules[0].method).toBe('IS_FALSE');
  });

  it('returnOption should reinsert option in oldIndex order', () => {
    const { component } = createComponent({
      values: [{ value: 'A', label: 'A' }, { value: 'B', label: 'B' }, { value: 'C', label: 'C' }]
    });

    // simulate that B was moved into selectedDragOptions
    const b = component.options.find(o => o.value === 'B')!;
    component.options = component.options.filter(o => o.value !== 'B');
    component.selectedDragOptions = [b];

    component.returnOption(b);

    expect(component.selectedDragOptions.length).toBe(0);
    expect(component.options.map(o => o.value)).toEqual(['A', 'B', 'C']);
  });

  it('generateButtonClick should generate NUMERIC_FULL_RANGE rule for closed range [min, max]', () => {
    const { component, dialogRef, schemerService } = createComponent({
      type: 'integer',
      multiple: false
    });

    component.generationModel = 'integer';
    component.numericMin = '5';
    component.numericMax = '10';

    schemerService.addCode.and.callFake((codes: CodeData[], type: CodeType) => {
      const code = { id: 1, type } as CodeData;
      codes.push(code);
      return code;
    });

    component.generateButtonClick();

    expect(dialogRef.close).toHaveBeenCalled();
    const closed = (dialogRef.close as jasmine.Spy).calls.mostRecent().args[0] as unknown as
      { id: string; codes: unknown[] };
    expect(closed.id).toBe('v1');
    expect(closed.codes.length).toBeGreaterThan(0);

    const fullCredit = (closed.codes as Array<
    { type: string; ruleSets: Array<{ rules: Array<{ method: string; parameters: string[] }> }> }>)
      .find(c => c.type === 'FULL_CREDIT')!;
    expect(fullCredit.ruleSets[0].rules[0].method).toBe('NUMERIC_FULL_RANGE');
    expect(fullCredit.ruleSets[0].rules[0].parameters).toEqual(['5', '10']);
  });

  it('updateNumericRuleText should build NUMERIC_FULL_RANGE text for closed range [min, max]', () => {
    const { component } = createComponent({
      type: 'integer',
      multiple: false
    });

    component.numericMin = '5';
    component.numericMax = '10';
    component.updateNumericRuleText();

    expect(component.numericRuleError).toBeFalse();
    expect(component.numericRuleText).toContain('rule.NUMERIC_FULL_RANGE');
    expect(component.numericRuleText).toContain('5');
    expect(component.numericRuleText).toContain('10');
  });

  it('updateNumericRuleText should not show NUMERIC_MATCH when numericMatch is empty but min/max are set', () => {
    const { component } = createComponent({
      type: 'integer',
      multiple: false
    });

    component.numericMatch = ''; // Empty string
    component.numericMin = '5';
    component.numericMax = '10';
    component.updateNumericRuleText();

    expect(component.numericRuleError).toBeFalse();
    expect(component.numericRuleText).toContain('rule.NUMERIC_FULL_RANGE');
    expect(component.numericRuleText).toContain('5');
    expect(component.numericRuleText).toContain('10');
    // Should NOT contain NUMERIC_MATCH text
    expect(component.numericRuleText).not.toContain('rule.NUMERIC_MATCH');
  });

  it('generateButtonClick should generate NUMERIC_FULL_RANGE rule when numericMatch is empty ' +
    'but min/max are set', () => {
    const { component, dialogRef, schemerService } = createComponent({
      type: 'integer',
      multiple: false
    });

    component.generationModel = 'integer';
    component.numericMatch = ''; // Empty string
    component.numericMin = '5';
    component.numericMax = '10';

    schemerService.addCode.and.callFake((codes: CodeData[], type: CodeType) => {
      const code = { id: 1, type } as CodeData;
      codes.push(code);
      return code;
    });

    component.generateButtonClick();

    expect(dialogRef.close).toHaveBeenCalled();
    const closed = (dialogRef.close as jasmine.Spy).calls.mostRecent().args[0] as unknown as
      { id: string; codes: unknown[] };
    expect(closed.id).toBe('v1');
    expect(closed.codes.length).toBeGreaterThan(0);

    const fullCredit = (closed.codes as Array<
    { type: string; ruleSets: Array<{ rules: Array<{ method: string; parameters: string[] }> }> }>)
      .find(c => c.type === 'FULL_CREDIT')!;
    // Should NOT create NUMERIC_MATCH rule when numericMatch is empty
    expect(fullCredit.ruleSets[0].rules[0].method).toBe('NUMERIC_FULL_RANGE');
    expect(fullCredit.ruleSets[0].rules[0].parameters).toEqual(['5', '10']);
    // Should not have NUMERIC_MATCH rule
    expect(fullCredit.ruleSets[0].rules).not.toContain(jasmine.objectContaining({ method: 'NUMERIC_MATCH' }));
  });
});
