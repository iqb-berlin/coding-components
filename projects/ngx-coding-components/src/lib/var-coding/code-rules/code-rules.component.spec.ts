import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { CodeData } from '@iqbspecs/coding-scheme/coding-scheme.interface';

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

  it('deleteRuleSet should remove a ruleset and emit codeRulesChanged', () => {
    const emitSpy = spyOn(component.codeRulesChanged, 'emit');

    component.code = {
      id: 1,
      type: 'FULL_CREDIT',
      label: 'x',
      score: 1,
      ruleSets: [
        {
          valueArrayPos: -1,
          ruleOperatorAnd: false,
          rules: [{ method: 'MATCH', parameters: ['a'] }]
        },
        {
          valueArrayPos: -1,
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

  it('editArrayReference should not change valueArrayPos when dialog returns false', () => {
    const emitSpy = spyOn(component.codeRulesChanged, 'emit');
    const rs = { valueArrayPos: -1, ruleOperatorAnd: false, rules: [] } as unknown as never;

    dialogOpenSpy.and.returnValue({
      afterClosed: () => of(false)
    });

    component.editArrayReference(rs);

    expect(dialogOpenSpy).toHaveBeenCalled();
    expect((rs as unknown as { valueArrayPos: number }).valueArrayPos).toBe(-1);
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('editArrayReference should update valueArrayPos and emit when dialog returns a value', () => {
    const emitSpy = spyOn(component.codeRulesChanged, 'emit');
    const rs = { valueArrayPos: -1, ruleOperatorAnd: false, rules: [] } as unknown as never;

    dialogOpenSpy.and.returnValue({
      afterClosed: () => of(2)
    });

    component.editArrayReference(rs);

    expect((rs as unknown as { valueArrayPos: number }).valueArrayPos).toBe(2);
    expect(emitSpy).toHaveBeenCalled();
  });
});
