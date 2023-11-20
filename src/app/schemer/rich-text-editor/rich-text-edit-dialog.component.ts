import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  template: `
      <h1 mat-dialog-title>{{data.title}}</h1>
      <aspect-rich-text-editor [(content)]="data.content" mat-dialog-content
                               [clozeMode]="false"
                               [editorHeightPx]="400"
                               [defaultFontSize]="data.defaultFontSize">
      </aspect-rich-text-editor>
      <div class="fx-row-space-between-center" [style.margin]="'0 26px 18px'">
        <div class="fx-gap-10">
          <button mat-raised-button [mat-dialog-close]="data.content">{{'dialog-save' | translate }}</button>
          <button mat-raised-button [mat-dialog-close]="false">{{'dialog-cancel' | translate }}</button>
        </div>
        <button mat-raised-button [mat-dialog-close]="''">{{'dialog-empty' | translate }}</button>
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
