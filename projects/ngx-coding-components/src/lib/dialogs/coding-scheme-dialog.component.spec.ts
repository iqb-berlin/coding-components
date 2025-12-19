import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { of, Subject } from 'rxjs';

import { CodingSchemeDialogComponent } from './coding-scheme-dialog.component';

describe('CodingSchemeDialogComponent', () => {
  let component: CodingSchemeDialogComponent;
  let fixture: ComponentFixture<CodingSchemeDialogComponent>;
  let clipboard: jasmine.SpyObj<Clipboard>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<CodingSchemeDialogComponent>>;
  let translate: TranslateService;

  beforeEach(async () => {
    clipboard = jasmine.createSpyObj<Clipboard>('Clipboard', ['copy']);
    snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    dialogRef = jasmine.createSpyObj<MatDialogRef<CodingSchemeDialogComponent>>('MatDialogRef', ['close']);
    const translateStub = {
      onTranslationChange: new Subject(),
      onLangChange: new Subject(),
      onDefaultLangChange: new Subject(),
      get: (key: string | string[]) => {
        if (key === 'copied-to-clipboard') return of('Copied');
        return of(key as unknown as string);
      },
      stream: (key: string | string[]) => {
        if (key === 'copied-to-clipboard') return of('Copied');
        return of(key as unknown as string);
      }
    };
    translate = translateStub as unknown as TranslateService;

    await TestBed.configureTestingModule({
      imports: [CodingSchemeDialogComponent],
      providers: [
        { provide: Clipboard, useValue: clipboard },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: TranslateService, useValue: translate },
        { provide: MAT_DIALOG_DATA, useValue: { codingScheme: { a: 1 } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CodingSchemeDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should stringify dialog data in constructor', () => {
    expect(component.jsonData).toBe(JSON.stringify({ a: 1 }, null, 2));
  });

  it('onCopy should copy jsonData and show snackbar with translated message', () => {
    const getSpy = spyOn(translate, 'get').and.callThrough();

    component.onCopy();

    expect(clipboard.copy).toHaveBeenCalledWith(component.jsonData);
    expect(getSpy).toHaveBeenCalledWith('copied-to-clipboard');
    expect(snackBar.open).toHaveBeenCalledWith('Copied', '', { duration: 1000 });
  });

  it('onClose should close the dialog', () => {
    component.onClose();
    expect(dialogRef.close).toHaveBeenCalled();
  });
});
