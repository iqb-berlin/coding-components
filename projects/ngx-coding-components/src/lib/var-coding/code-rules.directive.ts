import {Directive, EventEmitter, Input, Output} from '@angular/core';
import {CodeData, CodingRule, RuleMethod, RuleMethodParameterCount, RuleSet, VariableInfo} from "@iqb/responses";


@Directive()
export abstract class CodeRulesDirective {
  @Output() codeRulesChanged = new EventEmitter<CodeData>();
  @Input() public code: CodeData | undefined;
  @Input() elseCodeExists: boolean | undefined;
  @Input() isEmptyCodeExists: boolean | undefined;
  @Input() isNullCodeExists: boolean | undefined;
  @Input() varInfo: VariableInfo | undefined;
  @Input() fragmentMode: boolean | undefined;
  getParamCountWrapper = CodeRulesDirective.getParamCount;
  get firstRuleSet(): RuleSet | undefined {
    if (this.code && this.code.ruleSets && this.code.ruleSets.length > 0) return this.code.ruleSets[0];
    return undefined;
  }

  static getParamCount(ruleMethod: RuleMethod): number {
    return RuleMethodParameterCount[ruleMethod];
  }

  setCodeRulesChanged() {
    this.codeRulesChanged.emit(this.code);
  }

  addRule(ruleSet: RuleSet, newRuleMethod: RuleMethod) {
    if (ruleSet) {
      const newRule: CodingRule = {
        method: newRuleMethod
      };
      const paramCount = this.getParamCountWrapper(newRuleMethod);
      if (paramCount !== 0) {
        newRule.parameters = [''];
        if (paramCount > 1) newRule.parameters.push('');
      }
      ruleSet.rules.push(newRule);
      this.setCodeRulesChanged();
    }
  }

  addRuleSet() {
    if (this.code) {
      this.code.ruleSets.push({
        valueArrayPos: -1,
        ruleOperatorAnd: false,
        rules: []
      })
      this.setCodeRulesChanged();
    }
  }

  deleteRule(ruleSet: RuleSet, ruleToDeleteIndex: number) {
    console.log(ruleSet, ruleToDeleteIndex);
    if (ruleSet && ruleToDeleteIndex >= 0) {
      ruleSet.rules.splice(ruleToDeleteIndex, 1);
      this.setCodeRulesChanged();
    }
  }

  deleteRuleSet(ruleSetToDeleteIndex: number) {
    if (this.code && ruleSetToDeleteIndex >= 0) {
      this.code.ruleSets.splice(ruleSetToDeleteIndex, 1);
      this.setCodeRulesChanged();
    }
  }
}
