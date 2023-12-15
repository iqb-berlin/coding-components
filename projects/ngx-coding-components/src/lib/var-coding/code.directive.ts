import {Directive, EventEmitter, Input, Output} from '@angular/core';
import {CodeData, RuleMethod, RuleMethodParameterCount, RuleSet} from "@iqb/responses";
import {RichTextEditDialogComponent} from "../rich-text-editor/rich-text-edit-dialog.component";
import {TranslateService} from "@ngx-translate/core";
import {MatDialog} from "@angular/material/dialog";

@Directive()
export abstract class CodeDirective {
  @Output() codeChanged = new EventEmitter<CodeData>();
  @Input() public code: CodeData | undefined;
  @Input() allCodes: CodeData[] | undefined;
  @Input() elseCodeExists: Boolean | undefined;
  @Input() isEmptyCodeExists: Boolean | undefined;
  @Input() isNullCodeExists: Boolean | undefined;
  getParamCountWrapper = CodeDirective.getParamCount;
  get firstRuleSet(): RuleSet | undefined {
    if (this.code) return this.code.ruleSets[0];
    return undefined;
  }

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

  static getParamCount(ruleMethod: RuleMethod): number {
    return RuleMethodParameterCount[ruleMethod];
  }

  uniqueNumberValidator(codeToValidate: number): boolean {
    const allCodeIds = this.allCodes ? this.allCodes.map(c => c.id) : [];
    const newArray: number[] = [];
    const notUnique: number[] = [];
    allCodeIds.forEach(u => {
      if (newArray.indexOf(u) >= 0) {
        notUnique.push(u);
      } else {
        newArray.push(u);
      }
    });
    return notUnique.indexOf(codeToValidate) < 0;
  }

  hasRule(ruleCode: RuleMethod): boolean {
    if (this.allCodes) {
      const myRule = this.allCodes.find(
        c => !!c.ruleSets.find(rs => !!rs.rules.find(r => r.method === ruleCode)));
      return !!myRule;
    }
    return false;
  }

  setCodeChanged() {
    this.codeChanged.emit(this.code);
  }
}
