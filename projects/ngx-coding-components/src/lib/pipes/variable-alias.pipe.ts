import { Pipe, PipeTransform } from '@angular/core';
import {SchemerService} from "../services/schemer.service";

@Pipe({
  name: 'varAlias',
  standalone: true
})
export class VariableAliasPipe implements PipeTransform {

  constructor(
    public schemerService: SchemerService
  ) { }

  transform(value?: string | string[]): string {
    return this.schemerService.getVariableAliasById(value);
  }
}
