import {
  Component, EventEmitter, Input, Output
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { RichTextEditDialogComponent } from '../rich-text-editor/rich-text-edit-dialog.component';
import {CodeData, ValueTransformation, VariableCodingData} from "@iqb/responses";

@Component({
  selector: 'var-coding',
  templateUrl: './var-coding.component.html',
  styleUrls: ['./var-coding.component.scss']
})
export class VarCodingComponent {
  @Output() varCodingChanged = new EventEmitter<VariableCodingData | null>();
  @Input() varCoding: VariableCodingData | null = null;
  @Input() allVariables: string[] = [];

  constructor(
    private sanitizer: DomSanitizer,
    private translateService: TranslateService,
    private editTextDialog: MatDialog
  ) { }

  getNewSources(usedVars: string[]) {
    const returnSources: string[] = [];
    this.allVariables.forEach(v => {
      if (this.varCoding && usedVars.indexOf(v) < 0 && v !== this.varCoding.id) returnSources.push(v);
    });
    returnSources.sort();
    return returnSources;
  }

  deleteDeriveSource(source: string) {
    if (this.varCoding) {
      const sourcePos = this.varCoding.deriveSources.indexOf(source);
      if (sourcePos >= 0) this.varCoding.deriveSources.splice(sourcePos, 1);
      this.varCodingChanged.emit(this.varCoding);
    }
  }

  addDeriveSource(v: string) {
    if (this.varCoding) {
      this.varCoding.deriveSources.push(v);
      this.varCoding.deriveSources.sort();
      this.varCodingChanged.emit(this.varCoding);
    }
  }

  alterValueTransformation(transId: ValueTransformation, checked: boolean) {
    if (this.varCoding) {
      const transPos = this.varCoding.valueTransformations.indexOf(transId);
      if (checked && transPos < 0) {
        this.varCoding.valueTransformations.push(transId);
      } else if (!checked && transPos >= 0) {
        this.varCoding.valueTransformations.splice(transPos, 1);
      }
      this.varCodingChanged.emit(this.varCoding);
    }
  }

  getSanitizedText(text: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(text);
  }

  editTextDialog_manualInstruction(): void {
    if (this.varCoding) {
      const dialogRef = this.editTextDialog.open(RichTextEditDialogComponent, {
        width: '860px',
        data: {
          title: this.translateService.instant('manual-instruction.prompt-general'),
          content: this.varCoding.manualInstruction || '',
          defaultFontSize: 20,
          editorHeightPx: 400
        },
        autoFocus: false
      });
      dialogRef.afterClosed().subscribe(dialogResult => {
        if (typeof dialogResult !== 'undefined') {
          if (dialogResult !== false && this.varCoding) {
            this.varCoding.manualInstruction = dialogResult;
            this.varCodingChanged.emit(this.varCoding);
          }
        }
      });
    }
  }

  addCode() {
    if (this.varCoding) {
      this.varCoding.codes.push({
        id: 1,
        label: '',
        score: 0,
        rules: [],
        manualInstruction: ''
      });
      this.varCodingChanged.emit(this.varCoding);
    }
  }

  deleteCode(codeToDeleteId: number) {
    if (this.varCoding) {
      let codePos = -1;
      this.varCoding.codes.forEach((c: CodeData, i: number) => {
        if (c.id === codeToDeleteId) codePos = i;
      });
      if (codePos >= 0) this.varCoding.codes.splice(codePos, 1);
      this.varCodingChanged.emit(this.varCoding);
    }
  }
}
