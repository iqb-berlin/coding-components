import { Component } from '@angular/core';
import {ResponseScheme, VariableInfo} from "@iqb/responses";
import sampleVarList1 from '../../sample-data/var-list-1.json';
import sampleCodings1 from '../../sample-data/coding-scheme-1.json';

@Component({
  selector: 'app-root',
  template: `
      <iqb-schemer
              [varList]="varList1"
              [responseScheme]="codings1"
              [showChecker]="false"
              [showFileMenu]="true"
      ></iqb-schemer>
  `
})
export class AppComponent {
  varList1 = sampleVarList1 as VariableInfo[];
  codings1 = new ResponseScheme();
  title = 'coding-components';

  constructor() {
  }
}
