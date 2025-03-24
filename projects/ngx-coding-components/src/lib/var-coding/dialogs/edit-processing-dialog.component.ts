import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose
} from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { MatButton } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatCheckbox } from '@angular/material/checkbox';
import { ProcessingParameterType } from '@iqbspecs/coding-scheme/coding-scheme.interface';

export interface EditProcessingDialogData {
  processing: ProcessingParameterType[],
  fragmenting: string
}

@Component({
  template: `
    <h1 mat-dialog-title>{{'processing.prompt' | translate}}</h1>

    <mat-dialog-content>
      <div class="fx-column-start-start">
        <div>{{'processing.label' | translate}}</div>
        @for (p of allProcessings; track p) {
          <mat-checkbox [checked]="data.processing ? (data.processing.includes(p)) : false"
                        (change)="alterProcessing(p, $event.checked)">
            {{'processing.' + p | translate}}
          </mat-checkbox>
        }
      </div>
      <mat-form-field [matTooltip]="'fragmenting.tooltip' | translate">
        <mat-label>{{ 'fragmenting.prompt' | translate }}</mat-label>
        <input matInput [(ngModel)]="data.fragmenting">
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-raised-button color="primary" [mat-dialog-close]="data">{{ 'dialog-save' | translate }}</button>
      <button mat-raised-button [mat-dialog-close]="false">{{'dialog-cancel' | translate}}</button>
    </mat-dialog-actions>
    `,
  standalone: true,
  imports: [
    MatDialogTitle, MatDialogContent, MatDialogActions, MatButton, MatDialogClose, TranslateModule,
    FormsModule, MatTooltipModule, MatFormField, MatInput, MatCheckbox, MatLabel
  ]
})
export class EditProcessingDialogComponent {
  allProcessings: ProcessingParameterType[] = [
    'IGNORE_CASE',
    'IGNORE_ALL_SPACES',
    'IGNORE_DISPENSABLE_SPACES',
    'SORT_ARRAY',
    'REPLAY_REQUIRED',
    'ATTACHMENT'
  ];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: EditProcessingDialogData
  ) {
    this.data.processing = [...this.data.processing];
  }

  alterProcessing(processingId: ProcessingParameterType, checked: boolean): void {
    if (checked) {
      // Add the processing if not already present
      if (!this.data.processing.includes(processingId)) {
        this.data.processing.push(processingId);
      }
    } else {
      // Remove the processing if it exists
      this.data.processing = this.data.processing.filter(p => p !== processingId);
    }
  }
}
