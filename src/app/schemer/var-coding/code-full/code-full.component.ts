import { Component } from '@angular/core';
import { CodingRule, RuleMethod, RuleMethodParameterCount} from '@iqb/responses';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { RichTextEditDialogComponent } from '../../rich-text-editor/rich-text-edit-dialog.component';
import {CodeDirective} from "../code.directive";

@Component({
  selector: 'code-full',
  templateUrl: './code-full.component.html',
  styleUrls: ['./code-full.component.scss']
})
export class CodeFullComponent extends CodeDirective {
  showCodeButtonsOf = '';
  getParamCountWrapper = CodeFullComponent.getParamCount;

  constructor(
    private sanitizer: DomSanitizer,
    private translateService: TranslateService,
    private editTextDialog: MatDialog
  ) {
    super();
  }

  getSanitizedText(text: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(text);
  }

  editTextDialog_manualInstruction(): void {
    if (this.code) {
      const dialogRef = this.editTextDialog.open(RichTextEditDialogComponent, {
        width: '860px',
        data: {
          title: this.translateService.instant('manual-instruction.prompt-code'),
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
            this.setCodeChanged();
          }
        }
      });
    }
  }

  getNewRules(): RuleMethod[] {
    const singletonRules: RuleMethod[] = [
      'IS_FALSE', 'IS_TRUE', 'IS_NULL', 'IS_EMPTY', 'ELSE'
    ]
    let returnSources: RuleMethod[] = [];
    if (this.code) {
      if (this.code.rules.length === 0) {
        returnSources = ['MATCH', 'MATCH_REGEX', 'NUMERIC_RANGE', 'NUMERIC_LESS_THEN', 'NUMERIC_MORE_THEN',
          'NUMERIC_MAX', 'NUMERIC_MIN'];
        singletonRules.forEach(r => {
          if (!this.hasRule(r)) returnSources.push(r);
        })
      } else if (singletonRules.indexOf(this.code.rules[0].method) < 0) {
        const usedMethods = this.code.rules.map(rule => rule.method);
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
    return returnSources;
  }

  static getParamCount(ruleMethod: RuleMethod): number {
    return RuleMethodParameterCount[ruleMethod];
  }

  addRule(newRuleMethod: RuleMethod) {
    if (this.code) {
      const newRule: CodingRule = {
        method: newRuleMethod
      };
      const paramCount = CodeFullComponent.getParamCount(newRuleMethod);
      if (paramCount !== 0) {
        newRule.parameters = [''];
        if (paramCount > 1) newRule.parameters.push('');
      }
      this.code.rules.push(newRule);
      this.setCodeChanged();
    }
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

  deleteRule(ruleMethod: RuleMethod) {
    if (this.code) {
      const ruleMethods = this.code.rules.map(r => r.method);
      const methodIndex = ruleMethods.indexOf(ruleMethod);
      if (methodIndex >= 0) this.code.rules.splice(methodIndex, 1);
      this.setCodeChanged();
    }
  }

  hasRule(ruleCode: RuleMethod): boolean {
    if (this.allCodes) {
      const myRule = this.allCodes.find(c => !!c.rules.find(r => r.method === ruleCode));
      return !!myRule;
    }
    return false;
  }

  setCodeChanged() {
    this.codeChanged.emit(this.allCodes);
  }
}
