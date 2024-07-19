import {
  Component, EventEmitter, Input, Output, ViewChild
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CodeData, VariableInfo } from '@iqb/responses';
import { MatTabGroup, MatTab } from '@angular/material/tabs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
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
import { JsonPipe } from '@angular/common';
import { RuleReferencePipe } from '../../pipes/rule-reference.pipe';
import { SchemerService } from '../../services/schemer.service';
import { CodeRuleListComponent } from './code-rule-list.component';
import { MessageDialogComponent, MessageDialogData, MessageType } from '../../dialogs/message-dialog.component';

@Component({
  selector: 'code-rules',
  templateUrl: './code-rules.component.html',
  styleUrls: ['./code-rules.component.scss'],
  standalone: true,
  imports: [MatCard, MatCardSubtitle, MatIconButton, MatTooltip, MatIcon, MatButtonToggleGroup,
    ReactiveFormsModule, FormsModule, MatButtonToggle, MatCardContent, MatTabGroup, MatTab, MatFormField,
    MatInput, CdkTextareaAutosize, MatButton, MatMenuTrigger, MatMenu, MatMenuItem, TranslateModule,
    RuleReferencePipe, JsonPipe, CodeRuleListComponent]
})
export class CodeRulesComponent {
  @Output() codeRulesChanged = new EventEmitter<CodeData>();
  @Input() code: CodeData | undefined;
  @Input() varInfo: VariableInfo | undefined;
  @Input() fragmentMode: boolean | undefined;
  @ViewChild(MatTabGroup) ruleSetElement: MatTabGroup | undefined;

  constructor(
    private messageDialog: MatDialog,
    private translateService: TranslateService,
    public schemerService: SchemerService
  ) {}

  setCodeRulesChanged() {
    this.codeRulesChanged.emit(this.code);
  }

  addRuleSet() {
    if (this.code) {
      const rs = this.code.ruleSets;
      this.code.ruleSets = [];
      rs.push({
        valueArrayPos: -1,
        ruleOperatorAnd: false,
        rules: []
      });
      this.code.ruleSets = rs;
      this.setCodeRulesChanged();
    }
  }

  deleteRuleSet(ruleSetToDeleteIndex: number) {
    if (this.code && ruleSetToDeleteIndex >= 0) {
      this.code.ruleSets.splice(ruleSetToDeleteIndex, 1);
      this.setCodeRulesChanged();
    } else {
      this.messageDialog.open(MessageDialogComponent, {
        width: '400px',
        data: <MessageDialogData>{
          title: this.translateService.instant('rule-set.prompt.delete'),
          content: this.translateService.instant('rule-set.delete-error'),
          type: MessageType.error
        }
      });
    }
  }

  setTab() {
    if (this.ruleSetElement && this.code) this.ruleSetElement.selectedIndex = this.code.ruleSets.length - 1;
  }
}
