import {Component} from '@angular/core';
import {CodingRule, RuleMethod} from '@iqb/responses';
import {CodeDirective} from "../code.directive";
import {TranslateService} from "@ngx-translate/core";

@Component({
  selector: 'code-choice',
  templateUrl: './code-choice.component.html',
  styleUrls: ['./code-choice.component.scss']
})
export class CodeChoiceComponent extends CodeDirective {
  constructor(
    public translateService: TranslateService
  ) {
    super();
  }

  canAddNewRule(): boolean {
    if (this.firstRuleSet && this.firstRuleSet.rules.length > 0) {
      return this.firstRuleSet.rules[0].method !== 'ELSE'
    }
    return true;
  }

  addRule() {
    if (this.firstRuleSet && this.firstRuleSet.rules) {
      const newRule: CodingRule = {
        method: 'MATCH',
        parameters: ['']
      };
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
