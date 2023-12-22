import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CodingSchemeProblem} from "@iqb/responses";

@Component({
  template: `
    <h1 mat-dialog-title>Kodierschema prüfen</h1>

    <mat-dialog-content>
      <div *ngFor="let v of allVariables" class="fx-column-start-stretch">
        <h2>{{v}}</h2>
        <div class="fx-row-start-center code-row" *ngFor="let p of codingProblemsGrouped[v]">
          <div [class]="(p.breaking ? 'problem-error' : 'problem-warning') + ' fx-flex-row-5'" [style.text-align]="'center'">&nbsp;</div>
          <div class="fx-flex-fill">{{'coding-problem.' + p.type | translate}}</div>
          <div *ngIf="p.code" class="fx-flex-row-10" [style.text-align]="'center'">Code: {{p.code}}</div>
        </div>
      </div>
      <div *ngIf="allVariables.length === 0">keine Probleme gefunden.</div>
    </mat-dialog-content>

    <mat-dialog-actions>
      <button mat-raised-button [mat-dialog-close]="false">{{'dialog-close' | translate}}</button>
    </mat-dialog-actions>
  `,
  styles: [
    '.code-row:nth-child(even) {background-color: #f1f1f1;}',
    '.code-row {margin-left: 12px}',
    '.problem-warning {background-color: #ffcc00; margin-right: 5px}',
    '.problem-error {background-color: #ff3300; margin-right: 5px}'
  ]})
export class ShowCodingProblemsDialogComponent {
  codingProblemsGrouped: {[ key: string]: CodingSchemeProblem[]} = {};
  allVariables: string[];
  constructor(@Inject(MAT_DIALOG_DATA) private codingProblems: CodingSchemeProblem[]) {
    const allVariables: string[] = [];
    codingProblems.forEach(p => {
      if (allVariables.indexOf(p.variableId) < 0) allVariables.push(p.variableId);
    })
    this.allVariables = allVariables.sort();
    allVariables.forEach(v => {
      this.codingProblemsGrouped[v] = codingProblems.filter(p => p.variableId === v);
    });
  }
}
