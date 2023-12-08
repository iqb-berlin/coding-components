import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ToTextFactory, VariableInfo} from "@iqb/responses";

@Component({
  template: `
    <h1 mat-dialog-title>Kodierschema Syntax prüfen</h1>

    <mat-dialog-content>
      <h3>Variable '{{varInfo.id}}'</h3>
      <div *ngFor="let info of ToTextFactory.varInfoAsText(varInfo)">
        <p>{{info}}</p>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions>
      <button mat-raised-button [mat-dialog-close]="false">{{'dialog-close' | translate}}</button>
    </mat-dialog-actions>
  `,
  styles: [
    '.code-row:nth-child(even) {background-color: #f1f1f1;}',
    '.problem-warning {background-color: #ffcc00; margin-right: 5px}',
    '.problem-error {background-color: #ff3300; margin-right: 5px}'
  ]})
export class GenerateCodingDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public varInfo: VariableInfo) { }

  protected readonly ToTextFactory = ToTextFactory;
}
