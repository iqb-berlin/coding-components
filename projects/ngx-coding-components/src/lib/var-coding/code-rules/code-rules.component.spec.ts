import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { CodeData, RuleSet } from '@iqbspecs/coding-scheme/coding-scheme.interface';
import { CodingFactory } from '@iqb/responses';
import { SelectCodeRuleReferenceDialogComponent }
  from '../../dialogs/select-code-rule-reference-dialog.component';

import { CodeRulesComponent } from './code-rules.component';

describe('CodeRulesComponent', () => {
  let component: CodeRulesComponent;
  let fixture: ComponentFixture<CodeRulesComponent>;
  let dialogOpenSpy: jasmine.Spy;

  beforeEach(async () => {
    dialogOpenSpy = jasmine.createSpy('open').and.returnValue({
      afterClosed: () => of(false)
    });

    await TestBed.configureTestingModule({
      imports: [
        CodeRulesComponent,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useClass: TranslateFakeLoader
          }
        })
      ],
      providers: [
        {
          provide: MatDialog,
          useValue: {
            open: dialogOpenSpy
          }
        }
      ]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CodeRulesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('addRuleSet should append a ruleset, set tab index and emit codeRulesChanged', () => {
    const emitSpy = spyOn(component.codeRulesChanged, 'emit');

    component.code = {
      id: 1,
      type: 'FULL_CREDIT',
      label: 'x',
      score: 1,
      ruleSets: []
    } as unknown as CodeData;

    const tabGroupStub = { selectedIndex: 0 };
    component.ruleSetElement = tabGroupStub as unknown as never;

    component.addRuleSet();

    expect(component.code.ruleSets?.length).toBe(1);
    expect(component.code.ruleSets?.[0].rules?.[0].method).toBe('MATCH');
    expect(tabGroupStub.selectedIndex).toBe(0);
    expect(emitSpy).toHaveBeenCalledWith(component.code);
  });

  it('addRuleSet should do nothing if code is missing', () => {
    const emitSpy = spyOn(component.codeRulesChanged, 'emit');
    component.code = undefined;

    component.addRuleSet();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('new multiple-value rule sets require every marking to satisfy a single rule', () => {
    component.code = { id: 41, ruleSets: [] };
    component.varInfo = { id: 'v1', multiple: true } as typeof component.varInfo;
    component.addRuleSet();
    const ruleSet = component.code.ruleSets![0];
    expect(ruleSet.valueArrayPos).toBe('ANY');
    ruleSet.rules = [{ method: 'NUMERIC_LESS_THAN', parameters: ['74'], fragment: 0 }];
    const coding = CodingFactory.createCodingVariable('v1');
    coding.fragmenting = '^(\\d+)-(\\d+)-#';
    coding.codes = [component.code];
    const response = { id: 'v1', status: 'VALUE_CHANGED' as const, value: ['69-70-#f9f871', '78-79-#f9f871'] };
    expect(CodingFactory.code(response, coding).status).toBe('CODING_INCOMPLETE');
    expect(CodingFactory.code({ ...response, value: ['69-70-#f9f871'] }, coding).code).toBe(41);
  });

  it('opening and saving a legacy array reference preserves serialized coding and its result', () => {
    const coding = CodingFactory.createCodingVariable('v1');
    const ruleSet: RuleSet = {
      ruleOperatorAnd: true,
      rules: [{ method: 'MATCH', parameters: ['A'] }, { method: 'MATCH', parameters: ['B'] }]
    };
    coding.codes = [{ id: 41, ruleSets: [ruleSet] }];
    const before = JSON.stringify(coding);
    const response = { id: 'v1', status: 'VALUE_CHANGED' as const, value: ['A', 'B'] };
    const previousResult = CodingFactory.code(response, coding);
    dialogOpenSpy.and.callFake((_component, config) => {
      let result: unknown;
      const dialog = new SelectCodeRuleReferenceDialogComponent(config.data, {
        close: (value: unknown) => { result = value; }
      } as never);
      dialog.okButtonClick();
      return { afterClosed: () => of(result) };
    });
    component.editArrayReference(ruleSet);
    expect(JSON.stringify(coding)).toBe(before);
    expect(CodingFactory.code(response, JSON.parse(JSON.stringify(coding)))).toEqual(previousResult);
    expect(previousResult.code).toBe(41);
  });

  it('deleteRuleSet should remove a ruleset and emit codeRulesChanged', () => {
    const emitSpy = spyOn(component.codeRulesChanged, 'emit');

    component.code = {
      id: 1,
      type: 'FULL_CREDIT',
      label: 'x',
      score: 1,
      ruleSets: [
        {
          ruleOperatorAnd: false,
          rules: [{ method: 'MATCH', parameters: ['a'] }]
        },
        {
          ruleOperatorAnd: false,
          rules: [{ method: 'MATCH', parameters: ['b'] }]
        }
      ]
    } as unknown as CodeData;

    component.deleteRuleSet(0);

    expect(component.code.ruleSets?.length).toBe(1);
    expect(component.code.ruleSets?.[0].rules?.[0].parameters?.[0]).toBe('b');
    expect(emitSpy).toHaveBeenCalledWith(component.code);
  });

  it('deleteRuleSet should do nothing if code or ruleSets are missing', () => {
    const emitSpy = spyOn(component.codeRulesChanged, 'emit');

    component.code = undefined;
    component.deleteRuleSet(0);

    component.code = {
      id: 1, type: 'FULL_CREDIT', label: '', score: 1
    } as unknown as CodeData;
    component.deleteRuleSet(0);

    expect(emitSpy).not.toHaveBeenCalled();
  });

  [undefined, null].forEach(result => {
    it(`keeps the first array position on dismissed result ${result}`, () => {
      const reference = { valueArrayPos: 0, ruleOperatorAnd: false, rules: [] };
      const emit = spyOn(component.codeRulesChanged, 'emit');
      dialogOpenSpy.and.returnValue({ afterClosed: () => of(result) });
      component.editArrayReference(reference);
      expect(reference.valueArrayPos).toBe(0);
      expect(emit).not.toHaveBeenCalled();
    });
  });

  it('accepts the first array position as a confirmed result', () => {
    const reference = { valueArrayPos: 2, ruleOperatorAnd: false, rules: [] };
    const emit = spyOn(component.codeRulesChanged, 'emit');
    dialogOpenSpy.and.returnValue({ afterClosed: () => of(0) });
    component.editArrayReference(reference);
    expect(reference.valueArrayPos).toBe(0);
    expect(emit).toHaveBeenCalled();
  });

  it('editArrayReference should not change valueArrayPos when dialog returns false', () => {
    const emitSpy = spyOn(component.codeRulesChanged, 'emit');
    const rs = { ruleOperatorAnd: false, rules: [] } as unknown as never;

    dialogOpenSpy.and.returnValue({
      afterClosed: () => of(false)
    });

    component.editArrayReference(rs);

    expect(dialogOpenSpy).toHaveBeenCalled();
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('editArrayReference should update valueArrayPos and emit when dialog returns a value', () => {
    const emitSpy = spyOn(component.codeRulesChanged, 'emit');
    const rs = { ruleOperatorAnd: false, rules: [] } as unknown as never;

    dialogOpenSpy.and.returnValue({
      afterClosed: () => of(2)
    });

    component.editArrayReference(rs);

    expect((rs as unknown as { valueArrayPos: number }).valueArrayPos).toBe(2);
    expect(emitSpy).toHaveBeenCalled();
  });
});
