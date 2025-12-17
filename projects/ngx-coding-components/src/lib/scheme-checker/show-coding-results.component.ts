import {
  MAT_DIALOG_DATA,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose
} from '@angular/material/dialog';
import {
  Component, Inject, OnInit, ViewChild
} from '@angular/core';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
  MatTable,
  MatTableDataSource
} from '@angular/material/table';
import { TranslateModule } from '@ngx-translate/core';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import {
  MatSlideToggle,
  MatSlideToggleChange
} from '@angular/material/slide-toggle';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import { MatInput } from '@angular/material/input';
import { Response } from '@iqbspecs/response/response.interface';
import { VariableCodingData } from '@iqbspecs/coding-scheme/coding-scheme.interface';
import { CodingFactory } from '@iqb/responses';

type Data = {
  responses: Response[];
  varsWithCodes: string[];
  variableCodings: VariableCodingData[];
};

@Component({
  template: `
    <div mat-dialog-title class="fx-column-start-start title">
      <span>{{ 'coding.result' | translate }}</span>
      <mat-form-field class="filter">
        <mat-label>{{ 'filter-by' | translate }}</mat-label>
        <input matInput (keyup)="applyFilter($event)" #input />
      </mat-form-field>
      <mat-slide-toggle
        class="toggle"
        name="codedVariablesOnly"
        [checked]="codedVariablesOnly"
        (change)="toggleChange($event)"
      >
        {{ 'coding.vars-with-codes-only' | translate }}
      </mat-slide-toggle>
      <mat-slide-toggle
        class="toggle"
        name="rawResponsesView"
        [checked]="rawResponsesView"
        (change)="toggleChange($event)"
      >
        {{ 'coding.raw-responses' | translate }}
      </mat-slide-toggle>
      <mat-slide-toggle
        class="toggle"
        name="transformedValueView"
        [checked]="transformedValueView"
        (change)="toggleChange($event)"
      >
        Transformierte Werte (Fragmentierung)
      </mat-slide-toggle>
    </div>
    <mat-dialog-content>
      @if (isLoading) {
      <mat-spinner></mat-spinner>
      } @if (!isLoading) { @if(rawResponsesView){
      <pre style="white-space: wrap;">
            {{ JSON.stringify(this.dataSource.data) }}
          </pre
      >
      } @else {
      <table
        mat-table
        matSort
        matSortActive="id"
        matSortDirection="asc"
        (matSortChange)="matSort(sort)"
        [dataSource]="dataSource"
      >
        @for (column of displayedColumns; track column) {
        <ng-container [matColumnDef]="column">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>
            {{
              column === 'transformed'
                ? 'Transformiert'
                : ('coding.' + column | translate)
            }}
          </th>
          <td
            mat-cell
            [innerHTML]="element[column]"
            *matCellDef="let element"
          ></td>
        </ng-container>
        }
        <tr
          mat-header-row
          *matHeaderRowDef="displayedColumns; sticky: true"
        ></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
      </table>
      } }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-raised-button color="primary" [mat-dialog-close]="false">
        {{ 'close' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    '.filter{width:100%;margin-top:10px}',
    '.toggle{margin-left:15px}',
    '.title{display:inline!important}'
  ],
  standalone: true,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButton,
    MatDialogClose,
    TranslateModule,
    MatProgressSpinner,
    MatSlideToggle,
    MatLabel,
    MatFormField,
    MatTable,
    MatColumnDef,
    MatHeaderCellDef,
    MatRowDef,
    MatRow,
    MatCell,
    MatHeaderCell,
    MatHeaderRowDef,
    MatSort,
    MatInput,
    MatHeaderRow,
    MatCellDef,
    MatSortHeader
  ]
})
export class ShowCodingResultsComponent implements OnInit {
  dataSource = new MatTableDataSource();
  displayedColumns = ['id', 'value', 'status', 'code', 'score'];
  isLoading = false;
  codedVariablesOnly = true;
  rawResponsesView = false;
  transformedValueView = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: Data) {}

  @ViewChild(MatSort) sort!: MatSort;

  matSort(sort: MatSort) {
    if (this.dataSource) {
      this.dataSource.sort = sort;
    }
  }

  ngOnInit(): void {
    if (
      this.data.responses &&
      this.data.responses.some(r => r.subform !== undefined)
    ) {
      this.displayedColumns.unshift('subform');
    }
    this.rebuildTableData();
  }

  private rebuildTableData(): void {
    const hasSubform =
      this.data.responses &&
      this.data.responses.some(r => r.subform !== undefined);

    const baseResponses = (this.data.responses || []).filter(
      r => !this.codedVariablesOnly || this.data.varsWithCodes.includes(r.id)
    );

    this.dataSource.data = baseResponses.map(r => this.mapResponseToRow(r));

    const baseColumns = ['id', 'value', 'status', 'code', 'score'];
    this.displayedColumns = [...baseColumns];
    if (hasSubform) {
      this.displayedColumns.unshift('subform');
    }
    if (this.transformedValueView) {
      this.displayedColumns.push('transformed');
    }
  }

  private mapResponseToRow(r: Response): Record<string, unknown> {
    return {
      id: r.id,
      subform: r.subform,
      value: ShowCodingResultsComponent.stringifyValue(r.value),
      status: r.status,
      code: (r as unknown as { code?: unknown }).code,
      score: (r as unknown as { score?: unknown }).score,
      transformed: ShowCodingResultsComponent.stringifyValue(
        this.getTransformedValue(r)
      )
    };
  }

  private static stringifyValue(v: unknown): string {
    if (typeof v === 'string') return v;
    if (v === null) return 'null';
    if (typeof v === 'undefined') return '';
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }

  private getTransformedValue(r: Response): unknown {
    const vc = (this.data.variableCodings || []).find(c => c.id === r.id);
    if (!vc) return undefined;

    const sortArray = (vc.processing || []).includes('SORT_ARRAY');
    const fragmenting = vc.fragmenting || '';

    try {
      // transformValue is declared private in typings, but exists in the shipped JS.
      return (
        CodingFactory as unknown as {
          transformValue: (
            value: unknown,
            fragmenting: string,
            sortArray: boolean
          ) => unknown;
        }
      ).transformValue(r.value as unknown, fragmenting, sortArray);
    } catch (e) {
      return {
        error: e instanceof Error ? e.message : String(e)
      };
    }
  }

  applyFilter(event: Event): void {
    const { target } = event;
    if (target) {
      const filterValue = (target as HTMLInputElement).value;
      this.dataSource.filter = filterValue.trim().toLowerCase();
    }
  }

  toggleChange(event: MatSlideToggleChange): void {
    if (event.source.name === 'rawResponsesView') {
      this.rawResponsesView = !this.rawResponsesView;
    } else if (event.source.name === 'codedVariablesOnly') {
      this.codedVariablesOnly = !this.codedVariablesOnly;
      this.rebuildTableData();
    } else if (event.source.name === 'transformedValueView') {
      this.transformedValueView = !this.transformedValueView;
      this.rebuildTableData();
    }
  }

  protected readonly JSON = JSON;
}
