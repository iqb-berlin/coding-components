import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { of, Subject } from 'rxjs';

import { SimpleInputDialogComponent, SimpleInputDialogData } from './simple-input-dialog.component';

describe('SimpleInputDialogComponent', () => {
  let fixture: ComponentFixture<SimpleInputDialogComponent>;
  let component: SimpleInputDialogComponent;

  it('should set defaults and reflect showCancel=false', async () => {
    const data: SimpleInputDialogData = {
      title: '   ',
      prompt: 'p',
      placeholder: '   ',
      saveButtonLabel: ' ',
      value: 'v',
      showCancel: false
    };

    await TestBed.configureTestingModule({
      imports: [SimpleInputDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        {
          provide: TranslateService,
          useValue: {
            onTranslationChange: new Subject(),
            onLangChange: new Subject(),
            onDefaultLangChange: new Subject(),
            get: (key: string | string[]) => of(key as unknown as string),
            stream: (key: string | string[]) => of(key as unknown as string)
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SimpleInputDialogComponent);
    component = fixture.componentInstance;

    component.ngOnInit();

    expect(component.inputData.title).toBe('Dateneingabe');
    expect(component.inputData.saveButtonLabel).toBe('OK');
    expect(component.inputData.placeholder).toBe('Bitte eingeben');
    expect(component.showCancel).toBeFalse();
  });
});
