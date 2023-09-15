import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { ResponseData } from '@iqb/responses';

@Component({
  template: `
    <div fxLayout="column" style="height: 100%">
      <h1 mat-dialog-title>{{'coding.result-header' | translate}}</h1>

      <mat-dialog-content fxLayout="column" fxLayoutGap="5px" class="result-table">
        <iqb-response-list></iqb-response-list>
      </mat-dialog-content>

      <mat-dialog-actions>
        <button mat-raised-button [mat-dialog-close]="false">{{'dialog-close' | translate}}</button>
      </mat-dialog-actions>
    </div>`,
  styles: [
    '.result-table .result-entry:nth-child(even) {background-color: #f1f1f1;}',
    '.centered-column {text-align: center}'
  ]
})
export class ShowCodingResultsComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ResponseData[]
  ) { }
}
