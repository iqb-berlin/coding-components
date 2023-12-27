import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {CodeDirective} from "../code.directive";

@Component({
  selector: 'code-manual',
  templateUrl: './code-manual.component.html',
  styleUrls: ['./code-manual.component.scss']
})
export class CodeManualComponent extends CodeDirective {
  constructor(
    public translateService: TranslateService
  ) {
    super();
  }
}
