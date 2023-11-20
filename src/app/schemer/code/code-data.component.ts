import {
  Component, EventEmitter, Input, Output
} from '@angular/core';
import {CodeData, CodingRule, RuleMethod, RuleMethodParameterCount} from '@iqb/responses';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { RichTextEditDialogComponent } from '../rich-text-editor/rich-text-edit-dialog.component';

@Component({
  selector: 'code-data',
  templateUrl: './code-data.component.html',
  styleUrls: ['./code-data.component.scss']
})
export class CodeDataComponent {
  @Output() codeDataChanged = new EventEmitter<CodeData[]>();
  @Input() codeData: CodeData | null = null;
  @Input() allCodes: CodeData[] = [];
  showCodeButtonsOf = '';
  getParamCountWrapper = CodeDataComponent.getParamCount;

  constructor(
    private sanitizer: DomSanitizer,
    private translateService: TranslateService,
    private editTextDialog: MatDialog
  ) { }

  getSanitizedText(text: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(text);
  }

  editTextDialog_manualInstruction(): void {
    if (this.codeData) {
      const dialogRef = this.editTextDialog.open(RichTextEditDialogComponent, {
        width: '860px',
        data: {
          title: this.translateService.instant('manual-instruction.prompt-code'),
          content: this.codeData.manualInstruction || '',
          defaultFontSize: 20,
          editorHeightPx: 400
        },
        autoFocus: false
      });
      dialogRef.afterClosed().subscribe(dialogResult => {
        if (typeof dialogResult !== 'undefined') {
          if (dialogResult !== false && this.codeData) {
            this.codeData.manualInstruction = dialogResult;
            this.setCodeDataChanged();
          }
        }
      });
    }
  }

  getNewRules(): RuleMethod[] {
    let returnSources: RuleMethod[] = [];
    if (this.codeData) {
      if (this.codeData.rules.length === 0) {
        returnSources = ['MATCH', 'MATCH_REGEX', 'NUMERIC_RANGE', 'NUMERIC_LESS_THEN', 'NUMERIC_MORE_THEN',
          'NUMERIC_MAX', 'NUMERIC_MIN'];
        if (!this.hasEmptyRule()) returnSources.push('IS_EMPTY');
        if (!this.hasElseRule()) returnSources.push('ELSE');
      } else {
        const usedMethods = this.codeData.rules.map(rule => rule.method);
        if (usedMethods.indexOf('ELSE') < 0 && usedMethods.indexOf('IS_EMPTY') < 0) {
          if (usedMethods.indexOf('MATCH') < 0) returnSources.push('MATCH');
          if (usedMethods.indexOf('MATCH_REGEX') < 0) returnSources.push('MATCH_REGEX');
          if (usedMethods.indexOf('NUMERIC_RANGE') < 0 && usedMethods.indexOf('NUMERIC_MIN') < 0 &&
            usedMethods.indexOf('NUMERIC_MORE_THEN') < 0 && usedMethods.indexOf('NUMERIC_MAX') < 0 &&
            usedMethods.indexOf('NUMERIC_LESS_THEN') < 0) {
            returnSources.push('NUMERIC_MIN');
            returnSources.push('NUMERIC_MORE_THEN');
            returnSources.push('NUMERIC_RANGE');
            returnSources.push('NUMERIC_MAX');
            returnSources.push('NUMERIC_LESS_THEN');
          }
        }
      }
    }
    return returnSources;
  }

  static getParamCount(ruleMethod: RuleMethod): number {
    return RuleMethodParameterCount[ruleMethod];
  }

  addRule(newRuleMethod: RuleMethod) {
    if (this.codeData) {
      const newRule: CodingRule = {
        method: newRuleMethod
      };
      const paramCount = CodeDataComponent.getParamCount(newRuleMethod);
      if (paramCount !== 0) {
        newRule.parameters = [''];
        if (paramCount > 1) newRule.parameters.push('');
      }
      this.codeData.rules.push(newRule);
      this.setCodeDataChanged();
    }
  }

  uniqueNumberValidator(codeToValidate: number): boolean {
    const allCodeIds = this.allCodes.map(c => c.id);
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

  deleteRule(ruleMethod: RuleMethod) {
    if (this.codeData) {
      const ruleMethods = this.codeData.rules.map(r => r.method);
      const methodIndex = ruleMethods.indexOf(ruleMethod);
      if (methodIndex >= 0) this.codeData.rules.splice(methodIndex, 1);
      this.setCodeDataChanged();
    }
  }

  hasEmptyRule(): boolean {
    let emptyRuleFound = false;
    this.allCodes.forEach(c => {
      c.rules.forEach(r => {
        if (r.method === 'IS_EMPTY') emptyRuleFound = true;
      });
    });
    return emptyRuleFound;
  }

  hasElseRule(): boolean {
    let elseRuleFound = false;
    this.allCodes.forEach(c => {
      c.rules.forEach(r => {
        if (r.method === 'ELSE') elseRuleFound = true;
      });
    });
    return elseRuleFound;
  }

  setCodeDataChanged() {
    this.codeDataChanged.emit(this.allCodes);
  }
}
