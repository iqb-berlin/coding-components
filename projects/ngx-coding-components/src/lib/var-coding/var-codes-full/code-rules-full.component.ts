import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {CodeRulesDirective} from "../code-rules.directive";

@Component({
  selector: 'code-rules-full',
  templateUrl: './code-rules-full.component.html',
  styleUrls: ['./code-rules-full.component.scss']
})
export class CodeRulesFullComponent extends CodeRulesDirective {
  showCodeButtonsOf = '';

  constructor(
    public translateService: TranslateService
  ) {
    super();
  }
}
