import {
  OnChanges, OnDestroy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTabGroup } from '@angular/material/tabs';
import { TranslateModule } from '@ngx-translate/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import {
  MatButtonToggleGroup,
  MatButtonToggle
} from '@angular/material/button-toggle';
import { MatIcon } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import {
  CodeData,
  RuleSet
} from '@iqbspecs/coding-scheme/coding-scheme.interface';
import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';
import { DialogContext } from '../../services/dialog-context';
import {
  SelectCodeRuleReferenceDialogComponent,
  SelectCodeRuleReferenceDialogData
} from '../../dialogs/select-code-rule-reference-dialog.component';
import { RuleReferencePipe } from '../../pipes/rule-reference.pipe';
import { SchemerService, UserRoleType } from '../../services/schemer.service';
import { CodeRuleListComponent } from './code-rule-list.component';

@Component({
  selector: 'code-rules',
  templateUrl: './code-rules.component.html',
  styleUrls: ['./code-rules.component.scss'],
  standalone: true,
  imports: [
    MatCard,
    MatIconButton,
    MatTooltipModule,
    MatIcon,
    MatButtonToggleGroup,
    ReactiveFormsModule,
    FormsModule,
    MatButtonToggle,
    MatCardContent,
    MatButton,
    TranslateModule,
    RuleReferencePipe,
    CodeRuleListComponent
  ]
})
export class CodeRulesComponent implements OnChanges, OnDestroy {
  private readonly dialogContext = new DialogContext(() => [
    this.schemerService.codingScheme, this.schemerService.userRole, this.code
  ]);

  ngOnChanges(): void {
    this.dialogContext.invalidate();
  }

  ngOnDestroy(): void {
    this.dialogContext.destroy();
  }

  @Output() codeRulesChanged = new EventEmitter<CodeData>();
  @Input() code: CodeData | undefined;
  @Input() userRole: UserRoleType = 'RW_MAXIMAL';
  @Input() varInfo: VariableInfo | undefined;
  @Input() fragmentMode: boolean | undefined;
  @ViewChild(MatTabGroup) ruleSetElement: MatTabGroup | undefined;

  constructor(
    public schemerService: SchemerService,
    public editRuleReferenceDialog: MatDialog,
    private changeDetector: ChangeDetectorRef
  ) {}

  setCodeRulesChanged() {
    this.codeRulesChanged.emit(this.code);
  }

  addRuleSet() {
    if (!this.code) {
      return;
    }

    const newRuleSet: RuleSet = {
      ruleOperatorAnd: false,
      rules: [
        {
          method: 'MATCH',
          parameters: ['']
        }
      ]
    };

    this.code.ruleSets = [...(this.code.ruleSets || []), newRuleSet];

    if (this.ruleSetElement) {
      this.ruleSetElement.selectedIndex = this.code.ruleSets.length - 1;
    }

    this.setCodeRulesChanged();
  }

  editArrayReference(ruleSet: RuleSet) {
    if (ruleSet) {
      const dialogRef = this.editRuleReferenceDialog.open(
        SelectCodeRuleReferenceDialogComponent,
        {
          width: '400px',
          data: <SelectCodeRuleReferenceDialogData>{
            isFragmentMode: false,
            value: ruleSet.valueArrayPos
          },
          autoFocus: false
        }
      );
      this.dialogContext.afterClosed(dialogRef).subscribe(dialogResult => {
        this.changeDetector.markForCheck();
        if (dialogResult !== false && dialogResult !== undefined && dialogResult !== null) {
          ruleSet.valueArrayPos = dialogResult;
          this.setCodeRulesChanged();
        }
      });
    }
  }

  deleteRuleSet(ruleSetToDeleteIndex: number) {
    if (!this.code || !this.code.ruleSets) {
      return;
    }

    this.code.ruleSets.splice(ruleSetToDeleteIndex, 1);
    this.setCodeRulesChanged();
  }
}
