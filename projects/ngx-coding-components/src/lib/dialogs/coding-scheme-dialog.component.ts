import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef
} from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatIcon } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  template: `
    <mat-dialog-content>
      <div class="fx-row-space-between-end">
        <h2>Kodierschema</h2>
        <button mat-icon-button (click)="onCopy()" class="copy-button">
          <mat-icon>content_copy</mat-icon>
        </button>
        </div>
        <pre>{{ jsonData }}</pre>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-raised-button color="primary" (click)="onClose()">{{ 'dialog-close' | translate }}</button>
    </mat-dialog-actions>
  `,
  standalone: true,
  imports: [
    MatDialogContent,
    MatDialogActions,
    TranslateModule,
    MatButton,
    MatIcon,
    MatIconButton
  ],
  styles: [
    `
      pre {
        background: #f4f4f4;
        padding: 16px;
        border-radius: 4px;
        overflow: auto;
        max-height: 400px;
        font-size: 14px;
      }
      .copy-button {
        margin-bottom: 8px;
      }
      .copy-button:hover {
        border-color: #888;
      }
      .copy-button:active {
        background-color: #e0e0e0;
        border-color: #888;
      }
    `
  ]
})
export class CodingSchemeDialogComponent {
  jsonData: string;

  constructor(
    private dialogRef: MatDialogRef<CodingSchemeDialogComponent>,
    private clipboard: Clipboard,
    private snackBar: MatSnackBar,
    private translate: TranslateService,
    @Inject(MAT_DIALOG_DATA) public data: { codingScheme: unknown }
  ) {
    // JSON.stringify mit Einrückung für eine lesbare Darstellung
    this.jsonData = JSON.stringify(data.codingScheme, null, 2);
  }

  onCopy() {
    this.clipboard.copy(this.jsonData);
    this.translate.get('copied-to-clipboard').subscribe((translatedMessage: string) => {
      this.snackBar.open(translatedMessage, '', {
        duration: 1000
      });
    });
  }

  onClose() {
    this.dialogRef.close();
  }
}
