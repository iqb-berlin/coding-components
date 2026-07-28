import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle
} from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import {
  VariableIdentifiers,
  VariableValidationError,
  VariableValidationErrorCode
} from '../services/variable-identifier-validation';
import { getVarListConflictAnalysis } from '../services/schemer-varlist-validation';

export interface ResolveVarListDuplicatesDialogData {
  varList: VariableIdentifiers[];
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
    <h1 mat-dialog-title>Ungültige Variablenliste</h1>

    <mat-dialog-content>
      <p>
        Die Variablenliste kann nicht übernommen werden. Bitte korrigiere sie
        im Editor und lade den Schemer neu.
      </p>

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
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-raised-button color="primary" (click)="close()">
        Schließen
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
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
    MatButton
  ]
})
export class ResolveVarListDuplicatesDialogComponent {
  varList: VariableIdentifiers[];
  errorGroups: ValidationErrorGroup[] = [];

  constructor(
    private dialogRef: MatDialogRef<ResolveVarListDuplicatesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ResolveVarListDuplicatesDialogData
  ) {
    this.varList = (data.varList || []).map(variable => ({ ...variable }));
    this.recompute();
  }

  recompute(): void {
    const analysis = getVarListConflictAnalysis(this.varList);

    this.errorGroups = ERROR_GROUPS
      .map(group => ({
        ...group,
        errors: analysis.errors.filter(error => error.code === group.code)
      }))
      .filter(group => group.errors.length > 0);
  }

  displayId(variableIndex: number): string {
    const id = this.varList[variableIndex]?.id;
    return id === '' || id === undefined ? '(leer)' : id;
  }

  displayAlias(variableIndex: number): string {
    const variable = this.varList[variableIndex];
    if (!variable || variable.alias === undefined) return '(nicht gesetzt)';
    return variable.alias === '' ? '(leer)' : variable.alias;
  }

  displayConflictPartner(variableIndex: number): string {
    return `Eintrag ${variableIndex + 1} (ID: ${this.displayId(variableIndex)}, ` +
      `Alias: ${this.displayAlias(variableIndex)})`;
  }

  // eslint-disable-next-line class-methods-use-this
  propertyLabel(property: VariableValidationError['property']): string {
    return property === 'id' ? 'ID' : 'Alias';
  }

  close(): void {
    this.dialogRef.close();
  }
}
