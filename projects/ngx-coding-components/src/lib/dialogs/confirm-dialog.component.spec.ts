import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  let component: ConfirmDialogComponent;
  let fixture: ComponentFixture<ConfirmDialogComponent>;

  const baseData: ConfirmDialogData = {
    title: '',
    content: 'content',
    confirmButtonLabel: '',
    showCancel: true
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: { ...baseData }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
  });

  it('should set default title and confirmButtonLabel if empty', () => {
    component.ngOnInit();

    expect(component.confirmData.title).toBe('Bitte bestätigen!');
    expect(component.confirmData.confirmButtonLabel).toBe('Bestätigen');
  });

  it('should hide cancel button when showCancel is false', async () => {
    await TestBed.resetTestingModule().configureTestingModule({
      imports: [ConfirmDialogComponent],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            title: 't',
            content: 'c',
            confirmButtonLabel: 'ok',
            showCancel: false
          } as ConfirmDialogData
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;

    component.ngOnInit();
    expect(component.showCancel).toBeFalse();
  });
});
