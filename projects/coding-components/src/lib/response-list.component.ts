import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { ResponseData } from '@response-scheme';

@Component({
  template: `
    <div fxLayout="column" style="height: 100%">
      <h1 mat-dialog-title>{{'coding.result-header' | translate}}</h1>

      <mat-dialog-content fxLayout="column" fxLayoutGap="5px" class="result-table">
        <div fxLayout="row" fxLayoutAlign="space-between center">
          <div fxFlex="120px">Variable</div>
          <div fxFlex>Wert</div>
          <div fxFlex>Status</div>
          <div fxFlex="50px" class="centered-column">Code</div>
          <div fxFlex="30px" class="centered-column">Bew.</div>
        </div>
        <div fxLayout="row" fxLayoutAlign="space-between center" *ngFor="let rd of data" class="result-entry">
          <div fxFlex="120px">{{rd.id}}</div>
          <div fxFlex>{{rd.value}}</div>
          <div fxFlex>{{rd.status}}: {{'status-label.' + rd.status | translate}}</div>
          <div fxFlex="50px" class="centered-column">{{rd.code || rd.code === 0 ? rd.code : '-'}}</div>
          <div fxFlex="30px" class="centered-column">{{rd.score || rd.score === 0 ? rd.score : '-'}}</div>
        </div>
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
export class ResponseListComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ResponseData[]
  ) { }
}
