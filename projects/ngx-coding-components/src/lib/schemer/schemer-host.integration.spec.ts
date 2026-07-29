import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogModule } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { CodingFactory } from '@iqb/responses/coding-factory';
import { CodingScheme } from '@iqbspecs/coding-scheme';
import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';
import { VarCodingComponent } from '../var-coding/var-coding.component';
import { SchemerComponent } from './schemer.component';

@Component({
  template: `
    @if (showSchemer) {
      <iqb-schemer
        [varList]="varList"
        [codingScheme]="codingScheme"
      ></iqb-schemer>
    }
  `,
  standalone: true,
  imports: [SchemerComponent]
})
class SchemerHostComponent {
  showSchemer = true;
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
    fixture.detectChanges();
  });

  const getSchemer = (): SchemerComponent => fixture.debugElement
    .query(By.directive(SchemerComponent))
    .componentInstance as SchemerComponent;

  const getVarCoding = (): VarCodingComponent => fixture.debugElement
    .query(By.directive(VarCodingComponent))
    .componentInstance as VarCodingComponent;

  it('should display a selected coding immediately after rebuilding its host', () => {
    const firstSchemer = getSchemer();
    expect(firstSchemer.selectedCoding$.getValue()?.id).toBe('base');
    expect(getVarCoding().varCoding?.id).toBe('base');

    fixture.componentInstance.showSchemer = false;
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.directive(SchemerComponent)))
      .toBeNull();

    fixture.componentInstance.showSchemer = true;
    fixture.detectChanges();

    const rebuiltSchemer = getSchemer();
    expect(rebuiltSchemer).not.toBe(firstSchemer);
    expect(rebuiltSchemer.selectedCoding$.getValue()?.id).toBe('base');
    expect(getVarCoding().varCoding?.id).toBe('base');
    expect(fixture.nativeElement.querySelector('.var-list-entry.selected'))
      .not.toBeNull();
  });
});
