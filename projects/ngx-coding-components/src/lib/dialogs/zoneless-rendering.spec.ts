import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { CodeInstructionComponent } from '../var-coding/code-instruction.component';
import { CodesTitleComponent } from '../var-coding/codes-title.component';
import { EditProcessingDialogData } from '../var-coding/dialogs/edit-processing-dialog.component';
import { SelectVariableDialogComponent, SelectVariableDialogData } from './select-variable-dialog.component';

describe('native zoneless rendering boundaries', () => {
  it('renders an asynchronously returned instruction without forced change detection', async () => {
    expect('Zone' in window).toBeFalse();
    const closed = new Subject<string>();
    await TestBed.configureTestingModule({
      imports: [CodeInstructionComponent, TranslateModule.forRoot()],
      providers: [{ provide: MatDialog, useValue: { open: () => ({ afterClosed: () => closed }) } }]
    }).compileComponents();
    const fixture = TestBed.createComponent(CodeInstructionComponent);
    fixture.componentRef.setInput('code', {
      id: 0, type: 'FULL_CREDIT', score: 0, label: '', manualInstruction: '<p>Before</p>'
    });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Before');

    fixture.componentInstance.editTextDialog_manualInstruction();
    await Promise.resolve();
    closed.next('<p>Asynchronous instruction</p>');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Asynchronous instruction');
    expect(fixture.nativeElement.textContent).not.toContain('Before');
    closed.complete();
  });

  it('renders processing and fragments after an asynchronous dialog result', async () => {
    const closed = new Subject<EditProcessingDialogData>();
    await TestBed.configureTestingModule({
      imports: [CodesTitleComponent, TranslateModule.forRoot()],
      providers: [{ provide: MatDialog, useValue: { open: () => ({ afterClosed: () => closed }) } }]
    }).compileComponents();
    const fixture = TestBed.createComponent(CodesTitleComponent);
    fixture.componentRef.setInput('processing', []);
    await fixture.whenStable();
    fixture.componentInstance.editProcessingAndFragments();
    await Promise.resolve();
    closed.next({ fragmenting: '(fragment)', processing: ['IGNORE_CASE'] });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('processing.IGNORE_CASE');
    expect(fixture.nativeElement.textContent).toContain('(fragment)');
    closed.complete();
  });

  it('renders the delayed selection and enables confirmation without Zone.js', async () => {
    const variable = { id: 'v', alias: 'AliasV', sourceType: 'BASE' as const };
    const data: SelectVariableDialogData = {
      title: 'Select',
      prompt: '',
      variables: [variable],
      selectedVariable: variable,
      codingStatus: {},
      okButtonLabel: 'Confirm'
    };
    await TestBed.configureTestingModule({
      imports: [SelectVariableDialogComponent, TranslateModule.forRoot()],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: { close: () => undefined } }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(SelectVariableDialogComponent);
    await fixture.whenStable();
    // The component deliberately initializes its selection after 500 ms.
    await new Promise(resolve => { setTimeout(resolve, 550); });
    await fixture.whenStable();
    expect(fixture.componentInstance.getSelected()).toEqual(['AliasV']);
    const button = fixture.nativeElement.querySelector('button');
    expect(button.disabled).toBeFalse();
    expect(fixture.nativeElement.querySelector('mat-list-option').getAttribute('aria-selected')).toBe('true');
  });
});
