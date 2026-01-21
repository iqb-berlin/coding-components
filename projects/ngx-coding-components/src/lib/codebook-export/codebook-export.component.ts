import {
  Component, OnInit, OnDestroy, Input, Output, EventEmitter
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
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import {
  CodeBookContentSetting,
  UnitSelectionItem,
  MissingsProfile,
  CodebookExportConfig
} from '../models/codebook.interfaces';
import {MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle} from "@angular/material/dialog";

/**
 * Standalone component for exporting codebooks
 *
 * This component provides a UI for:
 * - Selecting units to include in the codebook
 * - Configuring content options (manual coding, derived vars, etc.)
 * - Selecting a missings profile
 * - Choosing export format (JSON or DOCX)
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
    TranslateModule,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatDialogTitle
  ]
})
export class CodebookExportComponent implements OnInit, OnDestroy {
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

  /** Emitted when export is triggered */
  @Output() export = new EventEmitter<CodebookExportConfig>();

  /** Emitted when component is closed/cancelled */
  @Output() cancel = new EventEmitter<void>();

  unitList: number[] = [];

  dataSource = new MatTableDataSource<UnitSelectionItem>([]);

  filterValue = '';
  filterTextChanged = new Subject<Event>();

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

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    // Apply default content options if provided
    if (this.defaultContentOptions) {
      this.contentOptions = { ...this.contentOptions, ...this.defaultContentOptions };
    }

    // Set up data source
    this.dataSource.data = this.availableUnits;
    this.dataSource.filterPredicate = (data, filter: string) => {
      const formattedName = this.formatUnitName(data.unitName).toLowerCase();
      return formattedName.includes(filter);
    };

    // Set up filter debouncing
    this.filterTextChanged
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(event => {
        this.applyFilter(event);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
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

    this.export.emit(config);
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
