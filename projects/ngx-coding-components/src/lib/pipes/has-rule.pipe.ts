import { Pipe, PipeTransform } from '@angular/core';
import { CodeData } from '@iqb/responses';

@Pipe({
  name: 'hasRule',
  standalone: true
})
export class HasRulePipe implements PipeTransform {
  // eslint-disable-next-line class-methods-use-this
  transform(code: CodeData, specificRule?: string): boolean {
    if (code && code.ruleSets && code.ruleSets.length > 0) {
      if (specificRule) {
        return !!code.ruleSets.find(rs => rs.rules && !!rs.rules.find(r => r.method === specificRule));
      }
      return !!code.ruleSets.find(rs => rs.rules && rs.rules.length > 0);
    }
    return false;
  }
}
