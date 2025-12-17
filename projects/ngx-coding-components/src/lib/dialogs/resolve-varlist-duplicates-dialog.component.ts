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
import { MatFormField } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import {
  SchemerService,
  VARIABLE_NAME_CHECK_PATTERN
} from '../services/schemer.service';

export interface ResolveVarListDuplicatesDialogData {
  varList: VariableInfo[];
  reservedIds: string[];
}

export interface ResolveVarListDuplicatesDialogResult {
  varList: VariableInfo[];
  idRenameMap: Record<string, string>;
}

@Component({
  template: `
    <h1 mat-dialog-title>Doppelte Variablen-IDs/Aliase auflösen</h1>

    <mat-dialog-content>
      <div style="margin-bottom: 10px;">
        Bitte korrigiere doppelte IDs oder Aliase in der Variablenliste.
      </div>

      <div style="display:flex; gap:10px; margin-bottom: 12px;">
        <button mat-raised-button color="primary" (click)="autoFix()">
          Auto-Fix
        </button>
        <button mat-raised-button (click)="reset()">Zurücksetzen</button>
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
      } @for (v of editedVarList; track $index) {
      <div
        style="display:flex; gap:12px; align-items:flex-start; margin-bottom: 10px;"
      >
        <mat-form-field
          style="flex: 1;"
          [class.duplicate-field]="isDuplicateId(v.id)"
          [class.invalid-field]="isInvalidId(v.id)"
        >
          <input
            matInput
            placeholder="ID"
            [(ngModel)]="v.id"
            (input)="recompute()"
            (ngModelChange)="recompute()"
            (blur)="recompute()"
          />
        </mat-form-field>
        <mat-form-field
          style="flex: 1;"
          [class.duplicate-field]="isDuplicateAlias(v.alias || v.id)"
          [class.invalid-field]="isInvalidAlias(v.alias || v.id)"
        >
          <input
            matInput
            placeholder="Alias"
            [(ngModel)]="v.alias"
            (input)="recompute()"
            (ngModelChange)="recompute()"
            (blur)="recompute()"
          />
        </mat-form-field>
      </div>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button
        mat-raised-button
        color="primary"
        [disabled]="hasProblems"
        (click)="apply()"
      >
        Übernehmen
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    '.duplicate-field { outline: 2px solid #b00020; outline-offset: 2px; border-radius: 3px; }',
    '.invalid-field { outline: 2px solid #ff6f00; outline-offset: 2px; border-radius: 3px; }'
  ],
  standalone: true,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButton,
    MatFormField,
    MatInput,
    FormsModule
  ]
})
export class ResolveVarListDuplicatesDialogComponent {
  private readonly originalVarList: VariableInfo[];
  editedVarList: VariableInfo[];

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
    @Inject(MAT_DIALOG_DATA) public data: ResolveVarListDuplicatesDialogData,
    // kept for future extensions (e.g. using shared helpers)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private _schemerService: SchemerService
  ) {
    this.originalVarList = (data.varList || []).map(v => ({ ...v }));
    this.editedVarList = (data.varList || []).map(v => ({ ...v }));
    this.recompute();
  }

  reset(): void {
    this.editedVarList = this.originalVarList.map(v => ({ ...v }));
    this.recompute();
  }

  autoFix(): void {
    const reserved = new Set(
      (this.data.reservedIds || []).map(v => v.toUpperCase())
    );

    const makeUnique = (
      base: string,
      used: Set<string>,
      reservedSet: Set<string>
    ): string => {
      const trimmed = (base || '').trim();
      const start = ResolveVarListDuplicatesDialogComponent.sanitizeVarName(
        trimmed || 'VAR'
      );
      let candidate = start;
      let i = 1;
      const isBlocked = (val: string) => used.has(val.toUpperCase()) || reservedSet.has(val.toUpperCase());
      while (isBlocked(candidate)) {
        candidate = `${start}_${i}`;
        i += 1;
      }
      used.add(candidate.toUpperCase());
      return candidate;
    };

    const usedIds = new Set<string>();
    const usedAliases = new Set<string>();

    this.editedVarList = this.editedVarList.map(v => {
      const proposedId = (v.id || '').trim();
      const newId = makeUnique(proposedId || 'VAR', usedIds, reserved);

      const proposedAlias = (v.alias || '').trim();
      const aliasBase = proposedAlias || newId;
      const newAliasOrId = makeUnique(aliasBase, usedAliases, new Set());

      return {
        ...v,
        id: newId,
        alias: newAliasOrId
      };
    });

    this.recompute();
  }

  recompute(): void {
    const idCounts = this.getCounts(
      this.editedVarList.map(v => (v.id || '').trim())
    );
    const aliasCounts = this.getCounts(
      this.editedVarList.map(v => (v.alias || v.id || '').trim())
    );

    this.duplicateIds = new Set(
      Array.from(idCounts.entries())
        .filter(([, c]) => c > 1)
        .map(([k]) => k)
    );
    this.duplicateAliases = new Set(
      Array.from(aliasCounts.entries())
        .filter(([, c]) => c > 1)
        .map(([k]) => k)
    );

    this.duplicateIdValues = Array.from(this.duplicateIds.values()).sort();
    this.duplicateAliasValues = Array.from(
      this.duplicateAliases.values()
    ).sort();

    this.invalidIdCount = this.editedVarList.filter(v => {
      const id = (v.id || '').trim();
      return !id || !VARIABLE_NAME_CHECK_PATTERN.test(id);
    }).length;

    this.invalidAliasCount = this.editedVarList.filter(v => {
      const aliasOrId = (v.alias || v.id || '').trim();
      return !aliasOrId || !VARIABLE_NAME_CHECK_PATTERN.test(aliasOrId);
    }).length;

    const hasInvalid = this.editedVarList.some(v => {
      const id = (v.id || '').trim();
      const aliasOrId = (v.alias || v.id || '').trim();
      if (!id || !VARIABLE_NAME_CHECK_PATTERN.test(id)) {
        return true;
      }
      return !aliasOrId || !VARIABLE_NAME_CHECK_PATTERN.test(aliasOrId);
    });

    const hasDupId = Array.from(idCounts.values()).some(c => c > 1);
    const hasDupAlias = Array.from(aliasCounts.values()).some(c => c > 1);

    this.hasProblems = hasInvalid || hasDupId || hasDupAlias;

    if (this.hasProblems) {
      const problems: string[] = [];
      if (hasInvalid) {
        problems.push('Ungültige ID/Alias (nur [a-zA-Z0-9_], min. 2 Zeichen)');
      }
      if (hasDupId) {
        problems.push('Doppelte IDs');
      }
      if (hasDupAlias) {
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

  private readonly variableNameCheckPattern = VARIABLE_NAME_CHECK_PATTERN;

  isInvalidId = (value: string | null | undefined): boolean => {
    const v = (value || '').trim();
    return !v || !this.variableNameCheckPattern.test(v);
  };

  isInvalidAlias(value: string | null | undefined): boolean {
    return this.isInvalidId(value);
  }

  apply(): void {
    const renameMap: Record<string, string> = {};
    this.originalVarList.forEach((orig, idx) => {
      const edited = this.editedVarList[idx];
      if (edited && orig.id !== edited.id) {
        renameMap[orig.id] = edited.id;
      }
    });

    this.dialogRef.close({
      varList: this.editedVarList.map(v => ({ ...v })),
      idRenameMap: renameMap
    });
  }

  // eslint-disable-next-line class-methods-use-this
  private getCounts(values: string[]): Map<string, number> {
    const m = new Map<string, number>();
    values
      .map(v => (v || '').trim())
      .filter(v => !!v)
      .forEach(v => {
        const key = v.toUpperCase();
        m.set(key, (m.get(key) || 0) + 1);
      });
    return m;
  }

  private static sanitizeVarName(raw: string): string {
    const cleaned = (raw || '').trim().replace(/[^a-zA-Z0-9_]/g, '_');

    if (cleaned.length >= 2) {
      return cleaned;
    }

    if (cleaned.length === 1) {
      return `${cleaned}_`;
    }

    return 'VAR';
  }
}
