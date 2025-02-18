import {
  Component, EventEmitter, Input, Output, inject
} from '@angular/core';
import { CodingRule, RuleMethod, RuleSet } from '@iqb/responses';
import { TranslateModule } from '@ngx-translate/core';
import { MatIcon, MatIconRegistry } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatFormField } from '@angular/material/form-field';
import { MatButton, MatIconButton } from '@angular/material/button';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { FormsModule } from '@angular/forms';
import { MatInput } from '@angular/material/input';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';
import { DomSanitizer } from '@angular/platform-browser';
import { RuleReferencePipe } from '../../pipes/rule-reference.pipe';
import { SchemerService } from '../../services/schemer.service';
import {
  SelectCodeRuleReferenceDialogComponent,
  SelectCodeRuleReferenceDialogData
} from '../../dialogs/select-code-rule-reference-dialog.component';

// eslint-disable-next-line max-len
const MATCH_WORD = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#006064"><path d="M40-199v-200h80v120h720v-120h80v200H40Zm342-161v-34h-3q-13 20-35 31.5T294-351q-49 0-77-25.5T189-446q0-42 32.5-68.5T305-541q23 0 42.5 3.5T381-526v-14q0-27-18.5-43T312-599q-21 0-39.5 9T241-564l-43-32q19-27 48-41t67-14q62 0 95 29.5t33 85.5v176h-59Zm-66-134q-32 0-49 12.5T250-446q0 20 15 32.5t39 12.5q32 0 54.5-22.5T381-478q-14-8-32-12t-33-4Zm185 134v-401h62v113l-3 40h3q3-5 24-25.5t66-20.5q64 0 101 46t37 106q0 60-36.5 105.5T653-351q-41 0-62.5-18T563-397h-3v37h-59Zm143-238q-40 0-62 29.5T560-503q0 37 22 66t62 29q40 0 62.5-29t22.5-66q0-37-22.5-66T644-598Z"/></svg>';
// eslint-disable-next-line max-len
const REGULAR_EXPRESSION = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#006064"><path d="M197-199q-56-57-86.5-130T80-482q0-80 30-153t87-130l57 57q-46 45-70 103.5T160-482q0 64 24.5 122.5T254-256l-57 57Zm183-41q-25 0-42.5-17.5T320-300q0-25 17.5-42.5T380-360q25 0 42.5 17.5T440-300q0 25-17.5 42.5T380-240Zm139-200v-71l-61 36-40-70 61-35-61-35 40-70 61 36v-71h80v71l61-36 40 70-61 35 61 35-40 70-61-36v71h-80Zm244 241-57-57q46-45 70-103.5T800-482q0-64-24.5-122.5T706-708l57-57q56 57 86.5 130T880-482q0 80-30 153t-87 130Z"/></svg>';
// eslint-disable-next-line max-len
const ARROW_RANGE = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#006064"><path d="M280-280 80-480l200-200 56 56-103 104h494L624-624l56-56 200 200-200 200-56-56 103-104H233l103 104-56 56Z"/></svg>';
@Component({
  selector: 'code-rule-list',
  templateUrl: './code-rule-list.component.html',
  styleUrls: ['./code-rule-list.component.scss'],
  standalone: true,
  imports: [MatTooltip, MatIcon, TranslateModule, MatIconButton, CdkTextareaAutosize,
    FormsModule, MatButton, MatFormField, MatInput, RuleReferencePipe, MatButtonToggle, MatButtonToggleGroup,
    MatMenu, MatMenuItem, MatMenuTrigger, MatCard, MatCardContent, MatDivider]
})
export class CodeRuleListComponent {
  @Output() codeRulesChanged = new EventEmitter();
  @Output() deleteRuleSetRequested = new EventEmitter();
  @Input() ruleSet: RuleSet | undefined;
  @Input() fragmentMode = false;
  @Input() arrayMode = false;
  @Input() canDeleteRuleSet = false;
  showCodeButtonsOf = '';
  textRules: RuleMethod[] = ['MATCH', 'MATCH_REGEX'];
  numericRules: RuleMethod[] = ['NUMERIC_MATCH', 'NUMERIC_FULL_RANGE', 'NUMERIC_MIN', 'NUMERIC_MORE_THAN',
    'NUMERIC_LESS_THAN', 'NUMERIC_MAX'];

  booleanRules: RuleMethod[] = ['IS_TRUE', 'IS_FALSE'];
  blankRules: RuleMethod[] = ['IS_EMPTY', 'IS_NULL'];
  allRules: RuleMethod[] = [...this.textRules, ...this.booleanRules, ...this.numericRules, ...this.blankRules];

  constructor(

    public schemerService: SchemerService,
    public editRuleReferenceDialog: MatDialog
  ) {
    const iconRegistry = inject(MatIconRegistry);
    const sanitizer = inject(DomSanitizer);
    iconRegistry.addSvgIconLiteral('match-word', sanitizer.bypassSecurityTrustHtml(MATCH_WORD));
    iconRegistry.addSvgIconLiteral('regular-expression', sanitizer.bypassSecurityTrustHtml(REGULAR_EXPRESSION));
    iconRegistry.addSvgIconLiteral('arrow-range', sanitizer.bypassSecurityTrustHtml(ARROW_RANGE));
  }

  setCodeRulesChanged() {
    this.codeRulesChanged.emit();
  }

  addRule(ruleSet: RuleSet | undefined, newRuleMethod: RuleMethod) {
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

  changeRule(ruleSet:RuleSet, ruleToChangeIndex: number, newRuleMethod: RuleMethod) {
    if (ruleSet && ruleToChangeIndex >= 0) {
      const rule = ruleSet.rules[ruleToChangeIndex];
      const paramCount = this.schemerService.ruleMethodParameterCount[newRuleMethod];
      if (paramCount !== 0) {
        if (
          (this.textRules.includes(rule.method) &&
            (newRuleMethod === 'NUMERIC_MATCH' || this.textRules.includes(newRuleMethod))) ||
          (rule.method === 'NUMERIC_MATCH' && this.textRules.includes(newRuleMethod))) {
          rule.parameters = ruleSet.rules[ruleToChangeIndex].parameters;
        } else {
          rule.parameters = [''];
        }
        if (rule.parameters && paramCount > 1) rule.parameters.push('');
      } else {
        rule.parameters = [];
      }
      rule.method = newRuleMethod;
      this.setCodeRulesChanged();
    }
  }

  deleteRule(ruleSet: RuleSet, ruleToDeleteIndex: number) {
    if (ruleSet && ruleToDeleteIndex >= 0) {
      ruleSet.rules.splice(ruleToDeleteIndex, 1);
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
            value: typeof rule.fragment === 'undefined' ? 'ANY' : rule.fragment
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
}
