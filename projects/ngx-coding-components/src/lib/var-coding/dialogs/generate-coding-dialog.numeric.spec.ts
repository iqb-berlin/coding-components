import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CodingFactory } from '@iqb/responses/coding-factory';
import { CodingRule, VariableCodingData } from '@iqbspecs/coding-scheme';
import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxCodingComponentsTranslateLoader } from '@iqb/ngx-coding-components/translations';
import { SchemerService } from '../../services/schemer.service';
import { GenerateCodingDialogComponent } from './generate-coding-dialog.component';

const numericVarInfo: VariableInfo = {
  id: 'I06_NUM',
  alias: 'I06_NUM',
  type: 'integer',
  format: '',
  multiple: false,
  nullable: true,
  values: [],
  valuesComplete: false,
  valuePositionLabels: []
};

type NumericInputs = Partial<Pick<GenerateCodingDialogComponent,
'numericMatch' | 'numericMoreThen' | 'numericMin' | 'numericLessThen' | 'numericMax'>>;

const getFullCreditRules = (coding: VariableCodingData): CodingRule[] => (
  coding.codes!.find(code => code.type === 'FULL_CREDIT')!.ruleSets![0].rules
);

const codeValues = (coding: VariableCodingData, values: number[]): Array<number | undefined> => (
  values.map(value => CodingFactory.code({ id: coding.id, value, status: 'VALUE_CHANGED' }, coding).score)
);

describe('GenerateCodingDialogComponent numeric rules with the real response converter', () => {
  const createComponent = (inputs: NumericInputs = {}, varInfo = numericVarInfo) => {
    const dialogRef = jasmine.createSpyObj<MatDialogRef<GenerateCodingDialogComponent>>('MatDialogRef', ['close']);
    const translateService = jasmine.createSpyObj<TranslateService>('TranslateService', ['instant']);
    translateService.instant.and.callFake((key: string) => key);
    const schemerService = new SchemerService();
    const component = new GenerateCodingDialogComponent(varInfo, translateService, schemerService, dialogRef);
    Object.assign(component, inputs);
    component.updateNumericRuleText();
    return { component, dialogRef, schemerService };
  };

  const zeroLimits: Array<[keyof NumericInputs, CodingRule['method'], number[]]> = [
    ['numericMoreThen', 'NUMERIC_MORE_THAN', [0, 0, 1]],
    ['numericMin', 'NUMERIC_MIN', [0, 1, 1]],
    ['numericLessThen', 'NUMERIC_LESS_THAN', [1, 0, 0]],
    ['numericMax', 'NUMERIC_MAX', [1, 1, 0]],
    ['numericMatch', 'NUMERIC_MATCH', [0, 1, 0]]
  ];
  zeroLimits.forEach(([field, method, scores]) => {
    it(`should preview, generate and evaluate ${field} = 0`, () => {
      const { component, dialogRef } = createComponent({ [field]: '0' });
      expect(component.numericRuleError).toBeFalse();
      expect(component.numericRuleText).toContain(`rule.${method}`);
      expect(component.numericRuleText).toContain('0');
      expect(component.canGenerate()).toBeTrue();

      component.generateButtonClick();
      const coding = dialogRef.close.calls.mostRecent().args[0] as VariableCodingData;
      expect(getFullCreditRules(coding)).toEqual([{ method, parameters: ['0'] }]);
      expect(codeValues(coding, [-1, 0, 1])).toEqual(scores);
    });
  });

  const ranges: Array<[string, NumericInputs, number[], number[]]> = [
    ['[0, 10]', { numericMin: '0', numericMax: '10' }, [-5, 0, 10, 11], [0, 1, 1, 0]],
    ['[-10, 0]', { numericMin: '-10', numericMax: '0' }, [-11, -10, 0, 1], [0, 1, 1, 0]],
    ['[0, 0]', { numericMin: '0', numericMax: '0' }, [-1, 0, 1], [0, 1, 0]],
    ['(0, 10]', { numericMoreThen: '0', numericMax: '10' }, [-5, 0, 1, 10, 11], [0, 0, 1, 1, 0]],
    ['[0, 10)', { numericMin: '0', numericLessThen: '10' }, [-5, 0, 1, 10, 11], [0, 1, 1, 0, 0]],
    ['(0, 10)', { numericMoreThen: '0', numericLessThen: '10' }, [-5, 0, 1, 10, 11], [0, 0, 1, 0, 0]]
  ];
  ranges.forEach(([label, inputs, values, scores]) => {
    it(`should evaluate both boundaries of ${label}`, () => {
      const { component, dialogRef } = createComponent(inputs);
      expect(component.canGenerate()).toBeTrue();
      expect(component.numericRuleError).toBeFalse();
      component.generateButtonClick();
      const coding = dialogRef.close.calls.mostRecent().args[0] as VariableCodingData;
      expect(coding.codes!.find(code => code.type === 'FULL_CREDIT')!.ruleSets![0].ruleOperatorAnd).toBeTrue();
      expect(codeValues(coding, values)).toEqual(scores);
    });
  });

  it('should ignore absent limits rather than converting them to zero', () => {
    const { component, dialogRef } = createComponent({ numericMin: '  ', numericMax: '10' });
    component.generateButtonClick();
    const coding = dialogRef.close.calls.mostRecent().args[0] as VariableCodingData;
    expect(getFullCreditRules(coding)).toEqual([{ method: 'NUMERIC_MAX', parameters: ['10'] }]);
    expect(codeValues(coding, [-5, 10, 11])).toEqual([1, 1, 0]);
  });

  it('should preserve match precedence and accept decimal commas', () => {
    const { component, dialogRef } = createComponent({ numericMatch: ' 0,5 ', numericMin: '10' });
    component.generateButtonClick();
    const coding = dialogRef.close.calls.mostRecent().args[0] as VariableCodingData;
    expect(getFullCreditRules(coding)).toEqual([{ method: 'NUMERIC_MATCH', parameters: ['0.5'] }]);
    expect(codeValues(coding, [0, 0.5, 10])).toEqual([0, 1, 0]);
  });

  const invalidInputs: Array<[string, NumericInputs, string]> = [
    ['empty definition', {}, 'empty-value'],
    ['whitespace', { numericMatch: ' ', numericMin: '  ' }, 'empty-value'],
    ['invalid match with valid bounds', { numericMatch: 'abc', numericMax: '10' }, 'invalid-number'],
    ['invalid lower limit', { numericMin: 'abc', numericMax: '10' }, 'invalid-number'],
    ['invalid upper limit', { numericMin: '0', numericMax: 'abc' }, 'invalid-number'],
    ['infinity', { numericMatch: 'Infinity' }, 'invalid-number'],
    ['overflow', { numericMatch: '9'.repeat(400) }, 'invalid-number'],
    ['conflicting lower limits with zero', { numericMoreThen: '0', numericMin: '1' }, 'only-one-lower-limit'],
    ['conflicting upper limits with zero', { numericLessThen: '0', numericMax: '1' }, 'only-one-upper-limit'],
    ['reversed bounds', { numericMin: '10', numericMax: '0' }, 'invalid-range'],
    ['empty strict lower range', { numericMoreThen: '0', numericMax: '0' }, 'invalid-range'],
    ['empty strict upper range', { numericMin: '0', numericLessThen: '0' }, 'invalid-range']
  ];
  invalidInputs.forEach(([label, inputs, errorKey]) => {
    it(`should reject ${label} in preview, button state and generation`, () => {
      const { component, dialogRef, schemerService } = createComponent(inputs);
      const addCode = spyOn(schemerService, 'addCode').and.callThrough();
      expect(component.numericRuleError).toBeTrue();
      expect(component.numericRuleText).toContain(`coding.generate.${errorKey}`);
      expect(component.canGenerate()).toBeFalse();
      component.generateButtonClick();
      expect(dialogRef.close).toHaveBeenCalledWith(null);
      expect(addCode).not.toHaveBeenCalled();
    });
  });

  it('should validate text inputs only when numeric coding is selected', () => {
    const { component } = createComponent({}, { ...numericVarInfo, type: 'string' });
    expect(component.canGenerate()).toBeTrue();
    component.textAsNumeric = true;
    expect(component.canGenerate()).toBeFalse();
    component.numericMatch = '0';
    expect(component.canGenerate()).toBeTrue();
  });
});

describe('GenerateCodingDialogComponent numeric dialog UI', () => {
  let fixture: ComponentFixture<GenerateCodingDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<GenerateCodingDialogComponent>>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<GenerateCodingDialogComponent>>('MatDialogRef', ['close']);
    await TestBed.configureTestingModule({
      imports: [GenerateCodingDialogComponent, NoopAnimationsModule, TranslateModule.forRoot({
        loader: { provide: TranslateLoader, useClass: NgxCodingComponentsTranslateLoader }
      })],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: numericVarInfo },
        { provide: MatDialogRef, useValue: dialogRef }
      ]
    }).compileComponents();
    TestBed.inject(TranslateService).use('de');
    fixture = TestBed.createComponent(GenerateCodingDialogComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  const getGenerateButton = (): HTMLButtonElement => (
    fixture.nativeElement.querySelector('button[color="primary"]')
  );
  const enterValue = async (label: string, value: string): Promise<void> => {
    const fields = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('mat-form-field'));
    const field = fields.find(element => element.querySelector('mat-label')?.textContent?.trim() === label)!;
    const input = field.querySelector('input')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  it('should generate and evaluate [0, 10] from the rendered form', async () => {
    expect(getGenerateButton().disabled).toBeTrue();
    await enterValue('Größer gleich', '0');
    await enterValue('Kleiner gleich', '10');
    expect(getGenerateButton().disabled).toBeFalse();
    expect(fixture.nativeElement.querySelector('.rule-text-ok').textContent.trim()).toBe('Bereich 0 / 10');
    getGenerateButton().click();
    const coding = dialogRef.close.calls.mostRecent().args[0] as VariableCodingData;
    expect(getFullCreditRules(coding)).toEqual([{ method: 'NUMERIC_FULL_RANGE', parameters: ['0', '10'] }]);
    expect(codeValues(coding, [-5, 0, 10, 11])).toEqual([0, 1, 1, 0]);
  });

  it('should preview a zero match and disable generation after invalid or cleared input', async () => {
    await enterValue('Übereinstimmung', '0');
    expect(getGenerateButton().disabled).toBeFalse();
    expect(fixture.nativeElement.querySelector('.rule-text-ok').textContent.trim()).toBe('Übereinstimmung: 0');
    await enterValue('Übereinstimmung', 'abc');
    expect(getGenerateButton().disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('.rule-text-error').textContent.trim())
      .toBe('Bitte eine gültige Zahl eintragen');
    await enterValue('Übereinstimmung', '');
    expect(getGenerateButton().disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('.rule-text-error').textContent.trim()).toBe('Bitte Wert eintragen');
    expect(dialogRef.close).not.toHaveBeenCalled();
  });
});
