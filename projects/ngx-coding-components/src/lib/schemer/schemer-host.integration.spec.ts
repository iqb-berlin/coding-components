import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { CodingFactory } from '@iqb/responses/coding-factory';
import { CodingScheme } from '@iqbspecs/coding-scheme';
import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';
import { VarCodingComponent } from '../var-coding/var-coding.component';
import { CodesTitleComponent } from '../var-coding/codes-title.component';
import { CodeRulesComponent } from '../var-coding/code-rules/code-rules.component';
import { CodeRuleListComponent } from '../var-coding/code-rules/code-rule-list.component';
import { UserRoleType } from '../services/schemer.service';
import { SchemerComponent } from './schemer.component';

@Component({
  template: `
    @if (showSchemer()) {
      <iqb-schemer
        [varList]="varList"
        [codingScheme]="codingScheme"
        [userRole]="userRole()"
      ></iqb-schemer>
    }
  `,
  standalone: true,
  imports: [SchemerComponent]
})
class SchemerHostComponent {
  readonly showSchemer = signal(true);
  readonly userRole = signal<UserRoleType>('RW_MAXIMAL');
  varList = [{
    id: 'base',
    alias: 'Base',
    type: 'string',
    format: '',
    multiple: false,
    nullable: false,
    values: [],
    valuePositionLabels: []
  } as VariableInfo];

  codingScheme = new CodingScheme([
    CodingFactory.createCodingVariable('base')
  ]);
}

describe('Schemer host lifecycle integration', () => {
  let fixture: ComponentFixture<SchemerHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        SchemerHostComponent,
        MatDialogModule,
        NoopAnimationsModule,
        TranslateModule.forRoot()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SchemerHostComponent);
    fixture.componentInstance.codingScheme.variableCodings[0].codes = [{
      id: 1,
      type: 'FULL_CREDIT',
      score: 1,
      ruleSets: [{ ruleOperatorAnd: false, rules: [{ method: 'MATCH', parameters: ['Keep'] }] }]
    }];
    await fixture.whenStable();
  });

  const getSchemer = (): SchemerComponent => fixture.debugElement
    .query(By.directive(SchemerComponent))
    .componentInstance as SchemerComponent;

  const getVarCoding = (): VarCodingComponent => fixture.debugElement
    .query(By.directive(VarCodingComponent))
    .componentInstance as VarCodingComponent;

  it('should display a selected coding immediately after rebuilding its host', async () => {
    const firstSchemer = getSchemer();
    expect(firstSchemer.selectedCoding$.getValue()?.id).toBe('base');
    expect(getVarCoding().varCoding?.id).toBe('base');

    fixture.componentInstance.showSchemer.set(false);
    await fixture.whenStable();
    expect(fixture.debugElement.query(By.directive(SchemerComponent)))
      .toBeNull();

    fixture.componentInstance.showSchemer.set(true);
    await fixture.whenStable();

    const rebuiltSchemer = getSchemer();
    expect(rebuiltSchemer).not.toBe(firstSchemer);
    expect(rebuiltSchemer.selectedCoding$.getValue()?.id).toBe('base');
    expect(getVarCoding().varCoding?.id).toBe('base');
    expect(fixture.nativeElement.querySelector('.var-list-entry.selected'))
      .not.toBeNull();
  });

  it('reports a typed value before blur, save or navigation can read an older scheme', () => {
    let reported: string | undefined;
    getSchemer().codingSchemeChanged.subscribe(scheme => { reported = JSON.stringify(scheme); });
    const input: HTMLInputElement = fixture.nativeElement.querySelector('var-coding .variable-details input');
    input.value = 'Immediate input';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(reported).toContain('Immediate input');
  });

  [
    {
      name: 'variable instruction',
      open: () => getVarCoding().editTextDialog_manualInstruction()
    },
    {
      name: 'processing',
      open: () => {
        const component = fixture.debugElement.query(By.directive(CodesTitleComponent))
          .componentInstance as CodesTitleComponent;
        component.editProcessingAndFragments();
      }
    },
    {
      name: 'array reference',
      open: () => {
        const component = fixture.debugElement.query(By.directive(CodeRulesComponent))
          .componentInstance as CodeRulesComponent;
        component.editArrayReference(component.code!.ruleSets![0]);
      }
    },
    {
      name: 'fragment reference',
      open: () => {
        const component = fixture.debugElement.query(By.directive(CodeRuleListComponent))
          .componentInstance as CodeRuleListComponent;
        component.editFragmentReference(component.ruleSet!.rules[0]);
      }
    }
  ].forEach(editor => {
    it(`closes the ${editor.name} dialog on a role-only host change`, async () => {
      const scheme = fixture.componentInstance.codingScheme;
      const child = getVarCoding();
      const coding = child.varCoding!;
      child.schemerService.setCopiedCode(null);
      await fixture.whenStable();
      const before = JSON.stringify(scheme);
      const reported = spyOn(getSchemer().codingSchemeChanged, 'emit');

      editor.open();
      await fixture.whenStable();
      const dialogs = TestBed.inject(MatDialog);
      expect(dialogs.openDialogs.length).toBe(1);

      fixture.componentInstance.userRole.set('RO');
      await fixture.whenStable();

      expect(getSchemer().codingScheme).toBe(scheme);
      expect(getVarCoding()).toBe(child);
      expect(child.varCoding).toBe(coding);
      expect(child.schemerService.userRole).toBe('RO');
      expect(dialogs.openDialogs.length).toBe(0);
      expect(JSON.stringify(scheme)).toBe(before);
      expect(reported).not.toHaveBeenCalled();
    });
  });

  it('keeps an instruction dialog open and saves its result while the role remains unchanged', async () => {
    const child = getVarCoding();
    const reported = spyOn(getSchemer().codingSchemeChanged, 'emit');
    child.editTextDialog_manualInstruction();
    await fixture.whenStable();
    const dialogs = TestBed.inject(MatDialog);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(dialogs.openDialogs.length).toBe(1);

    dialogs.openDialogs[0].close('<p>Current instruction</p>');
    await fixture.whenStable();
    expect(child.varCoding?.manualInstruction).toBe('<p>Current instruction</p>');
    expect(reported).toHaveBeenCalledWith(fixture.componentInstance.codingScheme);
  });
});
