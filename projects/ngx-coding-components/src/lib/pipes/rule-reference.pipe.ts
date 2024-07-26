import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'ruleReference',
  standalone: true
})
export class RuleReferencePipe implements PipeTransform {
  // eslint-disable-next-line class-methods-use-this
  transform(value?: number | 'ANY' | 'ANY_OPEN' | 'SUM'): string {
    if (typeof value === 'number') {
      if (value < 0) return '-';
      return (value + 1).toString(10);
    }
    if (value === 'SUM') return 'S';
    if (value === 'ANY_OPEN') return 'O';
    return '-';
  }
}
