import { Pipe, PipeTransform } from '@angular/core';
import { SchemerService } from '../services/schemer.service';

@Pipe({
  name: 'varAlias',
  standalone: true
})
export class VariableAliasPipe implements PipeTransform {
  constructor(
    public schemerService: SchemerService
  ) { }

  transform(value: string | string[], maxEntries?: number): string {
    if (Array.isArray(value)) return this.schemerService.getVariableAliasByIdListString(value, maxEntries || 0);
    return this.schemerService.getVariableAliasById(value);
  }
}
