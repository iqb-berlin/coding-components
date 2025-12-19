import { Component, Inject } from '@angular/core';
import {
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
  CdkDropList,
  CdkDrag
} from '@angular/cdk/drag-drop';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose
} from '@angular/material/dialog';
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
import {
  CodeData,
  CodeModelType,
  CodingRule,
  ProcessingParameterType,
  RuleSet,
  VariableCodingData
} from '@iqbspecs/coding-scheme/coding-scheme.interface';
import { ToTextFactory } from '@iqb/responses';
import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';
import { SchemerService } from '../../services/schemer.service';

export interface GeneratedCodingData {
  id: string;
  alias: string;
  processing: ProcessingParameterType[];
  fragmenting: string;
  codeModel: CodeModelType;
  codes: CodeData[];
}

interface OptionData {
  value: string;
  oldIndex: number;
  label?: string;
}

@Component({
  templateUrl: 'generate-coding-dialog.component.html',
  styles: [
    `
      .chip-list-column {
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
      }
    `
  ],
  standalone: true,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatLabel,
    MatCheckbox,
    ReactiveFormsModule,
    FormsModule,
    MatSelectionList,
    MatListOption,
    CdkDropList,
    MatChip,
    CdkDrag,
    MatIcon,
    MatChipRemove,
    MatFormField,
    MatSelect,
    MatOption,
    MatInput,
    CdkTextareaAutosize,
    MatRadioGroup,
    MatRadioButton,
    MatDialogActions,
    MatButton,
    MatDialogClose,
    TranslateModule
  ]
})
export class GenerateCodingDialogComponent {
  generationModel:
  | 'none'
  | 'single-choice-some'
  | 'single-choice-many'
  | 'multi-choice'
  | 'integer'
  | 'simple-input'
  | 'boolean-multi';

  protected readonly ToTextFactory = ToTextFactory;
  selectedOption: string = '';
  selectedOptions: string[] = [];
  positionLabels: string[] = [];
  selectedArrayPos = -1;
  booleanMultiSelections: boolean[] = [];
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
    if (!varInfo) {
      return;
    }

    if (varInfo.values?.length > 0) {
      this.elseMethod = varInfo.valuesComplete ? 'auto' : 'instruction';

      if (varInfo.multiple) {
        this.generationModel = 'multi-choice';
        this.positionLabels = varInfo.valuePositionLabels;
      } else {
        this.generationModel =
          varInfo.values.length > 20 ?
            'single-choice-many' :
            'single-choice-some';
      }

      this._options = varInfo.values.map((v, i) => ({
        value: typeof v.value === 'string' ? v.value : v.value.toString(),
        oldIndex: i,
        label: v.label
      }));
      this.resetOptions();
      return;
    }

    if (varInfo.multiple && varInfo.type === 'boolean') {
      this.elseMethod = 'auto';
      this.generationModel = 'boolean-multi';
      this.positionLabels = varInfo.valuePositionLabels;
      this.booleanMultiSelections = (this.positionLabels || []).map(
        () => false
      );
      return;
    }

    if (varInfo.multiple && varInfo.type === 'string') {
      this.elseMethod = 'instruction';
      this.generationModel = 'simple-input';
      this.positionLabels = varInfo.valuePositionLabels;
      this.selectedArrayPos = this.positionLabels.length > 0 ? 0 : -1;
      return;
    }

    if (!varInfo.multiple) {
      this.elseMethod = 'auto';
      switch (varInfo.type) {
        case 'integer':
          this.generationModel = 'integer';
          break;
        case 'string':
          this.generationModel = 'simple-input';
          break;
        default:
          break;
      }
    }

    this.updateNumericRuleText();
  }

  resetOptions(): void {
    const maxLength = 30;

    const truncate = (text: string | undefined): string | undefined => {
      if (!text) return text;
      return text.length > maxLength ?
        `${text.slice(0, maxLength - 1)}…` :
        text;
    };

    this.options = this._options.map(
      o => ({
        value: truncate(o.value),
        oldIndex: o.oldIndex,
        label: truncate(o.label)
      } as OptionData)
    );

    this.selectedOptions = [];
    this.selectedDragOptions = [];
  }

  updateNumericRuleText() {
    this.numericRuleError = false;
    const matchValue = CodingFactory.getValueAsNumber(this.numericMatch);
    if (matchValue) {
      this.numericRuleText = `${this.translateService.instant(
        'rule.NUMERIC_MATCH'
      )}: ${matchValue}`;
    } else {
      const moreThenValue = CodingFactory.getValueAsNumber(
        this.numericMoreThen
      );
      const maxValue = CodingFactory.getValueAsNumber(this.numericMax);
      const minValue = CodingFactory.getValueAsNumber(this.numericMin);
      const lessThenValue = CodingFactory.getValueAsNumber(
        this.numericLessThen
      );
      this.numericRuleText = '';
      if (moreThenValue && minValue) {
        this.numericRuleText = this.translateService.instant(
          'coding.generate.only-one-lower-limit'
        );
        this.numericRuleError = true;
      }
      if (lessThenValue && maxValue) {
        this.numericRuleText += ` ${this.translateService.instant(
          'coding.generate.only-one-upper-limit'
        )}`;
        this.numericRuleError = true;
      }
      if (!this.numericRuleText) {
        const ruleTexts: string[] = [];
        const hasFullRange =
          moreThenValue && maxValue && moreThenValue < maxValue;
        if (hasFullRange) {
          this.numericRuleText = `${this.translateService.instant(
            'rule.NUMERIC_FULL_RANGE'
          )} ${moreThenValue} / ${maxValue}`;
        } else {
          if (moreThenValue) {
            ruleTexts.push(
              `${this.translateService.instant(
                'rule.NUMERIC_MORE_THAN'
              )} ${moreThenValue}`
            );
          }
          if (minValue) {
            ruleTexts.push(
              `${this.translateService.instant('rule.NUMERIC_MIN')} ${minValue}`
            );
          }
          if (lessThenValue) {
            ruleTexts.push(
              `${this.translateService.instant(
                'rule.NUMERIC_LESS_THAN'
              )} ${lessThenValue}`
            );
          }
          if (maxValue) {
            ruleTexts.push(
              `${this.translateService.instant('rule.NUMERIC_MAX')} ${maxValue}`
            );
          }

          this.numericRuleText =
            ruleTexts.length > 0 ?
              ruleTexts.join('; ') :
              this.translateService.instant('coding.generate.empty-value');
          this.numericRuleError = ruleTexts.length === 0;
        }
      }
    }
  }

  // eslint-disable-next-line class-methods-use-this
  drop(event: CdkDragDrop<OptionData[]>): void {
    if (!event) {
      console.error('Invalid drag and drop event');
      return;
    }

    const {
      previousContainer, container, previousIndex, currentIndex
    } = event;

    if (previousContainer === container) {
      moveItemInArray(container.data, previousIndex, currentIndex);
    } else {
      transferArrayItem(
        previousContainer.data,
        container.data,
        previousIndex,
        currentIndex
      );
    }
  }

  returnOption(optionToReturn: OptionData): void {
    const removeIndex = this.selectedDragOptions.findIndex(
      o => o.value === optionToReturn.value
    );
    if (removeIndex === -1) {
      return;
    }
    this.selectedDragOptions.splice(removeIndex, 1);
    const insertIndex = this.options.findIndex(
      o => o.oldIndex > optionToReturn.oldIndex
    );

    if (insertIndex === -1) {
      this.options.push(optionToReturn);
    } else {
      this.options.splice(insertIndex, 0, optionToReturn);
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
        codeModel: 'MANUAL_AND_RULES',
        codes: []
      };
      if (['auto', 'instruction'].includes(this.elseMethod)) {
        const newResidualCode = this.schemerService.addCode(
          newVardata.codes || [],
          this.elseMethod === 'instruction' ? 'RESIDUAL' : 'RESIDUAL_AUTO'
        );
        if (
          typeof newResidualCode !== 'string' &&
          this.singleChoiceLongVersion
        ) {
          // todo: seems to fail - why?
          newResidualCode.id = 'INVALID';
        }
      }
      if (
        this.generationModel === 'integer' ||
        (this.textAsNumeric && this.generationModel === 'simple-input')
      ) {
        const numericRules: CodingRule[] = [];
        const matchValue = CodingFactory.getValueAsNumber(this.numericMatch);
        if (matchValue !== null) {
          numericRules.push({
            method: 'NUMERIC_MATCH',
            parameters: [matchValue.toString(10)]
          });
        } else {
          const moreThanValue = CodingFactory.getValueAsNumber(
            this.numericMoreThen
          );
          const maxValue = CodingFactory.getValueAsNumber(this.numericMax);
          const minValue = CodingFactory.getValueAsNumber(this.numericMin);
          const lessThanValue = CodingFactory.getValueAsNumber(
            this.numericLessThen
          );

          const hasRangeOverlap =
            moreThanValue && maxValue && moreThanValue < maxValue;

          if (hasRangeOverlap) {
            numericRules.push({
              method: 'NUMERIC_FULL_RANGE',
              parameters: [moreThanValue.toString(10), maxValue.toString(10)]
            });
          } else {
            if (moreThanValue) {
              numericRules.push({
                method: 'NUMERIC_MORE_THAN',
                parameters: [moreThanValue.toString(10)]
              });
            }

            if (minValue) {
              numericRules.push({
                method: 'NUMERIC_MIN',
                parameters: [minValue.toString(10)]
              });
            }

            if (lessThanValue) {
              numericRules.push({
                method: 'NUMERIC_LESS_THAN',
                parameters: [lessThanValue.toString(10)]
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
        const newCode = this.schemerService.addCode(
          newVardata.codes || [],
          'FULL_CREDIT'
        );
        if (typeof newCode !== 'string') {
          newCode.ruleSetOperatorAnd = true;
          newCode.ruleSets = [
            <RuleSet>{
              ruleOperatorAnd: false,
              valueArrayPos: this.varInfo.multiple ? this.selectedArrayPos : -1,
              rules: numericRules
            }
          ];
          this.dialogRef.close(newVardata);
        } else {
          this.dialogRef.close(null);
        }
      } else if (this.generationModel === 'simple-input') {
        const newCode = this.schemerService.addCode(
          newVardata.codes || [],
          'FULL_CREDIT'
        );
        if (typeof newCode !== 'string') {
          newCode.ruleSetOperatorAnd = true;
          newCode.ruleSets = [
            <RuleSet>{
              ruleOperatorAnd: false,
              valueArrayPos: this.varInfo.multiple ? this.selectedArrayPos : -1,
              rules: [
                {
                  method: 'MATCH',
                  parameters: [this.selectedOption || '']
                }
              ]
            }
          ];
          this.dialogRef.close(newVardata);
        }
      } else if (
        this.generationModel === 'single-choice-some' &&
        this.singleChoiceLongVersion
      ) {
        // eslint-disable-next-line eqeqeq
        this.options
          .filter(
            o => this.selectedOptions[0] && o.value == this.selectedOptions[0]
          )
          .forEach(o => {
            const newCode = this.schemerService.addCode(
              newVardata.codes || [],
              'FULL_CREDIT'
            );
            if (typeof newCode !== 'string') {
              newCode.ruleSetOperatorAnd = true;
              newCode.ruleSets = [
                <RuleSet>{
                  ruleOperatorAnd: false,
                  rules: [
                    <CodingRule>{
                      method: 'MATCH',
                      parameters: [o.value || '']
                    }
                  ]
                }
              ];
            }
          });
        // eslint-disable-next-line eqeqeq
        this.options
          .filter(
            o => !(this.selectedOptions[0] && o.value == this.selectedOptions[0])
          )
          .forEach(o => {
            const newCode = this.schemerService.addCode(
              newVardata.codes || [],
              'NO_CREDIT'
            );
            if (typeof newCode !== 'string') {
              newCode.ruleSetOperatorAnd = true;
              newCode.ruleSets = [
                <RuleSet>{
                  ruleOperatorAnd: false,
                  rules: [
                    <CodingRule>{
                      method: 'MATCH',
                      parameters: [o.value || '']
                    }
                  ]
                }
              ];
            }
          });
        // newVardata.codeModel = 'RULES_ONLY';
        if (newVardata.codes) {
          this.schemerService.sortCodes(newVardata.codes, true);
        }
        this.dialogRef.close(newVardata);
      } else if (
        this.generationModel === 'multi-choice' &&
        this.multiChoiceOrderMatters
      ) {
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
        const newCode = this.schemerService.addCode(
          newVardata.codes || [],
          'FULL_CREDIT'
        );
        if (typeof newCode !== 'string') {
          newCode.ruleSetOperatorAnd = true;
          newCode.ruleSets = fullCreditRuleSets;
          this.dialogRef.close(newVardata);
        } else {
          this.dialogRef.close(null);
        }
      } else if (this.generationModel === 'boolean-multi') {
        const fullCreditRuleSets: RuleSet[] = [];
        (this.booleanMultiSelections || []).forEach((isSelected, i) => {
          fullCreditRuleSets.push({
            ruleOperatorAnd: false,
            valueArrayPos: i,
            rules: [
              {
                method: isSelected ? 'IS_TRUE' : 'IS_FALSE',
                parameters: []
              }
            ]
          });
        });

        const newCode = this.schemerService.addCode(
          newVardata.codes || [],
          'FULL_CREDIT'
        );
        if (typeof newCode !== 'string') {
          newCode.ruleSetOperatorAnd = true;
          newCode.ruleSets = fullCreditRuleSets;
          this.dialogRef.close(newVardata);
        } else {
          this.dialogRef.close(null);
        }
      } else if (
        ['multi-choice', 'single-choice-many', 'single-choice-some'].includes(
          this.generationModel
        )
      ) {
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
                method: s === 'true' ? 'IS_TRUE' : 'IS_FALSE',
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
        const newCode = this.schemerService.addCode(
          newVardata.codes || [],
          'FULL_CREDIT'
        );
        if (typeof newCode !== 'string') {
          newCode.ruleSetOperatorAnd = true;
          newCode.ruleSets = [
            <RuleSet>{
              ruleOperatorAnd: false,
              rules: fullCreditRules
            }
          ];
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
