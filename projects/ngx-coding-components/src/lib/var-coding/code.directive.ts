import {Directive, EventEmitter, Input, Output} from '@angular/core';
import {CodeData, RuleMethod, RuleMethodParameterCount, RuleSet} from "@iqb/responses";

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

  static getParamCount(ruleMethod: RuleMethod): number {
    return RuleMethodParameterCount[ruleMethod];
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
