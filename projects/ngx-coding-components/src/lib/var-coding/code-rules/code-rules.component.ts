import {Component, EventEmitter, Input, Output, ViewChild} from '@angular/core';
import {MatDialog} from "@angular/material/dialog";
import {CodeData, CodingRule, RuleMethod, RuleSet, VariableInfo} from "@iqb/responses";
import {
  SelectCodeRuleReferenceDialogComponent,
  SelectCodeRuleReferenceDialogData
} from "../../dialogs/select-code-rule-reference-dialog.component";
import { MatTabGroup, MatTab } from "@angular/material/tabs";
import {SchemerService} from "../../services/schemer.service";
import {CodeModelType} from "@iqb/responses/coding-interfaces";
import { RuleReferencePipe } from '../../pipes/rule-reference.pipe';
import { PossibleNewRulesPipe } from '../../pipes/possible-new-rules.pipe';
import { TranslateModule } from '@ngx-translate/core';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { MatInput } from '@angular/material/input';
import { MatFormField } from '@angular/material/form-field';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatButtonToggleGroup, MatButtonToggle } from '@angular/material/button-toggle';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIconButton, MatButton } from '@angular/material/button';

import { MatCard, MatCardSubtitle, MatCardContent } from '@angular/material/card';
import {JsonPipe} from "@angular/common";

@Component({
    selector: 'code-rules',
    templateUrl: './code-rules.component.html',
    styleUrls: ['./code-rules.component.scss'],
    standalone: true,
  imports: [MatCard, MatCardSubtitle, MatIconButton, MatTooltip, MatIcon, MatButtonToggleGroup, ReactiveFormsModule, FormsModule, MatButtonToggle, MatCardContent, MatTabGroup, MatTab, MatFormField, MatInput, CdkTextareaAutosize, MatButton, MatMenuTrigger, MatMenu, MatMenuItem, TranslateModule, PossibleNewRulesPipe, RuleReferencePipe, JsonPipe]
})
export class CodeRulesComponent {
  @Output() codeRulesChanged = new EventEmitter<CodeData>();
  @Input() public code: CodeData | undefined;
  @Input() elseCodeExists: boolean | undefined;
  @Input() isEmptyCodeExists: boolean | undefined;
  @Input() isNullCodeExists: boolean | undefined;
  @Input() varInfo: VariableInfo | undefined;
  @Input() preferredDataType: 'string' | 'integer' | 'number' | 'boolean' | 'attachment' | undefined;
  @Input() codingModel: CodeModelType | undefined;
  @Input() fragmentMode: boolean | undefined;
  showCodeButtonsOf = '';
  @ViewChild(MatTabGroup) ruleSetElement: MatTabGroup | undefined;

  constructor(
    public editRuleReferenceDialog: MatDialog,
    public schemerService: SchemerService
  ) {}

  setCodeRulesChanged() {
    this.codeRulesChanged.emit(this.code);
  }

  addRule(ruleSet: RuleSet, newRuleMethod: RuleMethod) {
    if (ruleSet) {
      const newRule: CodingRule = {
        method: newRuleMethod
      };
      const paramCount = this.schemerService.ruleMethodParameterCount[newRuleMethod];
      if (paramCount !== 0) {
        newRule.parameters = [''];
        if (paramCount > 1) newRule.parameters.push('');
      }
      ruleSet.rules.push(newRule);
      this.setCodeRulesChanged();
    }
  }

  addRuleSet() {
    if (this.code) {
      this.code.ruleSets.push({
        valueArrayPos: -1,
        ruleOperatorAnd: false,
        rules: []
      })
      this.setCodeRulesChanged();
    }
  }

  deleteRule(ruleSet: RuleSet, ruleToDeleteIndex: number) {
    console.log(ruleSet, ruleToDeleteIndex);
    if (ruleSet && ruleToDeleteIndex >= 0) {
      ruleSet.rules.splice(ruleToDeleteIndex, 1);
      this.setCodeRulesChanged();
    }
  }

  deleteRuleSet(ruleSetToDeleteIndex: number) {
    if (this.code && ruleSetToDeleteIndex >= 0) {
      this.code.ruleSets.splice(ruleSetToDeleteIndex, 1);
      this.setCodeRulesChanged();
    }
  }

  editFragmentReference(rule: CodingRule) {
    if (rule) {
      const dialogRef = this.editRuleReferenceDialog.open(
        SelectCodeRuleReferenceDialogComponent, {
        width: '400px',
        data: <SelectCodeRuleReferenceDialogData>{
          isFragmentMode: true,
          value: rule.fragment || 'ANY'
        },
        autoFocus: false
      });
      dialogRef.afterClosed().subscribe(dialogResult => {
        if (dialogResult !== false) {
          rule.fragment = dialogResult;
          this.setCodeRulesChanged();
        }
      });
    }
  }

  editArrayReference(ruleSet: RuleSet) {
    if (ruleSet) {
      const dialogRef = this.editRuleReferenceDialog.open(
        SelectCodeRuleReferenceDialogComponent, {
          width: '400px',
          data: <SelectCodeRuleReferenceDialogData>{
            isFragmentMode: false,
            value: ruleSet.valueArrayPos || 'ANY'
          },
          autoFocus: false
        });
      dialogRef.afterClosed().subscribe(dialogResult => {
        if (dialogResult !== false) {
          ruleSet.valueArrayPos = dialogResult;
          this.setCodeRulesChanged();
        }
      });
    }
  }

  setTab() {
    if (this.ruleSetElement && this.code) this.ruleSetElement.selectedIndex = this.code.ruleSets.length - 1
  }
}
