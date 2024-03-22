import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { CodingSchemeProblem} from "@iqb/responses";
import { TranslateModule } from '@ngx-translate/core';
import { MatButton } from '@angular/material/button';
import { NgFor, NgIf } from '@angular/common';

@Component({
    template: `
    <h1 mat-dialog-title>Kodierschema prüfen</h1>

    <mat-dialog-content>
      <div *ngFor="let v of allVariables" class="fx-column-start-stretch">
        <div class="var-header">{{v}}</div>
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
        '.var-header {margin-top: 12px; margin-bottom: 3px; font-size: larger; color: darkblue}',
        '.problem-warning {background-color: #ffcc00; margin-right: 5px}',
        '.problem-error {background-color: #ff3300; margin-right: 5px}'
    ],
    standalone: true,
    imports: [MatDialogTitle, MatDialogContent, NgFor, NgIf, MatDialogActions, MatButton, MatDialogClose, TranslateModule]
})
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
