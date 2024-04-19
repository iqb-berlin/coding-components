import { MAT_DIALOG_DATA, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { Response } from '@iqb/responses';
import { TranslateModule } from '@ngx-translate/core';
import { MatButton } from '@angular/material/button';


@Component({
    template: `
      <h1 mat-dialog-title>{{'coding.result' | translate}}</h1>
      
      <mat-dialog-content>
        <div class="response-list">
          <span class="column-header">{{'coding.variable' | translate}}</span>
          <span class="column-header">{{'coding.value' | translate }}</span>
          <span class="column-header">{{'coding.state' | translate }}</span>
          <span class="column-header centered-column">{{'coding.code' | translate }}</span>
          <span class="column-header centered-column">{{'coding.score' | translate }}</span>
          @for (rd of data; track rd) {
            <span class="column-row">{{rd.id}}</span>
            <span class="column-row">{{rd.value}}</span>
            <span class="column-row">{{rd.status}}: {{'status-label.' + rd.status | translate}}</span>
            <span class="column-row centered-column">{{rd.code || rd.code === 0 ? rd.code : '-'}}</span>
            <span class="column-row centered-column">{{rd.score || rd.score === 0 ? rd.score : '-'}}</span>
          }
        </div>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end">
        <button mat-raised-button
          color="primary"
          [mat-dialog-close]="false">
          {{'close' | translate}}
        </button>
      </mat-dialog-actions>
      `,
    styles: [
        '.response-list  {display: grid; grid-template-columns: 2fr 4fr 2fr 1fr 1fr ; column-gap: 10px; row-gap: 10px;}',
        '.centered-column {text-align: center}',
        '.column-header {font-weight: bold; position: sticky; top: 0; background: white; padding:10px 0}'
    ],
    standalone: true,
    imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatButton, MatDialogClose, TranslateModule]
})
export class ShowCodingResultsComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: Response[]
  ) { }
}
