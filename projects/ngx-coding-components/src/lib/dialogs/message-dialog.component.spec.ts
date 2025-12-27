import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';

import { MessageDialogComponent, MessageDialogData, MessageType } from './message-dialog.component';

describe('MessageDialogComponent', () => {
  let fixture: ComponentFixture<MessageDialogComponent>;
  let component: MessageDialogComponent;

  function create(data: Partial<MessageDialogData>) {
    const full: MessageDialogData = {
      type: MessageType.info,
      title: '',
      content: 'c',
      closeButtonLabel: '',
      ...data
    };

    TestBed.configureTestingModule({
      imports: [MessageDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: full },
        {
          provide: TranslateService,
          useValue: {
            instant: (key: string) => {
              const dict: Record<string, string> = {
                close: 'Schließen',
                'message-dialog.default-title.error': 'Achtung: Fehler',
                'message-dialog.default-title.warning': 'Achtung: Warnung',
                'message-dialog.default-title.info': 'Achtung: Info'
              };
              return dict[key] ?? key;
            }
          }
        }
      ]
    });

    fixture = TestBed.createComponent(MessageDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should apply default title for error and default close label if blank', () => {
    create({ type: MessageType.error, title: '   ', closeButtonLabel: '   ' });

    component.ngOnInit();
    expect(component.messageData.title).toBe('Achtung: Fehler');
    expect(component.messageData.closeButtonLabel).toBe('Schließen');
  });

  it('should apply default title for warning', () => {
    create({ type: MessageType.warning, title: '' });

    component.ngOnInit();
    expect(component.messageData.title).toBe('Achtung: Warnung');
  });

  it('should keep custom title when non-empty', () => {
    create({ type: MessageType.info, title: 'Hello', closeButtonLabel: 'Close' });

    component.ngOnInit();
    expect(component.messageData.title).toBe('Hello');
    expect(component.messageData.closeButtonLabel).toBe('Close');
  });
});
