import {Directive, EventEmitter, Input, Output} from '@angular/core';
import {CodeData} from "@iqb/responses";
import {RichTextEditDialogComponent} from "../rich-text-editor/rich-text-edit-dialog.component";
import {TranslateService} from "@ngx-translate/core";
import {MatDialog} from "@angular/material/dialog";

@Directive()
export abstract class CodeDirective {
  @Output() codeChanged = new EventEmitter<CodeData>();
  @Input() public code: CodeData | undefined;
  @Input() allCodes: CodeData[] | undefined;

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
            this.codeChanged.emit(this.code);
          }
        }
      });
    }
  }
}
