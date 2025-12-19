import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { VariableCodingData } from '@iqbspecs/coding-scheme/coding-scheme.interface';

import { VarCodingComponent } from './var-coding.component';
import { SchemerService } from '../services/schemer.service';

describe('VarCodingComponent', () => {
  let component: VarCodingComponent;
  let fixture: ComponentFixture<VarCodingComponent>;
  let dialogOpenSpy: jasmine.Spy;
  let schemerService: SchemerService;

  beforeEach(async () => {
    dialogOpenSpy = jasmine.createSpy('open').and.returnValue({
      afterClosed: () => of(false)
    });

    await TestBed.configureTestingModule({
      imports: [
        VarCodingComponent,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useClass: TranslateFakeLoader
          }
        })
      ],
      providers: [
        {
          provide: MatDialog,
          useValue: {
            open: dialogOpenSpy
          }
        },
        {
          provide: SchemerService,
          useValue: {
            userRole: 'RW_MAXIMAL'
          }
        }
      ]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(VarCodingComponent);
    component = fixture.componentInstance;
    schemerService = TestBed.inject(SchemerService);
    fixture.detectChanges();
  });

  it('wipeInstructions should clear manualInstruction and emit varCodingChanged', () => {
    const emitSpy = spyOn(component.varCodingChanged, 'emit');
    component.varCoding = {
      id: 'v1',
      alias: 'A',
      sourceType: 'BASE',
      manualInstruction: '<p>text</p>',
      codes: []
    } as unknown as VariableCodingData;

    component.wipeInstructions();

    expect(component.varCoding?.manualInstruction).toBe('');
    expect(emitSpy).toHaveBeenCalledWith(component.varCoding);
  });

  it('editSourceParameters should not open dialog if userRole is RO', () => {
    (schemerService as unknown as { userRole: string }).userRole = 'RO';
    component.varCoding = {
      id: 'v1',
      alias: 'A',
      sourceType: 'BASE',
      sourceParameters: {},
      deriveSources: []
    } as unknown as VariableCodingData;

    component.editSourceParameters();

    expect(dialogOpenSpy).not.toHaveBeenCalled();
  });
});
