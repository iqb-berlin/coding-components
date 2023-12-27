import {Component, Input} from '@angular/core';
import {CodingRule, RuleMethod} from '@iqb/responses';
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
    public translateService: TranslateService
  ) {
    super();
  }

  addRule() {
    if (this.firstRuleSet && this.firstRuleSet.rules && this.firstRuleSet.rules[0]) {
      const existingRuleMethod = this.firstRuleSet.rules[0].method;
      const newRule: CodingRule = {
        method: existingRuleMethod === 'MATCH' ? 'MATCH_REGEX' : 'MATCH',
        parameters: ['']
      };
      this.firstRuleSet.rules.push(newRule);
      this.setCodeChanged();
    }
  }

  canAddRule(): Boolean {
    if (this.firstRuleSet && this.firstRuleSet.rules) {
      if (this.firstRuleSet.rules.length > 1) return false;
      if (this.firstRuleSet.rules[0]) {
        const existingRuleMethod = this.firstRuleSet.rules[0].method;
        return existingRuleMethod !== 'ELSE' && existingRuleMethod !== 'IS_EMPTY';
      }
    }
    return false;
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
