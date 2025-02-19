import { Component, Inject } from '@angular/core';
import {
  CdkDragDrop, moveItemInArray, transferArrayItem, CdkDropList, CdkDrag
} from '@angular/cdk/drag-drop';
import {
  MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose
} from '@angular/material/dialog';
import {
  CodeData,
  CodingRule,
  ProcessingParameterType,
  RuleSet,
  ToTextFactory, VariableCodingData,
  VariableInfo
} from '@iqb/responses';
import { CodeModelType } from '@iqb/responses/coding-interfaces';
import { CodingFactory } from '@iqb/responses/coding-factory';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { MatButton } from '@angular/material/button';
import { MatRadioGroup, MatRadioButton } from '@angular/material/radio';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { MatInput } from '@angular/material/input';
import { MatOption } from '@angular/material/core';
import { MatSelect } from '@angular/material/select';
import { MatIcon } from '@angular/material/icon';
import { MatChip, MatChipRemove } from '@angular/material/chips';
import { MatSelectionList, MatListOption } from '@angular/material/list';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatLabel, MatFormField } from '@angular/material/form-field';
import { SchemerService } from '../../services/schemer.service';

export interface GeneratedCodingData {
  id: string,
  alias: string,
  processing: ProcessingParameterType[],
  fragmenting: string,
  codeModel: CodeModelType,
  codes: CodeData[]
}

interface OptionData {
  value: string,
  oldIndex: number,
  label?: string
}

@Component({
  templateUrl: 'generate-coding-dialog.component.html',
  styles: [
    `.chip-list-column{
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
      .coding-action {
      background: #cccccc;
      color: black;
      padding: 4px 10px;
    }
    .dragOptionBox {
      border: darkgray 1px solid;
    }`
  ],
  standalone: true,
  imports: [MatDialogTitle, MatDialogContent, MatLabel, MatCheckbox, ReactiveFormsModule, FormsModule,
    MatSelectionList, MatListOption, CdkDropList, MatChip, CdkDrag, MatIcon, MatChipRemove,
    MatFormField, MatSelect, MatOption, MatInput, CdkTextareaAutosize, MatRadioGroup, MatRadioButton,
    MatDialogActions, MatButton, MatDialogClose, TranslateModule]
})

export class GenerateCodingDialogComponent {
  generationModel: 'none' | 'single-choice-some' | 'single-choice-many' | 'multi-choice' |
  'integer' | 'simple-input';

  protected readonly ToTextFactory = ToTextFactory;
  selectedOption: string = '';
  selectedOptions: string[] = [];
  positionLabels: string[] = [];
  multiChoiceOrderMatters = false;
  singleChoiceLongVersion = false;
  _options: OptionData[] = [];
  options: OptionData[] = [];
  selectedDragOptions: OptionData[] = [];
  textAsNumeric = false;
  numericMoreThen = '';
  numericLessThen = '';
  numericMax = '';
  numericMin = '';
  numericMatch = '';
  numericRuleText = '';
  numericRuleError = false;
  elseMethod: 'none' | 'auto' | 'instruction' = 'none';

  constructor(
    @Inject(MAT_DIALOG_DATA) public varInfo: VariableInfo,
    public translateService: TranslateService,
    public schemerService: SchemerService,
    public dialogRef: MatDialogRef<GenerateCodingDialogComponent>
  ) {
    this.generationModel = 'none';
    if (varInfo) {
      if (varInfo.valuesComplete && varInfo.values && varInfo.values.length > 0) {
        this.elseMethod = 'auto';
        if (varInfo.multiple) {
          this.generationModel = 'multi-choice';
          this.positionLabels = varInfo.valuePositionLabels;
        } else {
          this.generationModel = varInfo.values.length > 20 ? 'single-choice-many' : 'single-choice-some';
        }
        this._options = varInfo.values.map((v, i) => <OptionData>{
          value: (typeof v.value === 'string') ? v.value : v.value.toString(),
          oldIndex: i,
          label: v.label
        });
        this.resetOptions();
      } else if (!varInfo.multiple) {
        this.elseMethod = 'auto';
        if (varInfo.type === 'integer') {
          this.generationModel = 'integer';
        } else if (varInfo.type === 'string') {
          this.generationModel = 'simple-input';
        }
      }
    }
    this.updateNumericRuleText();
  }

  resetOptions() {
    const maxLength = 30;
    this.options = this._options.map(o => <OptionData>{
      value: o.value.length > maxLength ? `${o.value.slice(0, maxLength - 1)}…` : o.value,
      oldIndex: o.oldIndex,
      label: o.label && o.label.length > maxLength ? `${o.label.slice(0, maxLength - 1)}…` : o.label
    });
    this.selectedOptions = [];
    this.selectedDragOptions = [];
  }

  updateNumericRuleText() {
    this.numericRuleError = false;
    const matchValue = CodingFactory.getValueAsNumber(this.numericMatch);
    if (matchValue) {
      this.numericRuleText = `${this.translateService.instant('rule.NUMERIC_MATCH')}: ${matchValue}`;
    } else {
      const moreThenValue = CodingFactory.getValueAsNumber(this.numericMoreThen);
      const maxValue = CodingFactory.getValueAsNumber(this.numericMax);
      const minValue = CodingFactory.getValueAsNumber(this.numericMin);
      const lessThenValue = CodingFactory.getValueAsNumber(this.numericLessThen);
      this.numericRuleText = '';
      if (moreThenValue && minValue) {
        this.numericRuleText = this.translateService.instant('coding.generate.only-one-lower-limit');
        this.numericRuleError = true;
      }
      if (lessThenValue && maxValue) {
        this.numericRuleText += ` ${this.translateService.instant('coding.generate.only-one-upper-limit')}`;
        this.numericRuleError = true;
      }
      if (!this.numericRuleText) {
        if (moreThenValue && maxValue && moreThenValue < maxValue) {
          this.numericRuleText =
            `${this.translateService.instant('rule.NUMERIC_RANGE')} ${moreThenValue} / ${maxValue}`;
        } else {
          const ruleTexts: string[] = [];
          if (moreThenValue) {
            ruleTexts.push(`${this.translateService.instant('rule.NUMERIC_MORE_THAN')} ${moreThenValue}`);
          }
          if (minValue) ruleTexts.push(`${this.translateService.instant('rule.NUMERIC_MIN')} ${minValue}`);
          if (lessThenValue) {
            ruleTexts.push(`${this.translateService.instant('rule.NUMERIC_LESS_THAN')} ${lessThenValue}`);
          }
          if (maxValue) ruleTexts.push(`${this.translateService.instant('rule.NUMERIC_MAX')} ${maxValue}`);
          this.numericRuleText = ruleTexts.length > 0 ?
            ruleTexts.join('; ') : this.translateService.instant('coding.generate.empty-value');
          this.numericRuleError = ruleTexts.length === 0;
        }
      }
    }
  }

  // eslint-disable-next-line class-methods-use-this
  drop(event: CdkDragDrop<OptionData[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }
  }

  returnOption(optionToReturn: OptionData) {
    const removeFromIndex = this.selectedDragOptions.findIndex(o => o.value === optionToReturn.value);
    if (removeFromIndex >= 0) {
      this.selectedDragOptions.splice(removeFromIndex, 1);
      if (this.options.length > 0) {
        const itemToInsertBeforeIndex = this.options.findIndex(o => o.oldIndex > optionToReturn.oldIndex);
        if (itemToInsertBeforeIndex < 0) {
          this.options.push(optionToReturn);
        } else {
          this.options.splice(itemToInsertBeforeIndex, 0, optionToReturn);
        }
      } else {
        this.options.push(optionToReturn);
      }
    }
  }

  generateButtonClick() {
    if (this.generationModel === 'none') {
      this.dialogRef.close(null);
    } else {
      const newVardata: VariableCodingData = {
        id: this.varInfo.id,
        alias: this.varInfo.alias || this.varInfo.id,
        label: '',
        sourceType: 'BASE',
        sourceParameters: {
          solverExpression: '',
          processing: []
        },
        deriveSources: [],
        processing: [],
        fragmenting: '',
        manualInstruction: '',
        codeModel: 'NONE',
        codes: []
      };
      if (['auto', 'instruction'].includes(this.elseMethod)) {
        const newResidualCode = this.schemerService.addCode(
          newVardata.codes, this.elseMethod === 'instruction' ? 'RESIDUAL' : 'RESIDUAL_AUTO');
        if (typeof newResidualCode !== 'string' && this.singleChoiceLongVersion) {
          // todo: seems to fail - why?
          newResidualCode.id = 'INVALID';
        }
      }
      if (this.generationModel === 'integer' || (this.textAsNumeric && this.generationModel === 'simple-input')) {
        const numericRules: CodingRule[] = [];
        const matchValue = CodingFactory.getValueAsNumber(this.numericMatch);
        if (matchValue !== null) {
          numericRules.push({
            method: 'NUMERIC_MATCH',
            parameters: [matchValue.toString(10)]
          });
        } else {
          const moreThenValue = CodingFactory.getValueAsNumber(this.numericMoreThen);
          const maxValue = CodingFactory.getValueAsNumber(this.numericMax);
          const minValue = CodingFactory.getValueAsNumber(this.numericMin);
          const lessThenValue = CodingFactory.getValueAsNumber(this.numericLessThen);
          if (!(moreThenValue && minValue) && !(lessThenValue && maxValue)) {
            if (moreThenValue && maxValue && moreThenValue < maxValue) {
              numericRules.push({
                method: 'NUMERIC_RANGE',
                parameters: [moreThenValue.toString(10), maxValue.toString(10)]
              });
            } else {
              if (moreThenValue) {
                numericRules.push({
                  method: 'NUMERIC_MORE_THAN',
                  parameters: [moreThenValue.toString(10)]
                });
              }
              if (minValue) {
                numericRules.push({
                  method: 'NUMERIC_MIN',
                  parameters: [minValue.toString(10)]
                });
              }
              if (lessThenValue) {
                numericRules.push({
                  method: 'NUMERIC_LESS_THAN',
                  parameters: [lessThenValue.toString(10)]
                });
              }
              if (maxValue) {
                numericRules.push({
                  method: 'NUMERIC_MAX',
                  parameters: [maxValue.toString(10)]
                });
              }
            }
          }
        }
        const newCode = this.schemerService.addCode(newVardata.codes, 'FULL_CREDIT');
        if (typeof newCode !== 'string') {
          newCode.ruleSetOperatorAnd = true;
          newCode.ruleSets = [<RuleSet>{
            ruleOperatorAnd: false,
            rules: numericRules
          }];
          this.dialogRef.close(newVardata);
        } else {
          this.dialogRef.close(null);
        }
      } else if (this.generationModel === 'simple-input') {
        const newCode = this.schemerService.addCode(newVardata.codes, 'FULL_CREDIT');
        if (typeof newCode !== 'string') {
          newCode.ruleSetOperatorAnd = true;
          newCode.ruleSets = [<RuleSet>{
            ruleOperatorAnd: false,
            rules: [
              {
                method: 'MATCH',
                parameters: [this.selectedOption || '']
              }
            ]
          }];
          this.dialogRef.close(newVardata);
        }
      } else if (this.generationModel === 'single-choice-some' && this.singleChoiceLongVersion) {
        // eslint-disable-next-line eqeqeq
        this.options.filter(o => this.selectedOptions[0] && o.value == this.selectedOptions[0])
          .forEach(o => {
            const newCode = this.schemerService.addCode(newVardata.codes, 'FULL_CREDIT');
            if (typeof newCode !== 'string') {
              newCode.ruleSetOperatorAnd = true;
              newCode.ruleSets = [<RuleSet>{
                ruleOperatorAnd: false,
                rules: [<CodingRule>{
                  method: 'MATCH',
                  parameters: [o.value || '']
                }]
              }];
            }
          });
        // eslint-disable-next-line eqeqeq
        this.options.filter(o => !(this.selectedOptions[0] && o.value == this.selectedOptions[0]))
          .forEach(o => {
            const newCode = this.schemerService.addCode(newVardata.codes, 'NO_CREDIT');
            if (typeof newCode !== 'string') {
              newCode.ruleSetOperatorAnd = true;
              newCode.ruleSets = [<RuleSet>{
                ruleOperatorAnd: false,
                rules: [<CodingRule>{
                  method: 'MATCH',
                  parameters: [o.value || '']
                }]
              }];
            }
          });
        // newVardata.codeModel = 'RULES_ONLY';
        this.schemerService.sortCodes(newVardata.codes, true);
        this.dialogRef.close(newVardata);
      } else if (this.generationModel === 'multi-choice' && this.multiChoiceOrderMatters) {
        const fullCreditRuleSets: RuleSet[] = [];
        this.selectedDragOptions.forEach((o, i) => {
          fullCreditRuleSets.push({
            ruleOperatorAnd: false,
            valueArrayPos: i,
            rules: [
              {
                method: 'MATCH',
                parameters: [o.value || '']
              }
            ]
          });
        });
        const newCode = this.schemerService.addCode(newVardata.codes, 'FULL_CREDIT');
        if (typeof newCode !== 'string') {
          newCode.ruleSetOperatorAnd = true;
          newCode.ruleSets = fullCreditRuleSets;
          this.dialogRef.close(newVardata);
        } else {
          this.dialogRef.close(null);
        }
      } else if (['multi-choice', 'single-choice-many', 'single-choice-some'].includes(this.generationModel)) {
        const fullCreditRules: CodingRule[] = [];
        if (this.generationModel === 'single-choice-many') {
          fullCreditRules.push({
            method: 'MATCH',
            parameters: [this.selectedOption || '']
          });
        } else if (this.selectedOptions.length > 0) {
          if (this.varInfo.type === 'boolean') {
            this.selectedOptions.forEach(s => {
              fullCreditRules.push({
                method: (s === 'true') ? 'IS_TRUE' : 'IS_FALSE',
                parameters: []
              });
            });
          } else {
            this.selectedOptions.forEach(s => {
              fullCreditRules.push({
                method: 'MATCH',
                parameters: [s]
              });
            });
          }
        } else if (this.varInfo.type === 'boolean') {
          fullCreditRules.push({
            method: 'IS_TRUE',
            parameters: []
          });
        } else {
          fullCreditRules.push({
            method: 'MATCH',
            parameters: ['']
          });
        }
        const newCode = this.schemerService.addCode(newVardata.codes, 'FULL_CREDIT');
        if (typeof newCode !== 'string') {
          // newVardata.codeModel = 'RULES_ONLY';
          newCode.ruleSetOperatorAnd = true;
          newCode.ruleSets = [<RuleSet>{
            ruleOperatorAnd: false,
            rules: fullCreditRules
          }];
          this.dialogRef.close(newVardata);
        } else {
          this.dialogRef.close(null);
        }
      } else {
        this.dialogRef.close(null);
      }
    }
  }
}
