import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle
} from '@angular/material/dialog';
import { MatList, MatListItem } from '@angular/material/list';
import { NgForOf } from '@angular/common';
import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';

@Component({
  standalone: true,
  selector: 'app-duplicate-selection-dialog',
  template: `
    <h1 mat-dialog-title>Duplikate gefunden</h1>
    <div mat-dialog-content>
      <p>Es wurden Variablen mit doppelten Werten gefunden. Bitte wählen Sie die gewünschte aus:</p>
      <mat-list>
        <mat-list-item *ngFor="let variable of data" (click)="selectVariable(variable)">
          <b>ID:</b> {{ variable.id }}, <b>Alias:</b> {{ variable.alias }}, <b>Vorkommen:</b> {{ variable.count }}
          <mat-list-item *ngFor="let vara of variable.variables">
            <b>ID:</b> {{ vara.values[1].value }}
          </mat-list-item>

        </mat-list-item>
      </mat-list>
    </div>
    <div mat-dialog-actions>
      <button mat-button (click)="closeDialog()">Abbrechen</button>
    </div>
  `,
  imports: [
    MatList,
    MatListItem,
    NgForOf,
    MatDialogContent,
    MatDialogActions,
    MatDialogTitle
  ]
})
export class DuplicateSelectionDialog {
  constructor(
    public dialogRef: MatDialogRef<DuplicateSelectionDialog>,
    @Inject(MAT_DIALOG_DATA) public data: { id: string, alias: string, count: number, variables: VariableInfo[] }[]
  ) {}

  selectVariable(variable: { id: string, alias: string, count: number, variables: VariableInfo[] }): void {
    this.dialogRef.close(variable);
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}
