import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  template: `
    <div fxLayout="column" style="height: 100%">
      <h1 mat-dialog-title>{{data.title}}</h1>
      <rich-text-editor [(content)]="data.content"
                        [editorHeightPx]="data.editorHeightPx"
                        [defaultFontSize]="data.defaultFontSize">
      </rich-text-editor>
      <mat-dialog-actions class="fx-row-space-between-center">
        <div class="fx-row-start-center">
          <button mat-raised-button [mat-dialog-close]="data.content">{{'dialog-save' | translate }}</button>
          <button mat-raised-button [mat-dialog-close]="false">{{'dialog-cancel' | translate }}</button>
        </div>
        <button mat-raised-button [mat-dialog-close]="''">{{'dialog-empty' | translate }}</button>
      </mat-dialog-actions>
    </div>
  `
})
export class RichTextEditDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: {
    title: string,
    content: string | Record<string, any>,
    defaultFontSize: number,
    editorHeightPx: number
  }) { }
}
