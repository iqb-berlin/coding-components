import {Component, OnInit} from '@angular/core';
import {VarCodesDirective} from "../var-codes.directive";
import { TranslateService, TranslateModule } from "@ngx-translate/core";
import { MatIcon } from '@angular/material/icon';
import { MatIconButton, MatButton } from '@angular/material/button';
import { CodeInstructionComponent } from '../code-instruction.component';
import { CodeRulesComponent } from '../code-rules/code-rules.component';
import { MatTooltip } from '@angular/material/tooltip';
import { CodeHeaderComponent } from '../code-header.component';

import { MatCheckbox } from '@angular/material/checkbox';
import { CodesTitleComponent } from '../codes-title.component';

@Component({
    selector: 'var-codes-value-list',
    templateUrl: './var-codes-value-list.component.html',
    styleUrls: ['./var-codes-value-list.component.scss'],
    standalone: true,
  imports: [CodesTitleComponent, MatCheckbox, CodeHeaderComponent, MatTooltip, CodeRulesComponent, CodeInstructionComponent, MatIconButton, MatIcon, MatButton, TranslateModule]
})
export class VarCodesValueListComponent extends VarCodesDirective implements OnInit {
  constructor(
    public translateService: TranslateService
  ) {
    super();
  }

  ngOnInit() {
    this.updateCodeExistences();
  }
}
