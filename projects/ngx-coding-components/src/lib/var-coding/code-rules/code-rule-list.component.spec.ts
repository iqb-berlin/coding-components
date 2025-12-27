import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { of } from 'rxjs';
import { RuleSet } from '@iqbspecs/coding-scheme/coding-scheme.interface';
import { SchemerService } from '../../services/schemer.service';
import { CodeRuleListComponent } from './code-rule-list.component';

describe('CodeRuleListComponent', () => {
  let component: CodeRuleListComponent;
  let fixture: ComponentFixture<CodeRuleListComponent>;
  let dialogOpenSpy: jasmine.Spy;

  beforeEach(async () => {
    dialogOpenSpy = jasmine.createSpy('open').and.returnValue({
      afterClosed: () => of(false)
    });

    await TestBed.configureTestingModule({
      imports: [
        CodeRuleListComponent,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useClass: TranslateFakeLoader
          }
        })
      ],
      providers: [
        {
          provide: SchemerService,
          useValue: {
            userRole: 'RW_MAXIMAL',
            ruleMethodParameterCount: {
              MATCH: 1,
              MATCH_REGEX: 1,
              NUMERIC_MATCH: 1,
              NUMERIC_RANGE: 2,
              IS_TRUE: 0,
              IS_FALSE: 0,
              IS_EMPTY: 0,
              IS_NULL: 0
            }
          }
        },
        {
          provide: MatDialog,
          useValue: {
            open: dialogOpenSpy
          }
        },
        {
          provide: MatIconRegistry,
          useValue: {
            addSvgIconLiteral: jasmine.createSpy('addSvgIconLiteral')
          }
        },
        {
          provide: DomSanitizer,
          useValue: {
            bypassSecurityTrustHtml: (v: string) => v
          }
        }
      ]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CodeRuleListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('addRule should do nothing if ruleSet is undefined', () => {
    const emitSpy = spyOn(component.codeRulesChanged, 'emit');
    component.addRule(undefined, 'MATCH');
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('addRule should add a rule and set parameters based on paramCount', () => {
    const emitSpy = spyOn(component.codeRulesChanged, 'emit');
    const rs: RuleSet = { valueArrayPos: -1, ruleOperatorAnd: false, rules: [] } as unknown as RuleSet;

    component.addRule(rs, 'MATCH');
    expect(rs.rules.length).toBe(1);
    expect(rs.rules[0].method).toBe('MATCH');
    expect(rs.rules[0].parameters).toEqual(['']);
    expect(emitSpy).toHaveBeenCalled();

    component.addRule(rs, 'NUMERIC_RANGE');
    expect(rs.rules.length).toBe(2);
    expect(rs.rules[1].parameters).toEqual(['', '']);
  });

  it('changeRule should preserve parameters for compatible string/numeric_match transitions', () => {
    const emitSpy = spyOn(component.codeRulesChanged, 'emit');
    const rs: RuleSet = {
      valueArrayPos: -1,
      ruleOperatorAnd: false,
      rules: [{ method: 'MATCH', parameters: ['abc'] } as unknown as never]
    } as unknown as RuleSet;

    component.changeRule(rs, 0, 'MATCH_REGEX');
    expect(rs.rules[0].method).toBe('MATCH_REGEX');
    expect(rs.rules[0].parameters).toEqual(['abc']);

    component.changeRule(rs, 0, 'NUMERIC_MATCH');
    expect(rs.rules[0].method).toBe('NUMERIC_MATCH');
    expect(rs.rules[0].parameters).toEqual(['abc']);

    expect(emitSpy).toHaveBeenCalled();
  });

  it('changeRule should reset parameters when switching to unrelated rule types and clear for paramCount=0', () => {
    const rs: RuleSet = {
      valueArrayPos: -1,
      ruleOperatorAnd: false,
      rules: [{ method: 'MATCH', parameters: ['abc'] } as unknown as never]
    } as unknown as RuleSet;

    component.changeRule(rs, 0, 'NUMERIC_RANGE');
    expect(rs.rules[0].method).toBe('NUMERIC_RANGE');
    expect(rs.rules[0].parameters).toEqual(['', '']);

    component.changeRule(rs, 0, 'IS_TRUE');
    expect(rs.rules[0].method).toBe('IS_TRUE');
    expect(rs.rules[0].parameters).toEqual([]);
  });

  it('deleteRule should guard against invalid input and delete valid entries', () => {
    const emitSpy = spyOn(component.codeRulesChanged, 'emit');
    const rs: RuleSet = {
      valueArrayPos: -1,
      ruleOperatorAnd: false,
      rules: [
        { method: 'MATCH', parameters: ['a'] } as unknown as never,
        { method: 'MATCH', parameters: ['b'] } as unknown as never
      ]
    } as unknown as RuleSet;

    component.deleteRule(null as unknown as never, 0);
    component.deleteRule(rs, -1);
    component.deleteRule(rs, 99);
    expect(rs.rules.length).toBe(2);
    expect(emitSpy).not.toHaveBeenCalled();

    component.deleteRule(rs, 0);
    expect(rs.rules.length).toBe(1);
    expect(rs.rules[0].parameters?.[0]).toBe('b');
    expect(emitSpy).toHaveBeenCalled();
  });

  it('editFragmentReference should open dialog with ANY when fragment undefined and set fragment on close', () => {
    const emitSpy = spyOn(component.codeRulesChanged, 'emit');
    const rule = { method: 'MATCH', parameters: ['x'] } as unknown as { fragment?: unknown };

    dialogOpenSpy.and.returnValue({
      afterClosed: () => of('ANY_OPEN')
    });

    component.editFragmentReference(rule as unknown as never);

    expect(dialogOpenSpy).toHaveBeenCalled();
    const config = dialogOpenSpy.calls.mostRecent().args[1] as { data: { value: unknown } };
    expect(config.data.value).toBe('ANY');
    expect(rule.fragment).toBe('ANY_OPEN');
    expect(emitSpy).toHaveBeenCalled();
  });
});
