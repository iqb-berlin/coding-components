import {Component, OnInit} from '@angular/core';
import {VarCodesDirective} from "../var-codes.directive";
import { TranslateService, TranslateModule } from "@ngx-translate/core";
import { HasRulePipe } from '../../pipes/has-rule.pipe';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton, MatButton } from '@angular/material/button';
import { CodeInstructionComponent } from '../code-instruction.component';
import { MatTooltip } from '@angular/material/tooltip';
import { CodeHeaderComponent } from '../code-header.component';

import { MatCheckbox } from '@angular/material/checkbox';
import { CodesTitleComponent } from '../codes-title.component';

@Component({
    selector: 'var-codes-manual',
    templateUrl: './var-codes-manual.component.html',
    styleUrls: ['./var-codes-manual.component.scss'],
    standalone: true,
    imports: [CodesTitleComponent, MatCheckbox, CodeHeaderComponent, MatTooltip, CodeInstructionComponent, MatIconButton, MatIcon, MatButton, TranslateModule, HasRulePipe]
})
export class VarCodesManualComponent extends VarCodesDirective implements OnInit {
  constructor(
    public translateService: TranslateService
  ) {
    super();
  }

  ngOnInit() {
    this.updateCodeExistences();
  }
}
