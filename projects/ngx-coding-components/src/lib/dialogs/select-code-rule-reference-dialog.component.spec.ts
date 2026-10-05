import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSelectionListHarness } from '@angular/material/list/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { CodingFactory } from '@iqb/responses/coding-factory';
import { CodingSchemeFactory } from '@iqb/responses';
import { RuleSet } from '@iqbspecs/coding-scheme/coding-scheme.interface';
import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';
import { NgxCodingComponentsTranslateLoader } from '../translations/ngx-coding-components.translate-loader';
import { SelectCodeRuleReferenceDialogComponent, SelectCodeRuleReferenceDialogData }
  from './select-code-rule-reference-dialog.component';

describe('SelectCodeRuleReferenceDialogComponent', () => {
  const createComponent = (data: SelectCodeRuleReferenceDialogData) => {
    const dialogRef = jasmine.createSpyObj < MatDialogRef<
    SelectCodeRuleReferenceDialogComponent >>('MatDialogRef', ['close']);

    const component = new SelectCodeRuleReferenceDialogComponent(data, dialogRef);
    return { component, dialogRef };
  };

  it('should initialize with specific selection when value is a number (and increment display value)', () => {
    const { component } = createComponent({ isFragmentMode: true, value: 3 });

    expect(component.newSelection).toEqual(['specific']);
    expect(component.newValue).toBe(4);
  });

  it('should initialize with non-specific selection when value is a keyword', () => {
    const { component } = createComponent({ isFragmentMode: false, value: 'SUM' });

    expect(component.newSelection).toEqual(['SUM']);
    expect(component.newValue).toBe(0);
  });

  it('should default selection to ANY when value is ANY (or falsy)', () => {
    const { component } = createComponent({ isFragmentMode: false, value: 'ANY' });

    expect(component.newSelection).toEqual(['ANY']);
    expect(component.newValue).toBe(0);
  });

  it('okButtonClick should close with newValue - 1 when specific is selected', () => {
    const { component, dialogRef } = createComponent({ isFragmentMode: true, value: 1 });

    component.newSelection = ['specific'];
    component.newValue = 10;

    component.okButtonClick();

    expect(dialogRef.close).toHaveBeenCalledWith(9);
  });

  it('okButtonClick should close with selected keyword when not specific', () => {
    const { component, dialogRef } = createComponent({ isFragmentMode: true, value: 'ANY' });

    component.newSelection = ['ANY_OPEN'];
    component.newValue = 123;

    component.okButtonClick();

    expect(dialogRef.close).toHaveBeenCalledWith('ANY_OPEN');
  });
});

describe('SelectCodeRuleReferenceDialogComponent UI', () => {
  let fixture: ComponentFixture<SelectCodeRuleReferenceDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<SelectCodeRuleReferenceDialogComponent>>;
  let dialogData: SelectCodeRuleReferenceDialogData;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    dialogData = { isFragmentMode: false, value: 'ANY' };
    await TestBed.configureTestingModule({
      imports: [SelectCodeRuleReferenceDialogComponent, NoopAnimationsModule, TranslateModule.forRoot({
        loader: { provide: TranslateLoader, useClass: NgxCodingComponentsTranslateLoader }
      })],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
        { provide: MatDialogRef, useValue: dialogRef }
      ]
    }).compileComponents();
    TestBed.inject(TranslateService).use('de');
  });

  const renderDialog = async () => {
    fixture = TestBed.createComponent(SelectCodeRuleReferenceDialogComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return TestbedHarnessEnvironment.loader(fixture).getHarness(MatSelectionListHarness);
  };

  const getHelp = (): HTMLElement | null => fixture.nativeElement.querySelector('#array-reference-help');
  const save = () => fixture.nativeElement.querySelector('button[color="primary"]').click();

  it('explains why an additional non-matching value prevents ANY from matching', async () => {
    const list = await renderDialog();

    expect((await list.getItems()).length).toBe(5);
    await expectAsync((await list.getItems({ selected: true }))[0].getText())
      .toBeResolvedTo('Alle vorhandenen Werte müssen passen');
    expect(getHelp()?.textContent).toContain('[passend, nicht passend] → kein Treffer');
    expect(fixture.nativeElement.querySelector('mat-selection-list').getAttribute('aria-describedby'))
      .toBe('array-reference-help');

    save();
    expect(dialogRef.close).toHaveBeenCalledWith('ANY');
  });

  it('updates the explanation and saves ANY_OPEN when at least one value is selected', async () => {
    const list = await renderDialog();
    await list.selectItems({ text: 'Mindestens ein Wert muss passen' });

    expect(getHelp()?.textContent).toContain('Zusätzliche nicht passende Werte sind erlaubt');
    expect(getHelp()?.textContent).toContain('[passend, nicht passend] → Treffer');

    save();
    expect(dialogRef.close).toHaveBeenCalledWith('ANY_OPEN');
  });

  it('preserves a loaded ANY_OPEN reference when saving without changes', async () => {
    dialogData.value = 'ANY_OPEN';
    const list = await renderDialog();

    await expectAsync((await list.getItems({ selected: true }))[0].getText())
      .toBeResolvedTo('Mindestens ein Wert muss passen');
    expect(getHelp()?.textContent).toContain('[passend, nicht passend] → Treffer');

    save();
    expect(dialogRef.close).toHaveBeenCalledWith('ANY_OPEN');
  });

  it('explains and preserves the empty-array exception for ANY_OPEN with IS_EMPTY', async () => {
    dialogData.value = 'ANY_OPEN';
    await renderDialog();

    expect(getHelp()?.textContent).toContain('Mit der Regel „Leere Eingabe“ kann auch ein leeres Array []');
    save();
    expect(dialogRef.close).toHaveBeenCalledWith('ANY_OPEN');

    const coding = CodingFactory.createCodingVariable('v1');
    coding.codes = [{
      id: 1,
      type: 'FULL_CREDIT',
      score: 1,
      label: '',
      ruleSets: [{
        valueArrayPos: dialogRef.close.calls.mostRecent().args[0] as RuleSet['valueArrayPos'],
        ruleOperatorAnd: false,
        rules: [{ method: 'IS_EMPTY', parameters: [] }]
      }]
    }];
    const varInfo: VariableInfo = {
      id: 'v1',
      type: 'string',
      format: '',
      multiple: true,
      nullable: false,
      values: [],
      valuePositionLabels: []
    };
    expect(CodingSchemeFactory.validate([varInfo], [coding])).toEqual([]);

    const empty = CodingFactory.code({ id: 'v1', value: [], status: 'VALUE_CHANGED' }, coding);
    expect(empty.status).toBe('CODING_COMPLETE');
    expect(empty.code).toBe(1);
    const notEmpty = CodingFactory.code({ id: 'v1', value: ['Antwort'], status: 'VALUE_CHANGED' }, coding);
    expect(notEmpty.status).toBe('CODING_INCOMPLETE');
    expect(notEmpty.code).toBeUndefined();
  });

  it('labels a numeric reference as a specific position and keeps its zero-based value', async () => {
    dialogData.value = 3;
    const list = await renderDialog();

    await expectAsync((await list.getItems({ selected: true }))[0].getText()).toBeResolvedTo('Bestimmte Position:');
    expect(fixture.nativeElement.querySelector('input[type="number"]').value).toBe('4');
    expect(getHelp()).toBeNull();

    save();
    expect(dialogRef.close).toHaveBeenCalledWith(3);
  });

  it('keeps the existing fragment labels without array-specific options or explanations', async () => {
    dialogData.isFragmentMode = true;
    const list = await renderDialog();

    expect((await list.getItems()).length).toBe(2);
    await expectAsync((await list.getItems({ selected: true }))[0].getText()).toBeResolvedTo('Irgendeines');
    expect(getHelp()).toBeNull();

    save();
    expect(dialogRef.close).toHaveBeenCalledWith('ANY');
  });
});
