import {Component, EventEmitter, Input, Output} from '@angular/core';
import {CodeData} from '@iqb/responses';
import {TranslateService} from "@ngx-translate/core";
import {MatDialog} from "@angular/material/dialog";
import {RichTextEditDialogComponent} from "../rich-text-editor/rich-text-edit-dialog.component";
import {DomSanitizer, SafeHtml} from "@angular/platform-browser";

@Component({
  selector: 'code-instruction',
  template: `
    <mat-card *ngIf="code" [style.padding-left.px]="4">
      <mat-card-subtitle class="fx-row-space-between-center">
        {{'manual-instruction.prompt-code' | translate}}
        <button mat-icon-button (click)="editTextDialog_manualInstruction(translateService, editTextDialog)">
          <mat-icon>edit</mat-icon>
        </button>
      </mat-card-subtitle>
      <mat-card-content class="instructions">
        <div [innerHTML]="code ? getSanitizedText(code.manualInstruction) : null"></div>
      </mat-card-content>
    </mat-card>
  `
})
export class CodeInstructionComponent {
  @Output() codeDataChanged = new EventEmitter<CodeData>();
  @Input() public code: CodeData | undefined;

  constructor(
    private sanitizer: DomSanitizer,
    public translateService: TranslateService,
    public editTextDialog: MatDialog
  ) { }

  editTextDialog_manualInstruction(translateService: TranslateService, editTextDialog: MatDialog): void {
    if (this.code) {
      const dialogRef = editTextDialog.open(RichTextEditDialogComponent, {
        width: '1100px',
        data: {
          title: translateService.instant('manual-instruction.prompt-code'),
          content: this.code.manualInstruction || '',
          defaultFontSize: 20,
          editorHeightPx: 400
        },
        autoFocus: false
      });
      dialogRef.afterClosed().subscribe(dialogResult => {
        if (typeof dialogResult !== 'undefined') {
          if (dialogResult !== false && this.code) {
            this.code.manualInstruction = dialogResult;
            this.codeDataChanged.emit(this.code);
          }
        }
      });
    }
  }

  getSanitizedText(text: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(text);
  }
}
