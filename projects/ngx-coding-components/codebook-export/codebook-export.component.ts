import {
  AfterViewInit, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';
import type {
  CodeBookContentSetting, CodebookExportConfig, MissingsProfile, UnitSelectionItem
} from '@iqb/ngx-coding-components/codebook-models';

export const DEFAULT_CODEBOOK_OPTIONS: CodeBookContentSetting = {
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

/** Studio's export form. Loading data, downloading and job handling belong to the host. */
@Component({
  selector: 'ngx-codebook-export',
  standalone: true,
  imports: [FormsModule, MatTableModule, MatSortModule, MatCheckboxModule, MatDialogModule,
    MatButtonModule, MatTooltipModule, MatSelectModule, MatRadioModule, MatFormFieldModule,
    MatInputModule, TranslateModule],
  templateUrl: './codebook-export.component.html',
  styleUrls: ['./codebook-export.component.scss']
})
export class CodebookExportComponent implements OnChanges, AfterViewInit {
  @Input() availableUnits: UnitSelectionItem[] = [];
  @Input() missingsProfiles: MissingsProfile[] = [];
  @Input() selectedUnitIds: number[] = [];
  @Input() selectedMissingsProfileId = 0;
  @Input() defaultContentOptions: Partial<CodeBookContentSetting> = {};
  @Input() loading = false;
  @Input() busy = false;
  @Input() workspaceChanges = false;
  @Output() selectionChanged = new EventEmitter<number[]>();
  @Output() exportRequested = new EventEmitter<CodebookExportConfig>();
  @Output() cancel = new EventEmitter<void>();
  @ViewChild(MatSort) sort!: MatSort;

  dataSource = new MatTableDataSource<UnitSelectionItem>([]);
  columns = ['select', 'key', 'name', 'group'];
  selection: number[] = [];
  filter = '';
  contentOptions = { ...DEFAULT_CODEBOOK_OPTIONS };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['defaultContentOptions']) {
      // Only shared options cross this boundary; host-specific filters stay with the host.
      this.contentOptions = Object.fromEntries(Object.entries(DEFAULT_CODEBOOK_OPTIONS).map(([key, value]) => (
        [key, this.defaultContentOptions[key as keyof CodeBookContentSetting] ?? value]
      ))) as unknown as CodeBookContentSetting;
    }
    if (changes['availableUnits']) {
      this.dataSource.data = this.availableUnits;
      this.dataSource.filterPredicate = (unit, filter) => [unit.key, unit.unitName, unit.groupName || '']
        .some(value => value.toLowerCase().includes(filter));
      this.dataSource.sortingDataAccessor = (unit, column) => ({ key: unit.key, name: unit.unitName, group: unit.groupName || '' }[column] || '');
    }
    if (changes['missingsProfiles'] && !this.missingsProfiles.some(profile => profile.id === this.selectedMissingsProfileId)) {
      this.selectedMissingsProfileId = 0;
    }
    if (changes['selectedUnitIds']) this.selection = [...this.selectedUnitIds];
    const validIds = new Set(this.availableUnits.filter(unit => !unit.disabled).map(unit => unit.unitId));
    this.selection = this.selection.filter(id => validIds.has(id));
  }

  ngAfterViewInit(): void { this.dataSource.sort = this.sort; }

  get allSelected(): boolean {
    const selectable = this.availableUnits.filter(unit => !unit.disabled);
    return selectable.length > 0 && selectable.every(unit => this.selection.includes(unit.unitId));
  }

  get exportDisabled(): boolean {
    return !this.selection.length || this.loading || this.busy || this.workspaceChanges;
  }

  applyFilter(): void { this.dataSource.filter = this.filter.trim().toLowerCase(); }

  toggle(unit: UnitSelectionItem): void {
    if (unit.disabled || this.busy) return;
    this.selection = this.selection.includes(unit.unitId) ? this.selection.filter(id => id !== unit.unitId) : [...this.selection, unit.unitId];
    this.selectionChanged.emit([...this.selection]);
  }

  toggleAll(): void {
    if (this.busy) return;
    this.selection = this.allSelected ? [] : this.availableUnits.filter(unit => !unit.disabled).map(unit => unit.unitId);
    this.selectionChanged.emit([...this.selection]);
  }

  exportCodingBook(): void {
    if (this.exportDisabled) return;
    const profile = this.missingsProfiles.find(item => item.id === this.selectedMissingsProfileId);
    this.exportRequested.emit({
      selectedUnits: [...this.selection],
      missingsProfileId: this.selectedMissingsProfileId,
      contentOptions: { ...this.contentOptions, missingsProfile: profile?.label || '' }
    });
  }
}
