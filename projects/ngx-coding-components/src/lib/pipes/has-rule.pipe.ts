import { Pipe, PipeTransform } from '@angular/core';
import {CodeData} from "@iqb/responses";

@Pipe({
  name: 'hasRule'
})
export class HasRulePipe implements PipeTransform {
  // eslint-disable-next-line class-methods-use-this
  transform(code: CodeData): boolean {
    if (code && code.ruleSets && code.ruleSets.length > 0) return code.ruleSets[0].rules.length > 0;
    return false;
  }
}
