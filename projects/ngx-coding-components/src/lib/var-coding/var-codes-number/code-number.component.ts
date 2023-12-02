import {Component, Input} from '@angular/core';
import {CodingRule, RuleMethod} from '@iqb/responses';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import {CodeDirective} from "../code.directive";
import {exclusiveNumericRules, singletonRules} from "../var-codes.directive";

@Component({
  selector: 'code-number',
  templateUrl: './code-number.component.html',
  styleUrls: ['./code-number.component.scss']
})
export class CodeNumberComponent extends CodeDirective {
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
    public translateService: TranslateService,
    public editTextDialog: MatDialog
  ) {
    super();
  }
  getNewRules(): RuleMethod[] {
    let returnSources: RuleMethod[] = [];
    if (this.code) {
      if (this.code.rules.length === 0) {
        returnSources = ['MATCH', 'MATCH_REGEX', ...exclusiveNumericRules];
        singletonRules.filter(r => r !== "IS_TRUE" && r !== 'IS_FALSE').forEach(r => {
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

  addRule(newRuleMethod: RuleMethod) {
    if (this.code) {
      const newRule: CodingRule = {
        method: newRuleMethod
      };
      const paramCount = CodeDirective.getParamCount(newRuleMethod);
      if (paramCount !== 0) {
        newRule.parameters = [''];
        if (paramCount > 1) newRule.parameters.push('');
      }
      this.code.rules.push(newRule);
      this.setCodeChanged();
    }
  }

  canAddRule(): Boolean {
    if (this.code && this.code.rules) {
      if (this.code.rules.length > 1) return false;
      if (this.code.rules[0]) {
        const existingRuleMethod = this.code.rules[0].method;
        return existingRuleMethod !== 'ELSE';
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

  protected readonly singletonRules = singletonRules;
}
