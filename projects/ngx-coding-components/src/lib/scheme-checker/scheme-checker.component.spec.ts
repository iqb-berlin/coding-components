import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { CodingSchemeFactory } from '@iqb/responses';
import { Response } from '@iqbspecs/response/response.interface';
import { VariableCodingData } from '@iqbspecs/coding-scheme/coding-scheme.interface';

import { SchemeCheckerComponent } from './scheme-checker.component';
import { ShowCodingResultsComponent } from './show-coding-results.component';

describe('SchemeCheckerComponent', () => {
  let component: SchemeCheckerComponent;
  let fixture: ComponentFixture<SchemeCheckerComponent>;
  let dialogOpenSpy: jasmine.Spy;

  beforeEach(async () => {
    dialogOpenSpy = jasmine.createSpy('open');

    await TestBed.configureTestingModule({
      imports: [SchemeCheckerComponent],
      providers: [
        {
          provide: MatDialog,
          useValue: {
            open: dialogOpenSpy
          }
        }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SchemeCheckerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should reset values when codingScheme input is set to null', () => {
    component.codingScheme = {
      variableCodings: [
        { id: 'v1', alias: 'A', sourceType: 'BASE' } as unknown as VariableCodingData
      ]
    } as unknown as never;
    expect(Object.keys(component.values)).toEqual(['A']);

    component.codingScheme = null;
    expect(Object.keys(component.values)).toEqual([]);
  });

  it('updateInputValue should update value when source element exists and ignore null source', () => {
    component.values['A'] = 'old';
    component.updateInputValue({ value: 'new' } as unknown as HTMLInputElement, 'A');
    expect(component.values['A']).toBe('new');

    component.updateInputValue(null, 'A');
    expect(component.values['A']).toBe('new');
  });

  it('startEvaluation should do nothing when no codingScheme is set', () => {
    component.codingScheme = null;

    const codeSpy = spyOn(CodingSchemeFactory, 'code').and.returnValue([] as unknown as Response[]);
    component.startEvaluation();

    expect(codeSpy).not.toHaveBeenCalled();
    expect(dialogOpenSpy).not.toHaveBeenCalled();
  });

  it('should initialize values from BASE variables when codingScheme input is set', () => {
    const variableCodings: VariableCodingData[] = [
      {
        id: 'v2',
        alias: 'B',
        sourceType: 'BASE'
      } as unknown as VariableCodingData,
      {
        id: 'v1',
        alias: 'A',
        sourceType: 'BASE'
      } as unknown as VariableCodingData,
      {
        id: 'd1',
        alias: 'D',
        sourceType: 'DERIVE'
      } as unknown as VariableCodingData
    ];

    component.codingScheme = {
      variableCodings
    } as unknown as never;

    expect(Object.keys(component.values)).toEqual(['A', 'B']);
    expect(component.values['A']).toBe('');
    expect(component.values['B']).toBe('');
  });

  it('startEvaluation should open result dialog and parse JSON array inputs before coding', () => {
    const variableCodings: VariableCodingData[] = [
      {
        id: 'v1',
        alias: 'A',
        sourceType: 'BASE',
        codes: [{
          id: 1,
          type: 'FULL_CREDIT',
          label: 'x',
          score: 1
        }]
      } as unknown as VariableCodingData
    ];

    component.codingScheme = {
      variableCodings
    } as unknown as never;
    component.values['A'] = '["x","y"]';

    const codeSpy = spyOn(CodingSchemeFactory, 'code').and.returnValue([] as unknown as Response[]);

    component.startEvaluation();

    expect(codeSpy).toHaveBeenCalled();
    const passedResponses = codeSpy.calls.mostRecent().args[0] as Response[];
    expect(passedResponses.length).toBe(1);
    expect(passedResponses[0].id).toBe('v1');
    expect(passedResponses[0].value).toEqual(['x', 'y']);

    expect(dialogOpenSpy).toHaveBeenCalled();
    expect(dialogOpenSpy.calls.mostRecent().args[0]).toBe(ShowCodingResultsComponent);
    const config = dialogOpenSpy.calls.mostRecent().args[1] as { data: unknown };
    expect(config.data).toEqual(jasmine.objectContaining({
      varsWithCodes: ['v1']
    }));
  });

  it('startEvaluation should fall back to trimmed string when JSON array parsing fails', () => {
    const variableCodings: VariableCodingData[] = [
      {
        id: 'v1',
        alias: 'A',
        sourceType: 'BASE'
      } as unknown as VariableCodingData
    ];

    component.codingScheme = {
      variableCodings
    } as unknown as never;
    component.values['A'] = '[invalid json';

    const codeSpy = spyOn(CodingSchemeFactory, 'code').and.returnValue([] as unknown as Response[]);

    component.startEvaluation();

    expect(codeSpy).toHaveBeenCalled();
    const passedResponses = codeSpy.calls.mostRecent().args[0] as Response[];
    expect(passedResponses.length).toBe(1);
    expect(passedResponses[0].value).toBe('[invalid json');
  });

  it('startEvaluation should set VALUE_CHANGED for entered values and DISPLAYED for empty BASE vars', () => {
    const variableCodings: VariableCodingData[] = [
      {
        id: 'v1',
        alias: 'A',
        sourceType: 'BASE'
      } as unknown as VariableCodingData,
      {
        id: 'v2',
        alias: 'B',
        sourceType: 'BASE'
      } as unknown as VariableCodingData,
      {
        id: 'd1',
        alias: 'D',
        sourceType: 'DERIVE'
      } as unknown as VariableCodingData
    ];

    component.codingScheme = {
      variableCodings
    } as unknown as never;
    component.values['A'] = '  x  ';

    const codeSpy = spyOn(CodingSchemeFactory, 'code').and.returnValue([] as unknown as Response[]);

    component.startEvaluation();

    expect(codeSpy).toHaveBeenCalled();
    const passedResponses = codeSpy.calls.mostRecent().args[0] as Response[];

    const byId = (id: string) => passedResponses.find(r => r.id === id);
    expect(byId('v1')?.status).toBe('VALUE_CHANGED');
    expect(byId('v1')?.value).toBe('x');

    expect(byId('v2')?.status).toBe('DISPLAYED');
    expect(byId('v2')?.value).toBe('');

    expect(byId('d1')).toBeUndefined();
  });
});
