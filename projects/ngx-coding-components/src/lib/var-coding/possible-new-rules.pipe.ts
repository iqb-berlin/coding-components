import { Pipe, PipeTransform } from '@angular/core';
import {CodingRule} from "@iqb/responses";
import {RuleMethod} from "@iqb/responses/coding-interfaces";

@Pipe({
  name: 'possibleNewRules'
})
export class PossibleNewRulesPipe implements PipeTransform {
  // eslint-disable-next-line class-methods-use-this
  transform(value: CodingRule[], dataType: string, nullable: boolean, fragmenting: boolean): RuleMethod[] {
    let returnMethods: RuleMethod[];
    const allRuleMethods = value.map(r => r.method);
    if (allRuleMethods.indexOf('ELSE') >= 0) return [];
    if (dataType === 'boolean') {
      returnMethods = ['IS_FALSE', 'IS_TRUE'];
    } else if (dataType === 'number') {
      returnMethods = ['NUMERIC_RANGE', 'NUMERIC_LESS_THEN', 'NUMERIC_MORE_THEN',
        'NUMERIC_MAX', 'NUMERIC_MIN', 'MATCH'];
    } else if (dataType === 'string') {
      returnMethods = ['MATCH', 'MATCH_REGEX'];
    } else {
      returnMethods = ['MATCH', 'MATCH_REGEX', 'NUMERIC_RANGE', 'NUMERIC_LESS_THEN', 'NUMERIC_MORE_THEN',
        'NUMERIC_MAX', 'NUMERIC_MIN', 'IS_FALSE', 'IS_TRUE'];
    }
    if (nullable) returnMethods.push('IS_NULL');
    returnMethods.push('IS_EMPTY');
    if (fragmenting) return returnMethods;

    if (!dataType) {
      value.forEach(r => {
        if (['IS_FALSE', 'IS_TRUE'].indexOf(r.method) >= 0) {
          dataType = 'boolean';
        } else if (['NUMERIC_RANGE', 'NUMERIC_LESS_THEN', 'NUMERIC_MORE_THEN',
          'NUMERIC_MAX', 'NUMERIC_MIN'].indexOf(r.method) >= 0) {
          dataType = 'number';
        }
      })
    }
    if (dataType === 'boolean') {
      if (allRuleMethods.length > 0) return [];
    } else if (dataType === 'number') {
      if (allRuleMethods.indexOf('NUMERIC_LESS_THEN') >= 0 || allRuleMethods.indexOf('NUMERIC_MAX') >= 0) {
        returnMethods = returnMethods.filter(r => r !== 'NUMERIC_MAX' && r !== 'NUMERIC_LESS_THEN');
      }
      if (allRuleMethods.indexOf('NUMERIC_MORE_THEN') >= 0 || allRuleMethods.indexOf('NUMERIC_MIN') >= 0) {
        returnMethods = returnMethods.filter(r => r !== 'NUMERIC_MORE_THEN'
          && r !== 'NUMERIC_MIN');
      }
    }
    return returnMethods;
  }
}
