import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { VariableCodingData } from '@iqbspecs/coding-scheme/coding-scheme.interface';
import { CodingFactory } from '@iqb/responses/coding-factory';

import { VarCodingComponent } from './var-coding.component';
import { SchemerService } from '../services/schemer.service';

describe('VarCodingComponent', () => {
  let component: VarCodingComponent;
  let fixture: ComponentFixture<VarCodingComponent>;
  let dialogOpenSpy: jasmine.Spy;
  let schemerService: SchemerService;
  let addCodeSpy: jasmine.Spy;
  let canPasteSpy: jasmine.Spy;
  let pasteSpy: jasmine.Spy;
  let sortCodesSpy: jasmine.Spy;
  let getAliasSpy: jasmine.Spy;
  let setCodingToTextModeSpy: jasmine.Spy;

  beforeEach(async () => {
    dialogOpenSpy = jasmine.createSpy('open').and.returnValue({
      afterClosed: () => of(false)
    });

    addCodeSpy = jasmine.createSpy('addCode');
    canPasteSpy = jasmine.createSpy('canPasteSingleCodeInto');
    pasteSpy = jasmine.createSpy('pasteSingleCode');
    sortCodesSpy = jasmine.createSpy('sortCodes');
    getAliasSpy = jasmine.createSpy('getVariableAliasById').and.callFake((id: string) => `${id}_ALIAS`);
    setCodingToTextModeSpy = jasmine.createSpy('setCodingToTextMode');

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
            userRole: 'RW_MAXIMAL',
            codingScheme: { variableCodings: [{ id: 'b1', sourceType: 'BASE' }, { id: 'b2', sourceType: 'BASE' }] },
            codingToTextMode: 'EXTENDED',
            addCode: addCodeSpy,
            canPasteSingleCodeInto: canPasteSpy,
            pasteSingleCode: pasteSpy,
            sortCodes: sortCodesSpy,
            getVariableAliasById: getAliasSpy,
            setCodingToTextMode: setCodingToTextModeSpy
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

  it('smartSchemer without ctrlKey should ignore false/null/undefined dialog results', () => {
    const emitSpy = spyOn(component.varCodingChanged, 'emit');
    component.varCoding = {
      id: 'v1',
      alias: 'A',
      sourceType: 'BASE',
      codes: []
    } as unknown as VariableCodingData;

    const snapshot = JSON.stringify(component.varCoding);

    dialogOpenSpy.and.returnValue({ afterClosed: () => of(false) });
    component.smartSchemer({ ctrlKey: false } as unknown as MouseEvent);
    expect(JSON.stringify(component.varCoding)).toBe(snapshot);
    expect(emitSpy).not.toHaveBeenCalled();

    dialogOpenSpy.and.returnValue({ afterClosed: () => of(null) });
    component.smartSchemer({ ctrlKey: false } as unknown as MouseEvent);
    expect(JSON.stringify(component.varCoding)).toBe(snapshot);
    expect(emitSpy).not.toHaveBeenCalled();

    dialogOpenSpy.and.returnValue({ afterClosed: () => of(undefined) });
    component.smartSchemer({ ctrlKey: false } as unknown as MouseEvent);
    expect(JSON.stringify(component.varCoding)).toBe(snapshot);
    expect(emitSpy).not.toHaveBeenCalled();
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

  it('should update hasResidualAutoCode and hasIntendedIncompleteAutoCode when varCoding is set', () => {
    component.varCoding = {
      id: 'v1',
      alias: 'A',
      sourceType: 'BASE',
      codes: [
        {
          id: 1, type: 'RESIDUAL_AUTO', label: '', score: 0
        },
        {
          id: 2, type: 'INTENDED_INCOMPLETE', label: '', score: 0
        }
      ]
    } as unknown as VariableCodingData;

    expect(component.hasResidualAutoCode).toBeTrue();
    expect(component.hasIntendedIncompleteAutoCode).toBeTrue();

    component.varCoding = null;
    expect(component.hasResidualAutoCode).toBeFalse();
    expect(component.hasIntendedIncompleteAutoCode).toBeFalse();
  });

  it('canPasteSingleCode should return false if varCoding/codes missing and defer to service otherwise', () => {
    component.varCoding = null;
    expect(component.canPasteSingleCode()).toBeFalse();

    component.varCoding = { id: 'v1', alias: 'A', sourceType: 'BASE' } as unknown as VariableCodingData;
    expect(component.canPasteSingleCode()).toBeFalse();

    component.varCoding = {
      id: 'v1',
      alias: 'A',
      sourceType: 'BASE',
      codes: []
    } as unknown as VariableCodingData;

    canPasteSpy.and.returnValue(true);
    expect(component.canPasteSingleCode()).toBeTrue();
    expect(canPasteSpy).toHaveBeenCalled();
  });

  it('addCode should open MessageDialog on error string result', () => {
    component.varCoding = {
      id: 'v1',
      alias: 'A',
      sourceType: 'BASE',
      codes: []
    } as unknown as VariableCodingData;

    addCodeSpy.and.returnValue('code.error-message.no-access');

    component.addCode('FULL_CREDIT');

    expect(dialogOpenSpy).toHaveBeenCalled();
  });

  it('addCode should emit varCodingChanged on success and update residual flags', () => {
    const emitSpy = spyOn(component.varCodingChanged, 'emit');
    component.varCoding = {
      id: 'v1',
      alias: 'A',
      sourceType: 'BASE',
      codes: []
    } as unknown as VariableCodingData;

    addCodeSpy.and.callFake((codeList: unknown[]) => {
      codeList.push({
        id: 0, type: 'RESIDUAL_AUTO', label: '', score: 0
      });
      return codeList[0];
    });

    component.addCode('RESIDUAL_AUTO');

    expect(component.hasResidualAutoCode).toBeTrue();
    expect(emitSpy).toHaveBeenCalledWith(component.varCoding);
  });

  it('pasteSingleCode should show MessageDialog on error string and emit on success', () => {
    const emitSpy = spyOn(component.varCodingChanged, 'emit');
    component.varCoding = {
      id: 'v1',
      alias: 'A',
      sourceType: 'BASE',
      codes: []
    } as unknown as VariableCodingData;

    pasteSpy.and.returnValue('code.error-message.nothing-to-paste');
    component.pasteSingleCode();
    expect(dialogOpenSpy).toHaveBeenCalled();

    dialogOpenSpy.calls.reset();
    pasteSpy.and.callFake((codeList: unknown[]) => {
      codeList.push({
        id: 1, type: 'FULL_CREDIT', label: '', score: 1
      });
      return codeList[0];
    });

    component.pasteSingleCode();
    expect(dialogOpenSpy).not.toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalledWith(component.varCoding);
  });

  it('smartSchemer ctrlKey should infer code types from labels, sort codes and emit', () => {
    const emitSpy = spyOn(component.varCodingChanged, 'emit');
    component.varCoding = {
      id: 'v1',
      alias: 'A',
      sourceType: 'BASE',
      codes: [
        {
          id: 1, type: 'UNSET', label: 'teilweise richtig', score: 0
        },
        {
          id: 2, type: null, label: 'Richtig', score: 0
        },
        {
          id: 3, type: 'UNSET', label: 'falsch', score: 0
        }
      ]
    } as unknown as VariableCodingData;

    component.smartSchemer({ ctrlKey: true } as unknown as MouseEvent);

    const codes = component.varCoding?.codes as unknown as { type: string; label: string }[];
    expect(codes[0].type).toBe('PARTIAL_CREDIT');
    expect(codes[1].type).toBe('FULL_CREDIT');
    expect(codes[2].type).toBe('NO_CREDIT');
    expect(codes.map(c => c.label)).toEqual(['', '', '']);

    expect(sortCodesSpy).toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalledWith(component.varCoding);
  });

  it('editTextDialog_manualInstruction should ignore undefined/false and apply string result', () => {
    const emitSpy = spyOn(component.varCodingChanged, 'emit');
    component.varCoding = {
      id: 'v1',
      alias: 'A',
      sourceType: 'BASE',
      manualInstruction: 'old',
      codes: []
    } as unknown as VariableCodingData;

    dialogOpenSpy.and.returnValue({ afterClosed: () => of(undefined) });
    component.editTextDialog_manualInstruction();
    expect(component.varCoding?.manualInstruction).toBe('old');
    expect(emitSpy).not.toHaveBeenCalled();

    dialogOpenSpy.and.returnValue({ afterClosed: () => of(false) });
    component.editTextDialog_manualInstruction();
    expect(component.varCoding?.manualInstruction).toBe('old');
    expect(emitSpy).not.toHaveBeenCalled();

    dialogOpenSpy.and.returnValue({ afterClosed: () => of('<p>new</p>') });
    component.editTextDialog_manualInstruction();
    expect(component.varCoding?.manualInstruction).toBe('<p>new</p>');
    expect(emitSpy).toHaveBeenCalledWith(component.varCoding);
  });

  it('codingAsText should map deriveSources to aliases and set codingToTextMode when dialog returns a string', () => {
    component.varCoding = {
      id: 'v1',
      alias: 'A',
      sourceType: 'DERIVE',
      deriveSources: ['x1', 'x2'],
      codes: []
    } as unknown as VariableCodingData;

    dialogOpenSpy.calls.reset();
    setCodingToTextModeSpy.calls.reset();
    dialogOpenSpy.and.returnValue({ afterClosed: () => of('SHORT') });

    component.codingAsText();

    expect(dialogOpenSpy).toHaveBeenCalled();
    const config = dialogOpenSpy.calls.mostRecent().args[1] as { data: { varCoding: { deriveSources: string[] } } };
    expect(config.data.varCoding.deriveSources).toEqual(['x1_ALIAS', 'x2_ALIAS']);
    expect(setCodingToTextModeSpy).toHaveBeenCalledWith('SHORT');
  });

  it('codingAsText should not set codingToTextMode when dialog result is not a string', () => {
    component.varCoding = {
      id: 'v1',
      alias: 'A',
      sourceType: 'DERIVE',
      deriveSources: ['x1'],
      codes: []
    } as unknown as VariableCodingData;

    setCodingToTextModeSpy.calls.reset();
    dialogOpenSpy.and.returnValue({ afterClosed: () => of(false) });
    component.codingAsText();
    expect(setCodingToTextModeSpy).not.toHaveBeenCalled();

    dialogOpenSpy.and.returnValue({ afterClosed: () => of(undefined) });
    component.codingAsText();
    expect(setCodingToTextModeSpy).not.toHaveBeenCalled();
  });

  it('deactivateBaseVar should open confirm only if more than one BASE var exists', () => {
    component.varCoding = {
      id: 'b1',
      alias: 'B1',
      sourceType: 'BASE',
      codes: []
    } as unknown as VariableCodingData;

    dialogOpenSpy.calls.reset();

    // ensure only 1 BASE var => no dialog
    (schemerService as unknown as { codingScheme: { variableCodings: unknown[] } }).codingScheme = {
      variableCodings: [{ id: 'b1', sourceType: 'BASE' }]
    };
    component.deactivateBaseVar();
    expect(dialogOpenSpy).not.toHaveBeenCalled();
  });

  it('deactivateBaseVar should replace BASE var with no-value coding when confirmed', () => {
    const emitSpy = spyOn(component.varCodingChanged, 'emit');
    const noValue = { id: 'b1', sourceType: 'BASE_NO_VALUE', codes: [] } as unknown as VariableCodingData;
    const createSpy = spyOn(CodingFactory, 'createBaseCodingVariable').and.returnValue(noValue as never);

    component.varCoding = {
      id: 'b1',
      alias: 'B1',
      sourceType: 'BASE',
      codes: []
    } as unknown as VariableCodingData;

    (schemerService as unknown as { codingScheme: { variableCodings: VariableCodingData[] } }).codingScheme = {
      variableCodings: [
        component.varCoding,
        {
          id: 'b2', alias: 'B2', sourceType: 'BASE', codes: []
        } as unknown as VariableCodingData
      ]
    };

    dialogOpenSpy.calls.reset();
    dialogOpenSpy.and.returnValue({ afterClosed: () => of(true) });

    component.deactivateBaseVar();

    const scheme = (schemerService as unknown as
      { codingScheme: { variableCodings: VariableCodingData[] } }).codingScheme;
    expect(createSpy).toHaveBeenCalledWith('b1', 'BASE_NO_VALUE');
    expect(scheme.variableCodings.some(v => v.id === 'b1' && v.sourceType === 'BASE')).toBeFalse();
    expect(scheme.variableCodings.some(v => v.id === 'b1' &&
      (v as unknown as { sourceType: string }).sourceType === 'BASE_NO_VALUE')).toBeTrue();
    expect(emitSpy).toHaveBeenCalledWith(noValue);
    expect(component.varCoding).toBeNull();
  });

  it('deactivateBaseVar should do nothing when confirm dialog is cancelled', () => {
    const emitSpy = spyOn(component.varCodingChanged, 'emit');
    const createSpy = spyOn(CodingFactory, 'createBaseCodingVariable');

    component.varCoding = {
      id: 'b1',
      alias: 'B1',
      sourceType: 'BASE',
      codes: []
    } as unknown as VariableCodingData;

    const original = component.varCoding;
    (schemerService as unknown as { codingScheme: { variableCodings: VariableCodingData[] } }).codingScheme = {
      variableCodings: [
        component.varCoding,
        {
          id: 'b2', alias: 'B2', sourceType: 'BASE', codes: []
        } as unknown as VariableCodingData
      ]
    };

    dialogOpenSpy.and.returnValue({ afterClosed: () => of(false) });
    component.deactivateBaseVar();

    expect(createSpy).not.toHaveBeenCalled();
    expect(emitSpy).not.toHaveBeenCalled();
    expect(component.varCoding).toBe(original);
  });

  it('smartSchemer without ctrlKey should apply GeneratedCodingData and emit', () => {
    const emitSpy = spyOn(component.varCodingChanged, 'emit');
    component.varCoding = {
      id: 'v1',
      alias: 'A',
      sourceType: 'BASE',
      codes: []
    } as unknown as VariableCodingData;

    dialogOpenSpy.and.returnValue({
      afterClosed: () => of({
        processing: ['SORT_ARRAY'],
        fragmenting: 'x',
        codeModel: 'SOME',
        codes: [{
          id: 0, type: 'RESIDUAL_AUTO', label: '', score: 0
        }]
      })
    });

    component.smartSchemer({ ctrlKey: false } as unknown as MouseEvent);

    expect(component.varCoding?.processing).toEqual(['SORT_ARRAY']);
    expect(component.hasResidualAutoCode).toBeTrue();
    expect(emitSpy).toHaveBeenCalledWith(component.varCoding);
  });

  it('editSourceParameters should apply dialog result and emit', () => {
    const emitSpy = spyOn(component.varCodingChanged, 'emit');
    (schemerService as unknown as { userRole: string }).userRole = 'RW_MAXIMAL';
    component.varCoding = {
      id: 'v1',
      alias: 'A',
      sourceType: 'BASE',
      sourceParameters: { a: 1 },
      deriveSources: []
    } as unknown as VariableCodingData;

    dialogOpenSpy.and.returnValue({
      afterClosed: () => of({
        selfAlias: 'A2',
        sourceType: 'DERIVE',
        sourceParameters: { b: 2 },
        deriveSources: ['x1']
      })
    });

    component.editSourceParameters();

    expect(component.varCoding?.alias).toBe('A2');
    expect(component.varCoding?.sourceType).toBe('DERIVE');
    expect(component.varCoding?.deriveSources).toEqual(['x1']);
    expect(emitSpy).toHaveBeenCalledWith(component.varCoding);
  });

  it('editSourceParameters should ignore false/undefined dialog results', () => {
    const emitSpy = spyOn(component.varCodingChanged, 'emit');
    (schemerService as unknown as { userRole: string }).userRole = 'RW_MAXIMAL';
    component.varCoding = {
      id: 'v1',
      alias: 'A',
      sourceType: 'BASE',
      sourceParameters: { a: 1 },
      deriveSources: []
    } as unknown as VariableCodingData;

    dialogOpenSpy.and.returnValue({ afterClosed: () => of(false) });
    component.editSourceParameters();
    expect(emitSpy).not.toHaveBeenCalled();
    expect(component.varCoding?.alias).toBe('A');

    dialogOpenSpy.and.returnValue({ afterClosed: () => of(undefined) });
    component.editSourceParameters();
    expect(emitSpy).not.toHaveBeenCalled();
    expect(component.varCoding?.alias).toBe('A');
  });
});
