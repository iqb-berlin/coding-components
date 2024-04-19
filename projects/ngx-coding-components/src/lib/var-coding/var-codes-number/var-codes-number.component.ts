import {Component, OnInit} from '@angular/core';
import {VarCodesDirective} from "../var-codes.directive";
import { TranslateService, TranslateModule } from "@ngx-translate/core";
import { MatIcon } from '@angular/material/icon';
import { MatIconButton, MatButton } from '@angular/material/button';
import { CodeRulesComponent } from '../code-rules/code-rules.component';
import { MatTooltip } from '@angular/material/tooltip';
import { CodeHeaderComponent } from '../code-header.component';

import { CodesTitleComponent } from '../codes-title.component';

@Component({
    selector: 'var-codes-number',
    templateUrl: './var-codes-number.component.html',
    styleUrls: ['./var-codes-number.component.scss'],
    standalone: true,
    imports: [CodesTitleComponent, CodeHeaderComponent, MatTooltip, CodeRulesComponent, MatIconButton, MatIcon, MatButton, TranslateModule]
})
export class VarCodesNumberComponent extends VarCodesDirective implements OnInit {
  constructor(
    public translateService: TranslateService
  ) {
    super();
  }

  ngOnInit() {
    this.updateCodeExistences();
  }
}
