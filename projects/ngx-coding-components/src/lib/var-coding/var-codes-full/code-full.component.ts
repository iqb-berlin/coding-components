import { Component } from '@angular/core';
import { CodingRule, RuleMethod } from '@iqb/responses';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import {CodeDirective} from "../code.directive";
import {exclusiveNumericRules, singletonRules} from "../var-codes.directive";

@Component({
  selector: 'code-full',
  templateUrl: './code-full.component.html',
  styleUrls: ['./code-full.component.scss']
})
export class CodeFullComponent extends CodeDirective {
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

  getNewRules(): RuleMethod[] {
    let returnSources: RuleMethod[] = [];
    if (this.firstRuleSet) {
      if (this.firstRuleSet.rules.length === 0) {
        returnSources = ['MATCH', 'MATCH_REGEX', ...exclusiveNumericRules];
        singletonRules.filter(r => r !== "IS_TRUE" && r !== 'IS_FALSE').forEach(r => {
          if (!this.hasRule(r)) returnSources.push(r);
        })
      } else if (singletonRules.indexOf(this.firstRuleSet.rules[0].method) < 0) {
        const usedMethods = this.firstRuleSet.rules.map(rule => rule.method);
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

  addRule(newRuleMethod: RuleMethod) {
    if (this.firstRuleSet) {
      const newRule: CodingRule = {
        method: newRuleMethod
      };
      const paramCount = CodeDirective.getParamCount(newRuleMethod);
      if (paramCount !== 0) {
        newRule.parameters = [''];
        if (paramCount > 1) newRule.parameters.push('');
      }
      this.firstRuleSet.rules.push(newRule);
      this.setCodeChanged();
    }
  }

  deleteRule(ruleMethod: RuleMethod) {
    if (this.firstRuleSet) {
      const ruleMethods = this.firstRuleSet.rules.map(r => r.method);
      const methodIndex = ruleMethods.indexOf(ruleMethod);
      if (methodIndex >= 0) this.firstRuleSet.rules.splice(methodIndex, 1);
      this.setCodeChanged();
    }
  }
}
