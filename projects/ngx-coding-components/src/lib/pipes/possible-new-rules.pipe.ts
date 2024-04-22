import { Pipe, PipeTransform } from '@angular/core';
import {CodingRule, VariableInfo} from "@iqb/responses";
import {RuleMethod} from "@iqb/responses/coding-interfaces";

@Pipe({
    name: 'possibleNewRules',
    standalone: true
})
export class PossibleNewRulesPipe implements PipeTransform {
  // eslint-disable-next-line class-methods-use-this
  private static getNumericRules(otherRuleMethods: string[],
                                 ruleOperatorAnd: boolean, fragmenting?: boolean): RuleMethod[] {
    if (fragmenting || otherRuleMethods.length <= 0) return ['NUMERIC_MATCH', 'NUMERIC_RANGE', 'NUMERIC_LESS_THAN', 'NUMERIC_MAX',
    'NUMERIC_MORE_THAN', 'NUMERIC_MIN'];
    const returnMethods: RuleMethod[] = [];
    if (ruleOperatorAnd) {
      if (otherRuleMethods.indexOf('NUMERIC_RANGE') < 0 &&
        otherRuleMethods.indexOf('NUMERIC_MATCH') < 0) {
        if (otherRuleMethods.indexOf('NUMERIC_LESS_THAN') < 0 && otherRuleMethods.indexOf('NUMERIC_MAX') < 0
          && otherRuleMethods.indexOf('NUMERIC_MORE_THAN') < 0 && otherRuleMethods.indexOf('NUMERIC_MIN') < 0) {
          returnMethods.push('NUMERIC_MATCH');
          returnMethods.push('NUMERIC_RANGE');
        }
        if (otherRuleMethods.indexOf('NUMERIC_LESS_THAN') < 0 && otherRuleMethods.indexOf('NUMERIC_MAX') < 0) {
          returnMethods.push('NUMERIC_MAX');
          returnMethods.push('NUMERIC_LESS_THAN');
        }
        if (otherRuleMethods.indexOf('NUMERIC_MORE_THAN') < 0 && otherRuleMethods.indexOf('NUMERIC_MIN') < 0) {
          returnMethods.push('NUMERIC_MIN');
          returnMethods.push('NUMERIC_MORE_THAN');
        }
      }
    } else {
      returnMethods.push('NUMERIC_MATCH');
      returnMethods.push('NUMERIC_RANGE');
      if (otherRuleMethods.indexOf('NUMERIC_LESS_THAN') < 0 && otherRuleMethods.indexOf('NUMERIC_MAX') < 0) {
        returnMethods.push('NUMERIC_MAX');
        returnMethods.push('NUMERIC_LESS_THAN');
      }
      if (otherRuleMethods.indexOf('NUMERIC_MORE_THAN') < 0 && otherRuleMethods.indexOf('NUMERIC_MIN') < 0) {
        returnMethods.push('NUMERIC_MIN');
        returnMethods.push('NUMERIC_MORE_THAN');
      }
    }
    return returnMethods;
  }
  transform(value: CodingRule[], varInfo?: VariableInfo,
            preferredDataType?: string, fragmenting?: boolean,
            ruleOperatorAnd?: boolean,
            trigger?: number): RuleMethod[] {
    let returnMethods: RuleMethod[] = [];
    const targetDataType = preferredDataType || varInfo?.type || '';
    const otherRuleMethods = value.map(r => r.method);
    if (otherRuleMethods.indexOf('ELSE') >= 0) return [];
    if (ruleOperatorAnd && !fragmenting && otherRuleMethods.indexOf('IS_NULL') >= 0) return [];
    if (ruleOperatorAnd && !fragmenting && otherRuleMethods.indexOf('IS_EMPTY') >= 0) return [];

    if (targetDataType === 'boolean') {
      if (otherRuleMethods.indexOf('IS_FALSE') < 0 && otherRuleMethods.indexOf('IS_TRUE') < 0 && !fragmenting) {
        returnMethods = ['IS_FALSE', 'IS_TRUE'];
      }
    } else if (targetDataType === 'number' || targetDataType === 'integer') {
      returnMethods = PossibleNewRulesPipe.getNumericRules(otherRuleMethods, ruleOperatorAnd || false, fragmenting);
    } else if (targetDataType === 'string') {
      returnMethods = ['MATCH', 'MATCH_REGEX'];
    } else {
      returnMethods = ['MATCH', 'MATCH_REGEX',
        ...PossibleNewRulesPipe.getNumericRules(otherRuleMethods, ruleOperatorAnd || false, fragmenting)];
      if (otherRuleMethods.indexOf('IS_FALSE') < 0 && otherRuleMethods.indexOf('IS_TRUE') < 0 && !fragmenting) {
        returnMethods.push('IS_FALSE');
        returnMethods.push('IS_TRUE');
      }
    }
    if (varInfo && varInfo.nullable && (otherRuleMethods.indexOf('IS_NULL') < 0 || fragmenting)) returnMethods.push('IS_NULL');
    if (otherRuleMethods.indexOf('IS_EMPTY') < 0 || fragmenting) returnMethods.push('IS_EMPTY');
    return returnMethods;
  }
}
