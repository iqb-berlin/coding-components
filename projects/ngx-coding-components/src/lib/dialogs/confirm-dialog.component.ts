import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';

import { MatButton } from '@angular/material/button';

@Component({
    template: `
    <h1 mat-dialog-title>{{ confirmData.title }}</h1>

    <mat-dialog-content>
      <p>
        {{ confirmData.content }}
      </p>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-raised-button color="primary" [mat-dialog-close]="true">{{ confirmData.confirmButtonLabel }}</button>
      @if (showCancel) {
        <button mat-raised-button [mat-dialog-close]="false">{{'dialog-cancel' | translate}}</button>
      }
    </mat-dialog-actions>
    `,
    standalone: true,
    imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatButton, MatDialogClose, TranslateModule]
})
export class ConfirmDialogComponent implements OnInit {
  showCancel = true;

  constructor(@Inject(MAT_DIALOG_DATA) public confirmData: ConfirmDialogData) {}

  ngOnInit(): void {
    if ((typeof this.confirmData.title === 'undefined') || (this.confirmData.title.length === 0)) {
      this.confirmData.title = 'Bitte bestätigen!';
    }
    if ((typeof this.confirmData.confirmButtonLabel === 'undefined') ||
      (this.confirmData.confirmButtonLabel.length === 0)) {
      this.confirmData.confirmButtonLabel = 'Bestätigen';
    }
    if (!this.confirmData.showCancel) {
      this.showCancel = false;
    }
  }
}

export interface ConfirmDialogData {
  title: string;
  content: string;
  confirmButtonLabel: string;
  showCancel: boolean;
}
