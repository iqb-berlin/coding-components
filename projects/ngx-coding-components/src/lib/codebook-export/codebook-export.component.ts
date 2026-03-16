import {
  Component,
  OnInit,
  OnDestroy,
  OnChanges,
  Input,
  Output,
  EventEmitter,
  SimpleChanges,
  Inject,
  Optional
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatOptionModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslateModule } from '@ngx-translate/core';
import {
  Subject,
  Subscription,
  interval
} from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  takeUntil
} from 'rxjs/operators';
import {
  MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle
} from '@angular/material/dialog';
import {
  CodeBookContentSetting,
  UnitSelectionItem,
  MissingsProfile,
  CodebookExportConfig
} from '../models/codebook.interfaces';
import {
  CODEBOOK_EXPORT_PROVIDER,
  CodebookExportExecution,
  CodebookExportJobStatus,
  CodebookExportProvider
} from './codebook-export.provider';

/**
 * Standalone component for exporting codebooks
 *
 * This component provides a UI for:
 * - Selecting units to include in the codebook
 * - Configuring content options (manual coding, derived vars, etc.)
 * - Selecting a missings profile
 * - Choosing export format (JSON or DOCX)
 * - Running exports via an optional provider (direct download or background job)
 *
 * @example
 * ```html
 * <ngx-codebook-export
 *   [availableUnits]="units"
 *   [missingsProfiles]="profiles"
 *   [isLoading]="loading"
 *   (export)="handleExport($event)">
 * </ngx-codebook-export>
 * ```
 */
@Component({
  selector: 'ngx-codebook-export',
  templateUrl: './codebook-export.component.html',
  styleUrls: ['./codebook-export.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCheckboxModule,
    MatRadioModule,
    MatSelectModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatOptionModule,
    MatIconModule,
    MatTooltipModule,
    MatDividerModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    TranslateModule,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatDialogTitle
  ]
})
export class CodebookExportComponent implements OnInit, OnDestroy, OnChanges {
  /** List of available units for selection */
  @Input() availableUnits: UnitSelectionItem[] = [];

  /** List of available missings profiles */
  @Input() missingsProfiles: MissingsProfile[] = [{ id: 0, label: 'None' }];

  /** Loading state for units */
  @Input() isLoading = false;

  /** Whether workspace has unsaved changes */
  @Input() workspaceChanges = false;

  /** Default content options */
  @Input() defaultContentOptions?: Partial<CodeBookContentSetting>;

  /** Optional provider for loading data and running exports */
  @Input() provider?: CodebookExportProvider;

  /** Emitted when export is triggered */
  @Output() export = new EventEmitter<CodebookExportConfig>();

  /** Emitted when component is closed/cancelled */
  @Output() cancel = new EventEmitter<void>();

  unitList: number[] = [];

  dataSource: MatTableDataSource<UnitSelectionItem> = new MatTableDataSource<UnitSelectionItem>([]);

  filterValue = '';
  filterTextChanged = new Subject<Event>();

  private isLoadingInternal = false;

  selectedMissingsProfile: number = 0;

  displayedColumns: string[] = ['select', 'unitName'];

  contentOptions: CodeBookContentSetting = {
    exportFormat: 'docx',
    missingsProfile: '',
    hasOnlyManualCoding: true,
    hasGeneralInstructions: true,
    hasDerivedVars: true,
    hasOnlyVarsWithCodes: true,
    hasClosedVars: true,
    codeLabelToUpper: true,
    showScore: true,
    hideItemVarRelation: true
  };

  codebookJobId: string | null = null;
  codebookJobStatus: 'idle' | 'pending' | 'processing' | 'completed' | 'failed' = 'idle';
  codebookJobProgress = 0;
  codebookJobError: string | null = null;
  private codebookPollingSubscription: Subscription | null = null;
  private lastExportConfig: CodebookExportConfig | null = null;
  private lastExportFileName: string | null = null;
  private lastExportFormat: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    @Optional() @Inject(CODEBOOK_EXPORT_PROVIDER) private injectedProvider?: CodebookExportProvider
  ) {}

  private get activeProvider(): CodebookExportProvider | undefined {
    return this.provider || this.injectedProvider;
  }

  get loading(): boolean {
    return this.isLoading || this.isLoadingInternal;
  }

  get exportDisabled(): boolean {
    return (
      this.unitList.length === 0 ||
      this.codebookJobStatus === 'pending' ||
      this.codebookJobStatus === 'processing'
    );
  }

  ngOnInit(): void {
    // Apply default content options if provided
    if (this.defaultContentOptions) {
      this.contentOptions = { ...this.contentOptions, ...this.defaultContentOptions };
    }

    this.configureDataSource();

    // Set up filter debouncing
    this.filterTextChanged
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(event => {
        this.applyFilter(event);
      });

    this.loadUnitsFromProviderIfNeeded();
    this.loadMissingsProfilesFromProviderIfNeeded();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['availableUnits']) {
      this.configureDataSource();
      this.syncUnitSelection();
    }
    if (changes['missingsProfiles']) {
      this.ensureSelectedMissingsProfile();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopCodebookPolling();
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  private configureDataSource(): void {
    this.dataSource.data = this.availableUnits;
    this.dataSource.filterPredicate = (data, filter: string) => {
      const formattedName = this.formatUnitName(data.unitName).toLowerCase();
      return formattedName.includes(filter);
    };
  }

  private syncUnitSelection(): void {
    if (this.unitList.length === 0) return;
    const availableIds = new Set(this.availableUnits.map(unit => unit.unitId));
    this.unitList = this.unitList.filter(id => availableIds.has(id));
  }

  private ensureSelectedMissingsProfile(): void {
    if (!this.missingsProfiles || this.missingsProfiles.length === 0) {
      this.missingsProfiles = [{ id: 0, label: 'None' }];
      this.selectedMissingsProfile = 0;
      return;
    }
    if (!this.missingsProfiles.some(profile => profile.id === this.selectedMissingsProfile)) {
      this.selectedMissingsProfile = this.missingsProfiles[0]?.id ?? 0;
    }
  }

  private ensureNoneProfile(profiles: MissingsProfile[]): MissingsProfile[] {
    const safeProfiles = Array.isArray(profiles) ? profiles : [];
    if (safeProfiles.some(profile => profile.id === 0)) return safeProfiles;
    const noneLabel = this.missingsProfiles.find(profile => profile.id === 0)?.label ?? 'None';
    return [{ id: 0, label: noneLabel }, ...safeProfiles];
  }

  private loadUnitsFromProviderIfNeeded(): void {
    const provider = this.activeProvider;
    if (!provider?.loadUnits) return;
    if (this.availableUnits.length > 0) return;
    this.isLoadingInternal = true;
    provider.loadUnits()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: units => {
          this.availableUnits = units || [];
          this.configureDataSource();
          this.syncUnitSelection();
          this.isLoadingInternal = false;
        },
        error: () => {
          this.isLoadingInternal = false;
        }
      });
  }

  private loadMissingsProfilesFromProviderIfNeeded(): void {
    const provider = this.activeProvider;
    if (!provider?.loadMissingsProfiles) return;
    if (this.missingsProfiles.length > 1 || (this.missingsProfiles.length === 1 && this.missingsProfiles[0].id !== 0)) {
      return;
    }
    provider.loadMissingsProfiles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: profiles => {
          this.missingsProfiles = this.ensureNoneProfile(profiles || []);
          this.ensureSelectedMissingsProfile();
        },
        error: () => {
          // Keep current profiles
        }
      });
  }

  toggleUnitSelection(unitId: number, isSelected: boolean): void {
    if (isSelected) {
      if (!this.unitList.includes(unitId)) {
        this.unitList.push(unitId);
      }
    } else {
      this.unitList = this.unitList.filter(id => id !== unitId);
    }
  }

  isUnitSelected(unitId: number): boolean {
    return this.unitList.includes(unitId);
  }

  // Used by the template.
  // eslint-disable-next-line class-methods-use-this
  formatUnitName(unitName: string): string {
    if (unitName && unitName.toLowerCase().endsWith('.vocs')) {
      return unitName.substring(0, unitName.length - 5);
    }
    return unitName;
  }

  toggleAllUnits(isSelected: boolean): void {
    if (isSelected) {
      this.unitList = this.availableUnits.map(unit => unit.unitId);
    } else {
      this.unitList = [];
    }
  }

  exportCodingBook(): void {
    if (this.unitList.length === 0) {
      return;
    }

    this.contentOptions.missingsProfile = this.selectedMissingsProfile.toString();

    const config: CodebookExportConfig = {
      selectedUnits: this.unitList,
      contentOptions: this.contentOptions,
      missingsProfileId: this.selectedMissingsProfile
    };

    const provider = this.activeProvider;
    if (!provider?.startExport) {
      this.export.emit(config);
      return;
    }

    this.startProviderExport(provider, config);
  }

  onCancel(): void {
    this.stopCodebookPolling();
    this.cancel.emit();
  }

  resetCodebookJob(): void {
    this.codebookJobId = null;
    this.codebookJobStatus = 'idle';
    this.codebookJobProgress = 0;
    this.codebookJobError = null;
    this.stopCodebookPolling();
  }

  private startProviderExport(provider: CodebookExportProvider, config: CodebookExportConfig): void {
    this.stopCodebookPolling();
    this.codebookJobStatus = 'pending';
    this.codebookJobProgress = 0;
    this.codebookJobError = null;
    this.codebookJobId = null;
    this.lastExportConfig = config;
    this.lastExportFileName = null;
    this.lastExportFormat = config.contentOptions.exportFormat;

    provider.startExport(config)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (execution: CodebookExportExecution) => {
          if (execution.type === 'direct') {
            this.codebookJobStatus = 'processing';
            this.codebookJobProgress = 100;
            const fileName = this.resolveFileName(execution.fileName);
            const blob = execution.mimeType ? new Blob([execution.blob], { type: execution.mimeType }) : execution.blob;
            try {
              CodebookExportComponent.downloadBlob(blob, fileName);
              this.codebookJobStatus = 'completed';
            } catch {
              this.codebookJobStatus = 'failed';
              this.codebookJobError = 'Failed to download codebook file';
            }
            return;
          }

          if (!execution.jobId) {
            this.codebookJobStatus = 'failed';
            this.codebookJobError = 'Failed to start codebook generation job';
            return;
          }

          this.codebookJobId = execution.jobId;
          this.startCodebookPolling(execution.jobId);
        },
        error: () => {
          this.codebookJobStatus = 'failed';
          this.codebookJobError = 'Failed to start codebook generation job';
        }
      });
  }

  private startCodebookPolling(jobId: string): void {
    const provider = this.activeProvider;
    if (!provider?.getJobStatus) {
      this.codebookJobStatus = 'failed';
      this.codebookJobError = 'Job status handler is not available';
      return;
    }

    this.stopCodebookPolling();

    this.codebookPollingSubscription = interval(1500)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => provider.getJobStatus!(jobId))
      )
      .subscribe({
        next: (status: CodebookExportJobStatus) => {
          if (!status.status && status.error) {
            this.codebookJobStatus = 'failed';
            this.codebookJobError = status.error;
            this.stopCodebookPolling();
            return;
          }

          this.codebookJobProgress = status.progress ?? 0;
          if (status.fileName) {
            this.lastExportFileName = status.fileName;
          }
          if (status.exportFormat) {
            this.lastExportFormat = status.exportFormat;
          }

          if (status.status === 'completed') {
            this.codebookJobStatus = 'completed';
            this.stopCodebookPolling();
            this.downloadCodebookResult(jobId);
          } else if (status.status === 'failed') {
            this.codebookJobStatus = 'failed';
            this.codebookJobError = status.error || 'Codebook generation failed';
            this.stopCodebookPolling();
          } else if (status.status === 'processing') {
            this.codebookJobStatus = 'processing';
          } else {
            this.codebookJobStatus = 'pending';
          }
        },
        error: () => {
          this.codebookJobStatus = 'failed';
          this.codebookJobError = 'Failed to get job status';
          this.stopCodebookPolling();
        }
      });
  }

  private stopCodebookPolling(): void {
    if (this.codebookPollingSubscription) {
      this.codebookPollingSubscription.unsubscribe();
      this.codebookPollingSubscription = null;
    }
  }

  private downloadCodebookResult(jobId: string): void {
    const provider = this.activeProvider;
    if (!provider?.download) {
      this.codebookJobStatus = 'failed';
      this.codebookJobError = 'Download handler is not available';
      return;
    }

    provider.download(jobId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: blob => {
          const fileName = this.resolveFileName();
          try {
            CodebookExportComponent.downloadBlob(blob, fileName);
          } catch {
            this.codebookJobStatus = 'failed';
            this.codebookJobError = 'Failed to download codebook file';
          }
        },
        error: () => {
          this.codebookJobStatus = 'failed';
          this.codebookJobError = 'Failed to download codebook file';
        }
      });
  }

  private resolveFileName(preferredName?: string): string {
    if (preferredName) return preferredName;
    if (this.lastExportFileName) return this.lastExportFileName;
    const format = this.lastExportFormat ||
      this.lastExportConfig?.contentOptions.exportFormat ||
      this.contentOptions.exportFormat;
    return CodebookExportComponent.buildDefaultFileName(format);
  }

  private static buildDefaultFileName(format?: string): string {
    const extension = (format || 'docx').toLowerCase();
    const now = new Date();
    const year = now.getFullYear();
    const month = `${now.getMonth() + 1}`.padStart(2, '0');
    const day = `${now.getDate()}`.padStart(2, '0');
    const hours = `${now.getHours()}`.padStart(2, '0');
    const minutes = `${now.getMinutes()}`.padStart(2, '0');
    const seconds = `${now.getSeconds()}`.padStart(2, '0');
    return `codebook_${year}${month}${day}_${hours}${minutes}${seconds}.${extension}`;
  }

  private static downloadBlob(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}
