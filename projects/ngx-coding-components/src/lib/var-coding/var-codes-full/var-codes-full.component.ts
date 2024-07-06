import { Component, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton, MatButton } from '@angular/material/button';

import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatInput } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatCheckbox } from '@angular/material/checkbox';
import { CodeHeaderComponent } from '../code-header.component';
import { CodeRulesComponent } from '../code-rules/code-rules.component';
import { CodeInstructionComponent } from '../code-instruction.component';
import { VarCodesDirective } from './var-codes.directive';
import { CodesTitleComponent } from '../codes-title.component';

@Component({
  selector: 'var-codes-full',
  templateUrl: './var-codes-full.component.html',
  styleUrls: ['./var-codes-full.component.scss'],
  standalone: true,
  imports: [
    CodesTitleComponent, MatCheckbox, MatFormField, MatTooltip, MatLabel, MatInput,
    ReactiveFormsModule, FormsModule, CodeHeaderComponent, CodeRulesComponent, CodeInstructionComponent,
    MatIconButton, MatIcon, MatButton, TranslateModule
  ]
})
export class VarCodesFullComponent extends VarCodesDirective implements OnInit {
  ngOnInit() {
    this.updateCodeExistences();
  }
}
