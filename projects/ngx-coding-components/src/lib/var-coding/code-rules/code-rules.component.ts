import {Component, ViewChild} from '@angular/core';
import {CodeRulesDirective} from "./code-rules.directive";
import {MatDialog} from "@angular/material/dialog";
import {CodingRule, RuleSet} from "@iqb/responses";
import {
  SelectCodeRuleReferenceDialogComponent,
  SelectCodeRuleReferenceDialogData
} from "../../dialogs/select-code-rule-reference-dialog.component";
import {MatTabGroup} from "@angular/material/tabs";

@Component({
  selector: 'code-rules',
  templateUrl: './code-rules.component.html',
  styleUrls: ['./code-rules.component.scss']
})
export class CodeRulesComponent extends CodeRulesDirective {
  showCodeButtonsOf = '';
  @ViewChild(MatTabGroup) ruleSetElement: MatTabGroup | undefined;

  constructor(
    public editRuleReferenceDialog: MatDialog
  ) {
    super();
  }

  editFragmentReference(rule: CodingRule) {
    if (rule) {
      const dialogRef = this.editRuleReferenceDialog.open(
        SelectCodeRuleReferenceDialogComponent, {
        width: '300px',
        data: <SelectCodeRuleReferenceDialogData>{
          isFragmentMode: true,
          value: typeof rule.fragment === 'undefined' ? -1 : rule.fragment
        },
        autoFocus: false
      });
      dialogRef.afterClosed().subscribe(dialogResult => {
        if (typeof dialogResult === 'number') {
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
          width: '300px',
          data: <SelectCodeRuleReferenceDialogData>{
            isFragmentMode: false,
            value: typeof ruleSet.valueArrayPos === 'undefined' ? -1 : ruleSet.valueArrayPos
          },
          autoFocus: false
        });
      dialogRef.afterClosed().subscribe(dialogResult => {
        if (typeof dialogResult === 'number') {
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
