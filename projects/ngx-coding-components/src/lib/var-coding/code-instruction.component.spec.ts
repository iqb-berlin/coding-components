import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { DomSanitizer } from '@angular/platform-browser';
import {
  TranslateFakeLoader,
  TranslateLoader,
  TranslateModule,
  TranslateService
} from '@ngx-translate/core';
import { of } from 'rxjs';

import { CodeInstructionComponent } from './code-instruction.component';

describe('CodeInstructionComponent', () => {
  let component: CodeInstructionComponent;
  let fixture: ComponentFixture<CodeInstructionComponent>;
  let dialogOpenSpy: jasmine.Spy;
  let sanitizer: { bypassSecurityTrustHtml: jasmine.Spy };
  let translateService: { instant: jasmine.Spy };

  beforeEach(async () => {
    dialogOpenSpy = jasmine.createSpy('open').and.returnValue({
      afterClosed: () => of(undefined)
    });

    sanitizer = {
      bypassSecurityTrustHtml: jasmine.createSpy('bypassSecurityTrustHtml').and.callFake((x: string) => x)
    };

    translateService = {
      instant: jasmine.createSpy('instant').and.callFake((k: string) => k)
    };

    await TestBed.configureTestingModule({
      imports: [
        CodeInstructionComponent,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useClass: TranslateFakeLoader
          }
        })
      ],
      providers: [
        { provide: MatDialog, useValue: { open: dialogOpenSpy } },
        { provide: DomSanitizer, useValue: sanitizer },
        { provide: TranslateService, useValue: translateService }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CodeInstructionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('getSanitizedText should delegate to DomSanitizer', () => {
    const result = component.getSanitizedText('<p>x</p>');
    expect(sanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith('<p>x</p>');
    expect(result as unknown as string).toBe('<p>x</p>');
  });

  it('editTextDialog_manualInstruction should not open when code is undefined', () => {
    component.code = undefined;
    component.editTextDialog_manualInstruction();
    expect(dialogOpenSpy).not.toHaveBeenCalled();
  });

  it('editTextDialog_manualInstruction should update code and emit when dialog returns string', () => {
    component.code = {
      id: 1,
      type: 'FULL_CREDIT',
      label: '',
      score: 1,
      manualInstruction: 'old'
    } as unknown as never;

    dialogOpenSpy.and.returnValue({
      afterClosed: () => of('<p>new</p>')
    });

    const emitSpy = spyOn(component.codeDataChanged, 'emit');

    component.editTextDialog_manualInstruction();

    expect(dialogOpenSpy).toHaveBeenCalled();
    expect(translateService.instant).toHaveBeenCalledWith('manual-instruction.code.prompt-edit');
    expect((component.code as unknown as { manualInstruction: string }).manualInstruction).toBe('<p>new</p>');
    expect(emitSpy).toHaveBeenCalledWith(component.code);
  });

  it('editTextDialog_manualInstruction should do nothing when dialog returns false or undefined', () => {
    component.code = {
      id: 1,
      type: 'FULL_CREDIT',
      label: '',
      score: 1,
      manualInstruction: 'old'
    } as unknown as never;

    dialogOpenSpy.and.returnValue({ afterClosed: () => of(false) });
    const emitSpy = spyOn(component.codeDataChanged, 'emit');

    component.editTextDialog_manualInstruction();
    expect((component.code as unknown as { manualInstruction: string }).manualInstruction).toBe('old');
    expect(emitSpy).not.toHaveBeenCalled();

    dialogOpenSpy.and.returnValue({ afterClosed: () => of(undefined) });
    component.editTextDialog_manualInstruction();
    expect((component.code as unknown as { manualInstruction: string }).manualInstruction).toBe('old');
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('wipeInstructions should clear manualInstruction and emit when code exists', () => {
    component.code = {
      id: 1,
      type: 'FULL_CREDIT',
      label: '',
      score: 1,
      manualInstruction: '<p>x</p>'
    } as unknown as never;

    const emitSpy = spyOn(component.codeDataChanged, 'emit');
    component.wipeInstructions();

    expect((component.code as unknown as { manualInstruction: string }).manualInstruction).toBe('');
    expect(emitSpy).toHaveBeenCalledWith(component.code);
  });
});
