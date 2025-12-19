import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { CodesTitleComponent } from './codes-title.component';
import { SchemerService } from '../services/schemer.service';

describe('CodesTitleComponent', () => {
  let component: CodesTitleComponent;
  let fixture: ComponentFixture<CodesTitleComponent>;
  let schemerService: { userRole: string; sortCodes: jasmine.Spy };
  let dialogOpenSpy: jasmine.Spy;

  beforeEach(async () => {
    schemerService = {
      userRole: 'RW_MAXIMAL',
      sortCodes: jasmine.createSpy('sortCodes')
    };

    dialogOpenSpy = jasmine.createSpy('open').and.returnValue({
      afterClosed: () => of(false)
    });

    await TestBed.configureTestingModule({
      imports: [
        CodesTitleComponent,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useClass: TranslateFakeLoader
          }
        })
      ],
      providers: [
        { provide: SchemerService, useValue: schemerService },
        { provide: MatDialog, useValue: { open: dialogOpenSpy } }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CodesTitleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('sortCodes should call service.sortCodes and emit when role is not RO', () => {
    const codeList = [
      {
        id: 1,
        type: 'FULL_CREDIT',
        label: '',
        score: 1
      }
    ] as unknown as never;
    component.codeList = codeList;

    const emitSpy = spyOn(component.codeListChanged, 'emit');
    component.sortCodes({ ctrlKey: true } as unknown as MouseEvent);

    expect(schemerService.sortCodes).toHaveBeenCalledWith(codeList, true);
    expect(emitSpy).toHaveBeenCalledWith(codeList);
  });

  it('sortCodes should not sort when role is RO or codeList missing', () => {
    component.codeList = undefined;
    component.sortCodes({ ctrlKey: false } as unknown as MouseEvent);
    expect(schemerService.sortCodes).not.toHaveBeenCalled();

    component.codeList = [] as unknown as never;
    schemerService.userRole = 'RO';
    component.sortCodes({ ctrlKey: false } as unknown as MouseEvent);
    expect(schemerService.sortCodes).not.toHaveBeenCalled();
  });

  it('editProcessingAndFragments should update fragmenting and processing and emit', () => {
    schemerService.userRole = 'RW_MAXIMAL';
    component.fragmenting = 'old';
    component.processing = ['SOME'] as unknown as never;

    dialogOpenSpy.and.returnValue({
      afterClosed: () => of({ fragmenting: 'new', processing: ['A', 'B'] })
    });

    const fragSpy = spyOn(component.fragmentingChanged, 'emit');
    const procSpy = spyOn(component.processingChanged, 'emit');

    component.editProcessingAndFragments();

    expect(dialogOpenSpy).toHaveBeenCalled();
    expect(component.fragmenting).toBe('new');
    expect(fragSpy).toHaveBeenCalledWith('new');

    expect(component.processing).toEqual(['A', 'B'] as unknown as never);
    expect(procSpy).toHaveBeenCalledWith(component.processing);
  });

  it('editProcessingAndFragments should do nothing when role is RO or dialogResult is false', () => {
    schemerService.userRole = 'RO';
    component.editProcessingAndFragments();
    expect(dialogOpenSpy).not.toHaveBeenCalled();

    schemerService.userRole = 'RW_MAXIMAL';
    component.fragmenting = 'keep';
    component.processing = ['X'] as unknown as never;

    dialogOpenSpy.and.returnValue({ afterClosed: () => of(false) });
    component.editProcessingAndFragments();

    expect(component.fragmenting).toBe('keep');
    expect(component.processing).toEqual(['X'] as unknown as never);
  });
});
