import {
  ComponentFixture, TestBed, fakeAsync, tick
} from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { CodebookExportComponent } from './codebook-export.component';
import {
  CodebookExportExecution,
  CodebookExportJobStatus,
  CodebookExportProvider
} from './codebook-export.provider';
import { CodebookExportConfig, UnitSelectionItem, MissingsProfile } from '../models/codebook.interfaces';

describe('CodebookExportComponent', () => {
  let fixture: ComponentFixture<CodebookExportComponent>;
  let component: CodebookExportComponent;
  let lastAnchor: HTMLAnchorElement | null;

  function setupDownloadSpies() {
    const urlApi = window.URL as typeof window.URL & {
      createObjectURL?: (blob: Blob) => string;
      revokeObjectURL?: (url: string) => void;
    };
    if (!urlApi.createObjectURL) {
      urlApi.createObjectURL = () => 'blob:mock';
    }
    if (!urlApi.revokeObjectURL) {
      urlApi.revokeObjectURL = () => undefined;
    }
    spyOn(urlApi, 'createObjectURL').and.returnValue('blob:mock');
    spyOn(urlApi, 'revokeObjectURL').and.callThrough();

    const realCreateElement = document.createElement.bind(document);
    lastAnchor = null;
    spyOn(document, 'createElement').and.callFake((tagName: string) => {
      const element = realCreateElement(tagName);
      if (tagName === 'a') {
        lastAnchor = element as HTMLAnchorElement;
        spyOn(lastAnchor, 'click');
      }
      return element;
    });
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CodebookExportComponent,
        NoopAnimationsModule,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: TranslateFakeLoader }
        })
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CodebookExportComponent);
    component = fixture.componentInstance;
    setupDownloadSpies();
  });

  it('emits export config when no provider is set', () => {
    component.availableUnits = [{ unitId: 1, unitName: 'Unit 1.vocs', unitAlias: null }];
    component.unitList = [1];
    const emitSpy = spyOn(component.export, 'emit');

    fixture.detectChanges();

    component.exportCodingBook();

    expect(emitSpy).toHaveBeenCalled();
    const config = emitSpy.calls.mostRecent().args[0] as CodebookExportConfig | undefined;
    expect(config).toBeTruthy();
    if (!config) {
      throw new Error('Expected export config to be emitted.');
    }
    expect(config.selectedUnits).toEqual([1]);
    expect(config.missingsProfileId).toBe(0);
    expect(config.contentOptions.exportFormat).toBe('docx');
  });

  it('runs direct export via provider and downloads the file', () => {
    const blob = new Blob(['hello'], { type: 'text/plain' });
    const provider: CodebookExportProvider = {
      startExport: jasmine.createSpy('startExport').and.returnValue(of({
        type: 'direct',
        blob,
        fileName: 'codebook.txt'
      } as CodebookExportExecution))
    };

    component.provider = provider;
    component.unitList = [1];
    fixture.detectChanges();

    component.exportCodingBook();

    expect(provider.startExport).toHaveBeenCalled();
    expect(component.codebookJobStatus).toBe('completed');
    expect(lastAnchor?.download).toBe('codebook.txt');
    expect((lastAnchor as HTMLAnchorElement).click).toHaveBeenCalled();
  });

  it('polls job status and downloads when completed', fakeAsync(() => {
    const blob = new Blob(['job'], { type: 'application/octet-stream' });
    const provider: CodebookExportProvider = {
      startExport: jasmine.createSpy('startExport').and.returnValue(of({
        type: 'job',
        jobId: 'job-1'
      } as CodebookExportExecution)),
      getJobStatus: jasmine.createSpy('getJobStatus').and.returnValue(of({
        status: 'completed',
        progress: 100,
        fileName: 'job.docx'
      } as CodebookExportJobStatus)),
      download: jasmine.createSpy('download').and.returnValue(of(blob))
    };

    component.provider = provider;
    component.unitList = [1];
    fixture.detectChanges();

    component.exportCodingBook();
    expect(component.codebookJobStatus).toBe('pending');

    tick(1500);

    expect(provider.getJobStatus).toHaveBeenCalledWith('job-1');
    expect(provider.download).toHaveBeenCalledWith('job-1');
    expect(component.codebookJobStatus).toBe('completed');
  }));

  it('loads units and missings profiles from provider when none are provided', fakeAsync(() => {
    const units: UnitSelectionItem[] = [{ unitId: 7, unitName: 'Unit 7.vocs', unitAlias: null }];
    const missings: MissingsProfile[] = [{ id: 1, label: 'Standard' }];
    const provider: CodebookExportProvider = {
      loadUnits: jasmine.createSpy('loadUnits').and.returnValue(of(units)),
      loadMissingsProfiles: jasmine.createSpy('loadMissingsProfiles').and.returnValue(of(missings)),
      startExport: jasmine.createSpy('startExport').and.returnValue(of({
        type: 'direct',
        blob: new Blob(['x'])
      } as CodebookExportExecution))
    };

    component.provider = provider;
    fixture.detectChanges();
    tick();

    expect(provider.loadUnits).toHaveBeenCalled();
    expect(provider.loadMissingsProfiles).toHaveBeenCalled();
    expect(component.availableUnits.length).toBe(1);
    expect(component.missingsProfiles.some(profile => profile.id === 0)).toBeTrue();
  }));
});
