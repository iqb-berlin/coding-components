import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'ruleReference',
  standalone: true
})
export class RuleReferencePipe implements PipeTransform {
  // eslint-disable-next-line class-methods-use-this
  transform(value?: number | 'ANY' | 'ANY_OPEN' | 'SUM' | 'LENGTH'): string {
    if (typeof value === 'number') {
      return value < 0 ? '-' : (value + 1).toString();
    }

    switch (value) {
      case 'SUM':
        return 'S';
      case 'LENGTH':
        return 'L';
      case 'ANY_OPEN':
        return 'O';
      default:
        return '-';
    }
  }
}
