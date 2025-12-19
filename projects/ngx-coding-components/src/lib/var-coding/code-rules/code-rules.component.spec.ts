import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';

import { CodeData } from '@iqbspecs/coding-scheme/coding-scheme.interface';

import { CodeRulesComponent } from './code-rules.component';

describe('CodeRulesComponent', () => {
  let component: CodeRulesComponent;
  let fixture: ComponentFixture<CodeRulesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CodeRulesComponent,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useClass: TranslateFakeLoader
          }
        })
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
});
