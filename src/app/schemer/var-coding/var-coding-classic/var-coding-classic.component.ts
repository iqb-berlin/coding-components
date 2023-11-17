import {
  Component, EventEmitter, Input, Output
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import {CodeData, ValueTransformation, VariableCodingData} from "@iqb/responses";
import {RichTextEditDialogComponent} from "../../rich-text-editor/rich-text-edit-dialog.component";

@Component({
  selector: 'var-coding-classic',
  templateUrl: './var-coding-classic.component.html',
  styleUrls: ['./var-coding-classic.component.scss']
})
export class VarCodingClassicComponent {
  @Output() codesChanged = new EventEmitter<CodeData[]>();
  @Input() codes: CodeData[] | undefined;
  @Input() allVariables: string[] = [];

  constructor(
    private sanitizer: DomSanitizer,
    private translateService: TranslateService,
    private editTextDialog: MatDialog
  ) { }

  addCode() {
    if (this.codes) {
      this.codes.push({
        id: 1,
        label: '',
        score: 0,
        rules: [],
        manualInstruction: ''
      });
      this.codesChanged.emit(this.codes);
    }
  }

  deleteCode(codeToDeleteId: number) {
    if (this.codes) {
      let codePos = -1;
      this.codes.forEach((c: CodeData, i: number) => {
        if (c.id === codeToDeleteId) codePos = i;
      });
      if (codePos >= 0) this.codes.splice(codePos, 1);
      this.codesChanged.emit(this.codes);
    }
  }
}
