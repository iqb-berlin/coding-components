import {Component, Input} from '@angular/core';
import {CodingRule, RuleMethod} from '@iqb/responses';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import {CodeDirective} from "../code.directive";

@Component({
  selector: 'code-value-list',
  templateUrl: './code-value-list.component.html',
  styleUrls: ['./code-value-list.component.scss']
})
export class CodeValueListComponent extends CodeDirective {
  _maxScore: number = 1;
  @Input()
  set maxScore(value: string) {
    const newValue = Number.parseInt(value, 10);
    this._maxScore = Number.isNaN(newValue) ? 1 : newValue;
  }
  get maxScore(): number {
    return this._maxScore;
  }
  showCodeButtonsOf = '';

  constructor(
    private sanitizer: DomSanitizer,
    public translateService: TranslateService,
    public editTextDialog: MatDialog
  ) {
    super();
  }

  getSanitizedText(text: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(text);
  }

  addRule() {
    if (this.code && this.code.rules && this.code.rules[0]) {
      const existingRuleMethod = this.code.rules[0].method;
      const newRule: CodingRule = {
        method: existingRuleMethod === 'MATCH' ? 'MATCH_REGEX' : 'MATCH',
        parameters: ['']
      };
      this.code.rules.push(newRule);
      this.setCodeChanged();
    }
  }

  canAddRule(): Boolean {
    if (this.code && this.code.rules) {
      if (this.code.rules.length > 1) return false;
      if (this.code.rules[0]) {
        const existingRuleMethod = this.code.rules[0].method;
        return existingRuleMethod !== 'ELSE' && existingRuleMethod !== 'IS_EMPTY';
      }
    }
    return false;
  }

  deleteRule(ruleMethod: RuleMethod) {
    if (this.code) {
      const ruleMethods = this.code.rules.map(r => r.method);
      const methodIndex = ruleMethods.indexOf(ruleMethod);
      if (methodIndex >= 0) this.code.rules.splice(methodIndex, 1);
      this.setCodeChanged();
    }
  }
}
