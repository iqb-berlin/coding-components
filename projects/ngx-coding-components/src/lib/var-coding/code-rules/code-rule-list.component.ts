import {
  Component, EventEmitter, Input, Output
} from '@angular/core';
import { CodingRule, RuleMethod, RuleSet } from '@iqb/responses';
import { TranslateModule } from '@ngx-translate/core';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatRipple } from '@angular/material/core';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatButton, MatIconButton } from '@angular/material/button';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { FormsModule } from '@angular/forms';
import { MatInput } from '@angular/material/input';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { RuleReferencePipe } from '../../pipes/rule-reference.pipe';
import { SchemerService } from '../../services/schemer.service';
import {
  SelectCodeRuleReferenceDialogComponent,
  SelectCodeRuleReferenceDialogData
} from '../../dialogs/select-code-rule-reference-dialog.component';

@Component({
  selector: 'code-rule-list',
  template: `
    <div class="fx-row-start-stretch fx-gap-10">
      @if (ruleSet) {
        <div class="fx-column-start-stretch fx-flex-fill">
          @for (rule of ruleSet.rules; track rule; let ruleIndex = $index) {
            <div class="fx-row-start-center fx-flex-fill fx-gap-10"
                 (mouseover)="showCodeButtonsOf=rule.method" (mouseout)="showCodeButtonsOf=''">
              <div class="fx-column-start-stretch fx-flex-fill">
                <div class="rule" [matTooltip]="('rule.' + rule.method + '.description') | translate"
                     matTooltipShowDelay="500">
                  {{('rule.' + rule.method) | translate}}
                </div>
                @if (schemerService.ruleMethodParameterCount[rule.method] < 0) {
                  <mat-form-field>
                    @if (rule.parameters) {
                      <textarea matInput [disabled]="schemerService.userRole === 'RO'"
                                [(ngModel)]="rule.parameters[0]"
                                (ngModelChange)="setCodeRulesChanged()"
                                cdkTextareaAutosize
                                cdkAutosizeMinRows="2"
                                cdkAutosizeMaxRows="8"></textarea>
                    }
                  </mat-form-field>
                }
                @if (schemerService.ruleMethodParameterCount[rule.method] > 0) {
                  <mat-form-field>
                    @if (rule.parameters) {
                      <input matInput [disabled]="schemerService.userRole === 'RO'"
                             [(ngModel)]="rule.parameters[0]"
                             (ngModelChange)="setCodeRulesChanged()">
                    }
                  </mat-form-field>
                }
                @if (schemerService.ruleMethodParameterCount[rule.method] > 1) {
                  <mat-form-field>
                    @if (rule.parameters) {
                      <input matInput [disabled]="schemerService.userRole === 'RO'"
                             [(ngModel)]="rule.parameters[1]"
                             (ngModelChange)="setCodeRulesChanged()">
                    }
                  </mat-form-field>
                }
              </div>
              <div class="fx-column-start-center">
                <button mat-icon-button [matTooltip]="'rule.prompt.delete' | translate"
                        [disabled]="schemerService.userRole === 'RO'"
                        (click)="deleteRule(ruleSet, ruleIndex)"
                        [class]="showCodeButtonsOf === rule.method ? 'buttonDisplay' : 'buttonHide'">
                  <mat-icon>delete</mat-icon>
                </button>
                @if (fragmentMode) {
                  @if (schemerService.userRole === 'RW_MAXIMAL') {
                    <div>
                      <button mat-flat-button (click)="editFragmentReference(rule)"
                              [matTooltip]="'rule.reference.title' | translate">
                        F {{ rule.fragment | ruleReference }}
                      </button>
                    </div>
                  } @else {
                    <div>F {{ rule.fragment | ruleReference }}</div>
                  }
                }
              </div>
            </div>
          }
          <div class="fx-row-space-between-center">
            <button mat-icon-button [matMenuTriggerFor]="addRuleMenu" [disabled]="schemerService.userRole === 'RO'"
                    [matTooltip]="'rule.prompt.add' | translate">
              <mat-icon>add</mat-icon>
            </button>

            <mat-menu #addRuleMenu="matMenu">
              @for (newSource of allRules; track newSource) {
                <button mat-menu-item
                        (click)="addRule(ruleSet, newSource)">
                  {{('rule.' + newSource) | translate}}
                </button>
              }
            </mat-menu>
            @if (ruleSet.rules.length === 0) {
              <div class="no-rules">{{'rule.no-rules' | translate}}</div>
            }
            @if (ruleSet.rules.length > 1 && schemerService.userRole === 'RW_MAXIMAL') {
              <mat-button-toggle-group appearance="legacy"
                                       [(ngModel)]="ruleSet.ruleOperatorAnd"
                                       [matTooltip]="'rule.prompt.operator' | translate">
                <mat-button-toggle [value]="false">{{"rule.operator.false" | translate }}</mat-button-toggle>
                <mat-button-toggle [value]="true">{{"rule.operator.true" | translate }}</mat-button-toggle>
              </mat-button-toggle-group>
            }
          </div>
        </div>
        @if (arrayMode || canDeleteRuleSet) {
          <div class="fx-column-start-center" [style.border-left]="'4px solid lightgrey'">
            @if (schemerService.userRole === 'RW_MAXIMAL' && canDeleteRuleSet) {
              <button mat-icon-button [matTooltip]="'rule-set.prompt.delete' | translate"
                      (click)="deleteRuleSetRequested.emit()">
                <mat-icon>delete</mat-icon>
              </button>
            }
            @if (arrayMode && ruleSet.rules.length > 0 && schemerService.userRole === 'RW_MAXIMAL') {
              <button mat-flat-button (click)="editArrayReference(ruleSet)"
                      [matTooltip]="'rule-set.reference.title' | translate">
                A {{ ruleSet.valueArrayPos | ruleReference }}
              </button>
            }
          </div>
        }
      } @else {
        <div class="no-ruleset">{{'rule.no-ruleset' | translate}}</div>
      }
    </div>
  `,
  styles: [
    `
    .no-rules {
      font-style: italic;
    }

    .no-ruleset {
      font-style: italic;
      color: darkorange;
    }
    `
  ],
  standalone: true,
  imports: [MatRipple, MatTooltip, MatIcon, TranslateModule, MatLabel, MatIconButton, CdkTextareaAutosize,
    FormsModule, MatButton, MatFormField, MatInput, RuleReferencePipe, MatButtonToggle, MatButtonToggleGroup,
    MatMenu, MatMenuItem, MatMenuTrigger]
})
export class CodeRuleListComponent {
  @Output() codeRulesChanged = new EventEmitter();
  @Output() deleteRuleSetRequested = new EventEmitter();
  @Input() ruleSet: RuleSet | undefined;
  @Input() fragmentMode = false;
  @Input() arrayMode = false;
  @Input() canDeleteRuleSet = false;
  showCodeButtonsOf = '';
  allRules: RuleMethod[] = ['MATCH', 'MATCH_REGEX', 'NUMERIC_MATCH', 'NUMERIC_RANGE', 'NUMERIC_LESS_THAN',
    'NUMERIC_MORE_THAN', 'NUMERIC_MAX', 'NUMERIC_MIN', 'IS_EMPTY', 'IS_NULL', 'IS_TRUE', 'IS_FALSE'];

  constructor(
    public schemerService: SchemerService,
    public editRuleReferenceDialog: MatDialog
  ) { }

  setCodeRulesChanged() {
    this.codeRulesChanged.emit();
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

  editArrayReference(ruleSet: RuleSet) {
    if (ruleSet) {
      const dialogRef = this.editRuleReferenceDialog.open(
        SelectCodeRuleReferenceDialogComponent, {
          width: '400px',
          data: <SelectCodeRuleReferenceDialogData>{
            isFragmentMode: false,
            value: ruleSet.valueArrayPos
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
}
