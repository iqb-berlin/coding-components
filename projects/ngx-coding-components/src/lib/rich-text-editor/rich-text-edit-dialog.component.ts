import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA, MatDialogTitle, MatDialogContent, MatDialogClose
} from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { MatButton } from '@angular/material/button';
import { RichTextEditorComponent } from './rich-text-editor.component';

@Component({
  template: `
      <h1 mat-dialog-title>{{data.title}}</h1>
      <aspect-rich-text-editor [(content)]="data.content" mat-dialog-content
                               [clozeMode]="false"
                               [editorHeightPx]="data.editorHeightPx"
                               [defaultFontSize]="data.defaultFontSize">
      </aspect-rich-text-editor>
      <div class="fx-row-space-between-center" [style.margin]="'0 26px 18px'">
        <div class="fx-gap-10">
          <button mat-raised-button [mat-dialog-close]="data.content">{{'dialog-save' | translate }}</button>
          <button mat-raised-button [mat-dialog-close]="false">{{'dialog-cancel' | translate }}</button>
        </div>
        <button mat-raised-button [mat-dialog-close]="''">{{'dialog-empty' | translate }}</button>
      </div>
  `,
  standalone: true,
  imports: [MatDialogTitle, RichTextEditorComponent, MatDialogContent, MatButton, MatDialogClose, TranslateModule]
})
export class RichTextEditDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: {
    title: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    content: string | Record<string, any>,
    defaultFontSize: number,
    editorHeightPx: number
  }) { }
}
