import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { Response } from '@iqb/responses';

@Component({
  template: `
      <h1 mat-dialog-title>{{'coding.result-header' | translate}}</h1>

      <mat-dialog-content>
        <div class="response-list">
          <div class="response-row" [style.grid-template-columns]="'2fr 5fr 2fr 1fr 1fr'">
            <div>Variable</div>
            <div>Wert</div>
            <div>Status</div>
            <div class="centered-column">Code</div>
            <div class="centered-column">Bew.</div>
          </div>
          <div class="response-row"
               [style.grid-template-columns]="'2fr 5fr 2fr 1fr 1fr'"
               *ngFor="let rd of data">
            <div>{{rd.id}}</div>
            <div>{{rd.value}}</div>
            <div>{{rd.status}}: {{'status-label.' + rd.status | translate}}</div>
            <div class="centered-column">{{rd.code || rd.code === 0 ? rd.code : '-'}}</div>
            <div class="centered-column">{{rd.score || rd.score === 0 ? rd.score : '-'}}</div>
          </div>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions>
        <button mat-raised-button [mat-dialog-close]="false">{{'dialog-close' | translate}}</button>
      </mat-dialog-actions>
    `,
  styles: [
    '.response-list .response-row {display: grid; grid-template-rows: auto; column-gap: 10px}',
    '.response-list .response-row:nth-child(even) {background-color: #f1f1f1;}',
    '.centered-column {text-align: center}'
  ]
})
export class ShowCodingResultsComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: Response[]
  ) { }
}
