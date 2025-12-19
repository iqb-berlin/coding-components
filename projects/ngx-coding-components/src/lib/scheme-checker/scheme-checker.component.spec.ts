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
});
