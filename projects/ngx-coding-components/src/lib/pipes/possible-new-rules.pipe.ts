import { Pipe, PipeTransform } from '@angular/core';
import {CodingRule} from "@iqb/responses";
import {RuleMethod} from "@iqb/responses/coding-interfaces";

@Pipe({
  name: 'possibleNewRules'
})
export class PossibleNewRulesPipe implements PipeTransform {
  // eslint-disable-next-line class-methods-use-this
  private static getNumericRules(otherRuleMethods: string[],
                                 ruleOperatorAnd: boolean, fragmenting?: boolean): RuleMethod[] {
    if (fragmenting) return ['NUMERIC_MATCH', 'NUMERIC_RANGE', 'NUMERIC_LESS_THEN', 'NUMERIC_MAX',
    'NUMERIC_MORE_THEN', 'NUMERIC_MIN'];
    const returnMethods: RuleMethod[] = [];
    if (ruleOperatorAnd) {
      if (otherRuleMethods.indexOf('NUMERIC_RANGE') < 0 &&
        otherRuleMethods.indexOf('NUMERIC_MATCH') < 0) {
        if (otherRuleMethods.indexOf('NUMERIC_LESS_THEN') < 0 && otherRuleMethods.indexOf('NUMERIC_MAX') < 0
          && otherRuleMethods.indexOf('NUMERIC_MORE_THEN') < 0 && otherRuleMethods.indexOf('NUMERIC_MIN') < 0) {
          returnMethods.push('NUMERIC_MATCH');
          returnMethods.push('NUMERIC_RANGE');
        }
        if (otherRuleMethods.indexOf('NUMERIC_LESS_THEN') < 0 && otherRuleMethods.indexOf('NUMERIC_MAX') < 0) {
          returnMethods.push('NUMERIC_MAX');
          returnMethods.push('NUMERIC_LESS_THEN');
        }
        if (otherRuleMethods.indexOf('NUMERIC_MORE_THEN') < 0 && otherRuleMethods.indexOf('NUMERIC_MIN') < 0) {
          returnMethods.push('NUMERIC_MIN');
          returnMethods.push('NUMERIC_MORE_THEN');
        }
      }
    } else {
      returnMethods.push('NUMERIC_MATCH');
      returnMethods.push('NUMERIC_RANGE');
      if (otherRuleMethods.indexOf('NUMERIC_LESS_THEN') < 0 && otherRuleMethods.indexOf('NUMERIC_MAX') < 0) {
        returnMethods.push('NUMERIC_MAX');
        returnMethods.push('NUMERIC_LESS_THEN');
      }
      if (otherRuleMethods.indexOf('NUMERIC_MORE_THEN') < 0 && otherRuleMethods.indexOf('NUMERIC_MIN') < 0) {
        returnMethods.push('NUMERIC_MIN');
        returnMethods.push('NUMERIC_MORE_THEN');
      }
    }
    return returnMethods;
  }
  transform(value: CodingRule[], dataType: string,
            nullable?: boolean, fragmenting?: boolean | undefined,
            ruleOperatorAnd?: boolean): RuleMethod[] {
    let returnMethods: RuleMethod[] = [];
    const otherRuleMethods = value.map(r => r.method);
    if (otherRuleMethods.indexOf('ELSE') >= 0) return [];
    if (ruleOperatorAnd && !fragmenting && otherRuleMethods.indexOf('IS_NULL') >= 0) return [];
    if (ruleOperatorAnd && !fragmenting && otherRuleMethods.indexOf('IS_EMPTY') >= 0) return [];

    if (dataType === 'boolean') {
      if (otherRuleMethods.indexOf('IS_FALSE') < 0 && otherRuleMethods.indexOf('IS_TRUE') < 0 && !fragmenting) {
        returnMethods = ['IS_FALSE', 'IS_TRUE'];
      }
    } else if (dataType === 'number') {
      returnMethods = PossibleNewRulesPipe.getNumericRules(otherRuleMethods, ruleOperatorAnd || false, fragmenting);
    } else if (dataType === 'string') {
      returnMethods = ['MATCH', 'MATCH_REGEX'];
    } else {
      returnMethods = ['MATCH', 'MATCH_REGEX',
        ...PossibleNewRulesPipe.getNumericRules(otherRuleMethods, ruleOperatorAnd || false, fragmenting)];
      if (otherRuleMethods.indexOf('IS_FALSE') < 0 && otherRuleMethods.indexOf('IS_TRUE') < 0 && !fragmenting) {
        returnMethods.push('IS_FALSE');
        returnMethods.push('IS_TRUE');
      }
    }
    if (nullable && (otherRuleMethods.indexOf('IS_NULL') < 0 || fragmenting)) returnMethods.push('IS_NULL');
    if (otherRuleMethods.indexOf('IS_EMPTY') < 0 || fragmenting) returnMethods.push('IS_EMPTY');
    return returnMethods;
  }
}
