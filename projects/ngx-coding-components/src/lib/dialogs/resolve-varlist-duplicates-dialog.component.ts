import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle
} from '@angular/material/dialog';
import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';
import { MatButton } from '@angular/material/button';
import {
  getVarListConflictAnalysis,
  isInvalidVarListAlias,
  isInvalidVarListId
} from '../services/schemer-varlist-validation';

export interface ResolveVarListDuplicatesDialogData {
  varList: VariableInfo[];
}

@Component({
  template: `
    <h1 mat-dialog-title>Problematische Variablen-IDs/Aliase</h1>

    <mat-dialog-content>
      <div style="margin-bottom: 10px;">
        Die Variablenliste enthält doppelte oder ungültige IDs/Aliase.
        Bitte korrigiere die Variablenliste und lade den Schemer neu.
      </div>

      <div
        style="margin-bottom: 12px;"
        [style.color]="hasProblems ? '#b00020' : '#1b5e20'"
      >
        {{ statusText }}
      </div>

      @if (hasProblems) {
      <div style="margin-bottom: 12px; font-size: 12px;">
        @if (duplicateIdValues.length > 0) {
        <div><b>Doppelte IDs:</b> {{ duplicateIdValues.join(', ') }}</div>
        } @if (duplicateAliasValues.length > 0) {
        <div><b>Doppelte Aliase:</b> {{ duplicateAliasValues.join(', ') }}</div>
        } @if (invalidIdCount > 0) {
        <div><b>Ungültige IDs:</b> {{ invalidIdCount }}</div>
        } @if (invalidAliasCount > 0) {
        <div><b>Ungültige Aliase:</b> {{ invalidAliasCount }}</div>
        }
      </div>
      } @for (v of varList; track $index) {
      <div
        style="display:flex; gap:12px; align-items:flex-start; margin-bottom: 8px;"
      >
        <div
          style="flex: 1;"
          [class.duplicate-field]="isDuplicateId(v.id)"
          [class.invalid-field]="isInvalidId(v.id)"
        >
          <b>ID:</b> {{ v.id || '-' }}
        </div>
        <div
          style="flex: 1;"
          [class.duplicate-field]="isDuplicateAlias(v.alias || v.id)"
          [class.invalid-field]="isInvalidAlias(v.alias || v.id)"
        >
          <b>Alias:</b> {{ v.alias || v.id || '-' }}
        </div>
      </div>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button
        mat-raised-button
        color="primary"
        (click)="close()"
      >
        Schließen
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    '.duplicate-field { outline: 2px solid #b00020; outline-offset: 2px; border-radius: 3px; padding: 4px; }',
    '.invalid-field { outline: 2px solid #ff6f00; outline-offset: 2px; border-radius: 3px; padding: 4px; }'
  ],
  standalone: true,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButton
  ]
})
export class ResolveVarListDuplicatesDialogComponent {
  varList: VariableInfo[];

  hasProblems = true;
  statusText = '';

  private duplicateIds = new Set<string>();
  private duplicateAliases = new Set<string>();

  duplicateIdValues: string[] = [];
  duplicateAliasValues: string[] = [];
  invalidIdCount = 0;
  invalidAliasCount = 0;

  constructor(
    private dialogRef: MatDialogRef<ResolveVarListDuplicatesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ResolveVarListDuplicatesDialogData
  ) {
    this.varList = (data.varList || []).map(v => ({ ...v }));
    this.recompute();
  }

  recompute(): void {
    const analysis = getVarListConflictAnalysis(this.varList);

    this.duplicateIds = analysis.duplicateIds;
    this.duplicateAliases = analysis.duplicateAliases;
    this.duplicateIdValues = analysis.duplicateIdValues;
    this.duplicateAliasValues = analysis.duplicateAliasValues;
    this.invalidIdCount = analysis.invalidIdCount;
    this.invalidAliasCount = analysis.invalidAliasCount;
    this.hasProblems = analysis.hasProblems;

    if (this.hasProblems) {
      const problems: string[] = [];
      if (analysis.hasInvalid) {
        problems.push('Ungültige ID/Alias');
      }
      if (analysis.hasDuplicateId) {
        problems.push('Doppelte IDs');
      }
      if (analysis.hasDuplicateAlias) {
        problems.push('Doppelte Aliase');
      }
      this.statusText = problems.join(' | ');
    } else {
      this.statusText = 'Keine Konflikte mehr.';
    }
  }

  isDuplicateId(value: string | null | undefined): boolean {
    const key = (value || '').trim().toUpperCase();
    return !!key && this.duplicateIds.has(key);
  }

  isDuplicateAlias(value: string | null | undefined): boolean {
    const key = (value || '').trim().toUpperCase();
    return !!key && this.duplicateAliases.has(key);
  }

  isInvalidId = isInvalidVarListId;
  isInvalidAlias = isInvalidVarListAlias;

  close(): void {
    this.dialogRef.close();
  }
}
