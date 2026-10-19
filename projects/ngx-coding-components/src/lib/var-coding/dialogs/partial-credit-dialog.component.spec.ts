import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SourceType } from '@iqbspecs/coding-scheme';
import translations from '../../../../translations/de.json';
import { SchemerService } from '../../services/schemer.service';
import { EditSourceParametersDialog, EditSourceParametersDialogData } from './edit-source-parameters-dialog.component';

describe('rendered partial-credit source parameters', () => {
  (['SUM_SCORE', 'SUM_CODE', 'CONCAT_CODE'] as SourceType[]).forEach(sourceType => {
    it(`renders, toggles and isolates partial-credit settings for ${sourceType}`, async () => {
      const original: EditSourceParametersDialogData = {
        selfId: 'derived',
        selfAlias: 'derived',
        sourceType,
        deriveSources: ['a'],
        sourceParameters: { processing: [] }
      };
      const service = new SchemerService();
      service.setCodingScheme({ variableCodings: [{ id: 'a', sourceType: 'BASE', codes: [] }] } as never);
      await TestBed.configureTestingModule({
        imports: [EditSourceParametersDialog, TranslateModule.forRoot()],
        providers: [
          provideNoopAnimations(),
          { provide: MAT_DIALOG_DATA, useValue: original },
          { provide: SchemerService, useValue: service }
        ]
      }).compileComponents();
      const translate = TestBed.inject(TranslateService);
      translate.setTranslation('de', translations);
      translate.use('de');
      const fixture = TestBed.createComponent(EditSourceParametersDialog);
      fixture.detectChanges();
      await fixture.whenStable();

      const element: HTMLElement = fixture.nativeElement;
      const checkboxIndex = sourceType === 'CONCAT_CODE' ? 1 : 0;
      const inputs = element.querySelectorAll<HTMLInputElement>('mat-checkbox input');
      expect(inputs.length).toBe(sourceType === 'CONCAT_CODE' ? 3 : 2);
      expect(inputs[checkboxIndex].checked).toBeFalse();
      expect(element.textContent).toContain(sourceType === 'CONCAT_CODE' ? 'durch x ersetzen' : 'als 0 werten');
      expect(element.textContent).toContain('mindestens eine regulär kodierte Teilantwort');
      inputs[checkboxIndex].click();
      fixture.detectChanges();
      expect(fixture.componentInstance.data.sourceParameters.processing).toContain('TAKE_DISPLAYED_AS_ZERO_IF_PARTIAL');
      expect(original.sourceParameters.processing).toEqual([]);
      inputs[checkboxIndex].click();
      fixture.detectChanges();
      expect(fixture.componentInstance.data.sourceParameters.processing).toEqual([]);
      fixture.componentInstance.data.sourceType = 'SOLVER';
      fixture.componentInstance.updatePossibleDeriveProcessing();
      fixture.changeDetectorRef.markForCheck();
      await fixture.whenStable();
      expect(element.querySelectorAll('mat-checkbox').length).toBe(0);
      fixture.destroy();
    });
  });
});
