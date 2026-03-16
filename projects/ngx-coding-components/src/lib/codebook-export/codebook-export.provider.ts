import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CodebookExportConfig,
  MissingsProfile,
  UnitSelectionItem
} from '../models/codebook.interfaces';

export type CodebookExportExecution =
  | {
    type: 'direct';
    blob: Blob;
    fileName?: string;
    mimeType?: string;
  }
  | {
    type: 'job';
    jobId: string;
  };

export interface CodebookExportJobStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  fileName?: string;
  exportFormat?: string;
}

export interface CodebookExportProvider {
  loadUnits?(): Observable<UnitSelectionItem[]>;
  loadMissingsProfiles?(): Observable<MissingsProfile[]>;
  startExport(config: CodebookExportConfig): Observable<CodebookExportExecution>;
  getJobStatus?(jobId: string): Observable<CodebookExportJobStatus>;
  download?(jobId: string): Observable<Blob>;
}

export const CODEBOOK_EXPORT_PROVIDER = new InjectionToken<CodebookExportProvider>('CODEBOOK_EXPORT_PROVIDER');
