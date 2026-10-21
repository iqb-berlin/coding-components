import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle
} from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatCheckbox } from '@angular/material/checkbox';
import { VariableCodingData } from '@iqbspecs/coding-scheme/coding-scheme.interface';
import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';
import {
  VariableValidationError,
  VariableValidationErrorCode
} from '../services/variable-identifier-validation';
import {
  SchemerIdentifier,
  SchemerIdentifierAnalysis,
  SchemerIdentifierOrigin
} from '../services/schemer-identifier-validation';
import {
  DerivedCodingConflictChange, getConflictingDerivedCodings, resolveDerivedCodingConflicts
} from '../services/derived-coding-conflict-resolution';

export interface ResolveIdentifierConflictsDialogData {
  analysis: SchemerIdentifierAnalysis;
  recoveryProblems?: string[];
  variables?: VariableInfo[];
  variableCodings?: VariableCodingData[];
  canEdit?: () => boolean;
}

interface DerivedCodingEdit {
  coding: VariableCodingData;
  alias: string;
  deleted: boolean;
}

export interface DerivedIdentifierConflictResult {
  derivedChanges: DerivedCodingConflictChange[];
  confirmDeletion: boolean;
}

interface ValidationErrorGroup {
  code: VariableValidationErrorCode;
  heading: string;
  reason: string;
  errors: VariableValidationError[];
}

const ERROR_GROUPS: Array<Omit<ValidationErrorGroup, 'errors'>> = [
  {
    code: 'INVALID_CHARACTERS',
    heading: 'Ungültige Zeichen',
    reason: 'Der Bezeichner enthält nicht erlaubte Zeichen.'
  },
  {
    code: 'EMPTY_IDENTIFIER',
    heading: 'Leerer Bezeichner',
    reason: 'Der Bezeichner ist leer oder fehlt.'
  },
  {
    code: 'DUPLICATE_ID',
    heading: 'Doppelte ID',
    reason: 'Die technische ID kommt mehrfach vor.'
  },
  {
    code: 'DUPLICATE_ALIAS',
    heading: 'Doppelter Alias',
    reason: 'Der Alias kommt mehrfach vor.'
  },
  {
    code: 'PUBLIC_IDENTIFIER_COLLISION',
    heading: 'Kollision öffentlicher Bezeichner',
    reason: 'Alias und öffentliche ID bezeichnen verschiedene Variablen gleich.'
  }
];

@Component({
  template: `
    <h1 mat-dialog-title>Ungültige Variablenbezeichner</h1>

    <mat-dialog-content>
      @for (problem of data.recoveryProblems || []; track $index) {
        <p role="alert">{{ problem }}</p>
      }
      <p>Die Variablenbezeichner können nicht übernommen werden.</p>
      @if (derivedEdits.length) {
        <p>Du kannst die betroffenen abgeleiteten Variablen hier gezielt umbenennen oder zum Löschen vormerken.
          Beim Umbenennen bleiben Kodierungen und Quellen erhalten; Formelverweise werden angepasst.
          Abbrechen verwirft die Auswahl. Andere Konflikte müssen an ihrer angegebenen Quelle korrigiert werden.</p>
      } @else {
        <p>Bitte korrigiere die betroffenen Einträge an der jeweils angegebenen Quelle und lade den Schemer neu.</p>
      }

      <aside class="identifier-help">
        <b>Erlaubte Bezeichner:</b>
        mindestens ein Zeichen; erlaubt sind ASCII-Buchstaben, Ziffern,
        <code>_</code> und <code>-</code>. Es gibt keine Maximallänge.
        Beispiele: <code>a</code>, <code>_03a</code>, <code>ggb-01</code>.
        Werte mit Leerzeichen, Punkt oder Umlaut sind nicht zulässig.
        <a
          href="https://iqb-berlin.github.io/tba-info/coding/data-structures/coding-scheme.html#identifizierung"
          target="_blank"
          rel="noopener noreferrer"
        >TBA-Dokumentation zu Variablenbezeichnern</a>
      </aside>

      @for (group of errorGroups; track group.code) {
        <section class="error-group">
          <h2>{{ group.heading }} ({{ group.errors.length }})</h2>
          @for (error of group.errors; track $index) {
            <div class="error-entry">
              <div><b>Eintrag {{ error.variableIndex + 1 }}</b></div>
              <div><b>Quelle:</b> {{ sourceLabel(error.variableIndex) }}</div>
              <div><b>ID:</b> {{ displayId(error.variableIndex) }}</div>
              <div><b>Alias:</b> {{ displayAlias(error.variableIndex) }}</div>
              <div><b>Betroffen:</b> {{ propertyLabel(error.property) }}</div>
              <div><b>Fehlergrund:</b> {{ group.reason }}</div>
              @if (error.conflictingVariableIndex !== undefined) {
                <div>
                  <b>Konfliktpartner:</b>
                  {{ displayConflictPartner(error.conflictingVariableIndex) }}
                </div>
              }
            </div>
          }
        </section>
      }

      @if (derivedEdits.length) {
        <h2>Abgeleitete Variablen bearbeiten</h2>
        @for (edit of derivedEdits; track edit.coding.id) {
          <section class="derived-edit" [attr.aria-label]="'Abgeleitete Variable ' + edit.coding.id">
            <b>{{ edit.coding.alias || edit.coding.id }}</b>
            <p>Technische ID: {{ edit.coding.id }} · {{ edit.coding.codes?.length || 0 }} Codes ·
              {{ edit.coding.deriveSources?.length || 0 }} Quellen</p>
            @if (edit.deleted) {
              <p>Diese Ableitung einschließlich ihrer Regeln, Bewertungen und Hinweise ist zum Löschen vorgemerkt.
                Ihre Quellvariablen und deren Kodierungen bleiben erhalten.</p>
              <button mat-button [disabled]="!canEdit" (click)="markDeleted(edit, false)">Rückgängig</button>
            } @else {
              <mat-form-field appearance="fill">
                <mat-label>Neuer Alias für {{ edit.coding.alias || edit.coding.id }}</mat-label>
                <input matInput [ngModel]="edit.alias" (ngModelChange)="rename(edit, $event)" [disabled]="!canEdit">
              </mat-form-field>
              <button mat-button [disabled]="!canEdit" (click)="markDeleted(edit, true)">
                Ableitung zum Löschen vormerken
              </button>
            }
          </section>
        }
        @if (hasDeletions) {
          <mat-checkbox [ngModel]="confirmDeletion" (ngModelChange)="confirmDeletes($event)" [disabled]="!canEdit">
            Vorgemerkte Ableitungen einschließlich ihrer Kodierung löschen
          </mat-checkbox>
        }
        @for (problem of editProblems; track $index) { <p role="alert">{{ problem }}</p> }
        @if (!canEdit) { <p role="status">Du hast nur Leserechte. Die Kodierungen können nicht verändert werden.</p> }
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-raised-button color="primary" (click)="close()">
        {{ derivedEdits.length ? 'Abbrechen' : 'Schließen' }}
      </button>
      @if (derivedEdits.length) {
        <button mat-raised-button color="primary" [disabled]="!canApply" (click)="apply()">
          Änderungen übernehmen
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; max-height: 95vh; }
    mat-dialog-content { min-height: 0; flex: 1 1 auto; }
    mat-dialog-actions { gap: 8px; flex-wrap: wrap; flex-shrink: 0; }
    .derived-edit { border: 1px solid #ddd; padding: 12px; margin-bottom: 12px; overflow-wrap: anywhere; }
    .derived-edit mat-form-field { display: block; }
    .identifier-help {
      background: #f5f7ff;
      border-left: 4px solid #3f51b5;
      border-radius: 4px;
      margin: 12px 0 18px;
      padding: 12px 14px;
    }

    .identifier-help a {
      display: block;
      margin-top: 8px;
    }

    .error-group {
      margin-bottom: 20px;
    }

    .error-group h2 {
      font-size: 16px;
      margin: 0 0 8px;
    }

    .error-entry {
      border: 1px solid #d7d7d7;
      border-left: 4px solid #b00020;
      border-radius: 4px;
      display: grid;
      gap: 4px;
      margin-bottom: 8px;
      padding: 10px 12px;
    }
  `],
  standalone: true,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButton,
    FormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatCheckbox
  ]
})
export class ResolveIdentifierConflictsDialogComponent {
  identifiers: SchemerIdentifier[];
  errorGroups: ValidationErrorGroup[] = [];
  derivedEdits: DerivedCodingEdit[];
  confirmDeletion = false;
  editProblems: string[] = [];
  private validEdits = false;
  private completed = false;

  constructor(
    private dialogRef: MatDialogRef<ResolveIdentifierConflictsDialogComponent, DerivedIdentifierConflictResult>,
    @Inject(MAT_DIALOG_DATA) public data: ResolveIdentifierConflictsDialogData
  ) {
    this.identifiers = data.analysis.identifiers.map(identifier => ({
      ...identifier
    }));
    this.errorGroups = ERROR_GROUPS
      .map(group => ({
        ...group,
        errors: data.analysis.errors.filter(error => error.code === group.code)
      }))
      .filter(group => group.errors.length > 0);
    this.derivedEdits = getConflictingDerivedCodings(data.variables || [], data.variableCodings || [])
      .map(coding => ({ coding, alias: coding.alias ?? coding.id, deleted: false }));
  }

  get canEdit(): boolean { return !this.completed && !!this.data.canEdit?.(); }

  get hasDeletions(): boolean { return this.derivedEdits.some(edit => edit.deleted); }

  get canApply(): boolean { return this.canEdit && this.validEdits; }

  private changes(): DerivedCodingConflictChange[] {
    return this.derivedEdits.flatMap((edit): DerivedCodingConflictChange[] => {
      if (edit.deleted) return [{ id: edit.coding.id, action: 'DELETE' }];
      return edit.alias === (edit.coding.alias ?? edit.coding.id) ? [] :
        [{ id: edit.coding.id, action: 'RENAME', alias: edit.alias }];
    });
  }

  private validateEdits(): void {
    const changes = this.changes();
    const result = changes.length ? resolveDerivedCodingConflicts(
      this.data.variables || [], this.data.variableCodings || [], changes, this.confirmDeletion
    ) : null;
    this.validEdits = !!result?.variableCodings;
    this.editProblems = result?.problems || [];
  }

  rename(edit: DerivedCodingEdit, alias: string): void {
    if (!this.canEdit || edit.deleted) return;
    edit.alias = alias;
    this.validateEdits();
  }

  markDeleted(edit: DerivedCodingEdit, deleted: boolean): void {
    if (!this.canEdit) return;
    edit.deleted = deleted;
    this.confirmDeletion = false;
    this.validateEdits();
  }

  confirmDeletes(confirmed: boolean): void {
    if (!this.canEdit) return;
    this.confirmDeletion = confirmed;
    this.validateEdits();
  }

  apply(): void {
    this.validateEdits();
    if (!this.canApply) return;
    this.completed = true;
    this.dialogRef.close({ derivedChanges: this.changes(), confirmDeletion: this.confirmDeletion });
  }

  displayId(variableIndex: number): string {
    const id = this.identifiers[variableIndex]?.id;
    return id === '' || id === undefined ? '(leer)' : id;
  }

  displayAlias(variableIndex: number): string {
    const variable = this.identifiers[variableIndex];
    if (!variable || variable.alias === undefined) return '(nicht gesetzt)';
    return variable.alias === '' ? '(leer)' : variable.alias;
  }

  displayConflictPartner(variableIndex: number): string {
    return `Eintrag ${variableIndex + 1} ` +
      `(${this.sourceLabel(variableIndex)}, ` +
      `ID: ${this.displayId(variableIndex)}, ` +
      `Alias: ${this.displayAlias(variableIndex)})`;
  }

  sourceLabel(variableIndex: number): string {
    const identifier = this.identifiers[variableIndex];
    if (!identifier) return '(unbekannt)';

    const labels: Record<SchemerIdentifierOrigin, string> = {
      VAR_LIST: 'Variablenliste',
      BASE_CODING: 'Coding-Scheme (Basisvariable)',
      DERIVED_CODING: 'Coding-Scheme (Derived-Variable)'
    };
    return `${labels[identifier.origin]}, Eintrag ${identifier.sourceIndex + 1}`;
  }

  // eslint-disable-next-line class-methods-use-this
  propertyLabel(property: VariableValidationError['property']): string {
    return property === 'id' ? 'ID' : 'Alias';
  }

  close(): void {
    if (this.completed) return;
    this.completed = true;
    this.dialogRef.close();
  }
}
