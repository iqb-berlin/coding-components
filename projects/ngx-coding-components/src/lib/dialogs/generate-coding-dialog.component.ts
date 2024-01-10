import { Component, Inject } from '@angular/core';
import {
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem
} from '@angular/cdk/drag-drop';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {
  CodeData,
  CodingRule,
  ProcessingParameterType,
  RuleSet,
  ToTextFactory,
  VariableInfo
} from "@iqb/responses";
import {CodeModelType} from "@iqb/responses/coding-interfaces";
import {CodingFactory} from "@iqb/responses/coding-factory";
import {TranslateService} from "@ngx-translate/core";

export interface GeneratedCodingData {
  id: string,
  processing: ProcessingParameterType[],
  fragmenting: string,
  codeModel: CodeModelType,
  codeModelParameters: string[],
  codes: CodeData[]
}

interface optionData {
  value: string,
  oldIndex: number,
  label?: string
}

@Component({
  templateUrl: 'generate-coding-dialog.component.html',
  styles: [
    `.coding-action {
      background: #cccccc;
      color: black;
      padding: 4px 10px;
    }`,
    `.dragOptionBox {
      border: darkgray 1px solid;
    }`
  ]
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
  _options: optionData[] = [];
  options: optionData[] = [];
  selectedDragOptions: optionData[] = [];
  numericMoreThen = '';
  numericMax = '';
  numericRuleText = '';

  constructor(
      @Inject(MAT_DIALOG_DATA) public varInfo: VariableInfo,
      public translateService: TranslateService,
      public dialogRef: MatDialogRef<GenerateCodingDialogComponent>,
  ) {
    this.generationModel = 'none';
    if (varInfo) {
      if (varInfo.valuesComplete && varInfo.values && varInfo.values.length > 0) {
        if (varInfo.multiple) {
          this.generationModel = 'multi-choice';
          this.positionLabels = varInfo.valuePositionLabels;
        } else {
          this.generationModel = varInfo.values.length > 20 ? 'single-choice-many' : 'single-choice-some';
        }
        this._options = varInfo.values.map((v, i) => <optionData>{
          value: (typeof v.value === 'string') ? v.value : v.value.toString(),
          oldIndex: i,
          label: v.label
        });
        this.resetOptions();
      } else if (!varInfo.multiple) {
        if (varInfo.type === 'integer') {
          this.generationModel = 'integer'
        } else if (varInfo.type === 'string') {
          this.generationModel = 'simple-input'
        }
      }
    }
  }

  resetOptions() {
    const maxLength = 30;
    this.options = this._options.map(o => <optionData>{
      value: o.value.length > maxLength ? o.value.slice(0, maxLength-1) + '…' : o.value,
      oldIndex: o.oldIndex,
      label: o.label && o.label.length > maxLength ? o.label.slice(0, maxLength-1) + '…' : o.label
    });
    this.selectedOptions = [];
    this.selectedDragOptions = [];
  }

  updateNumericRuleText() {
    const moreThenValue = CodingFactory.getValueAsNumber(this.numericMoreThen);
    const maxValue = CodingFactory.getValueAsNumber(this.numericMax);
    if (moreThenValue && !maxValue) {
      this.numericRuleText = this.translateService.instant('rule.NUMERIC_MORE_THEN')
    } else if (!moreThenValue && maxValue) {
      this.numericRuleText = this.translateService.instant('rule.NUMERIC_MAX')
    } else if (moreThenValue && maxValue && moreThenValue < maxValue) {
      this.numericRuleText = this.translateService.instant('rule.NUMERIC_RANGE')
    } else {
      this.numericRuleText = this.translateService.instant('rule.no-rules')
    }
  }

  drop(event: CdkDragDrop<optionData[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    }
  }

  returnOption(optionToReturn: optionData) {
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
    } else if (this.generationModel === 'integer') {
      const moreThenValue = CodingFactory.getValueAsNumber(this.numericMoreThen);
      const maxValue = CodingFactory.getValueAsNumber(this.numericMax);
      const numericRules: CodingRule[] = [];
      if (moreThenValue && !maxValue) {
        numericRules.push({
          method: "NUMERIC_MORE_THEN",
          parameters: [moreThenValue.toString(10)]
        });
      } else if (!moreThenValue && maxValue) {
        numericRules.push({
          method: "NUMERIC_MAX",
          parameters: [maxValue.toString(10)]
        });
      } else if (moreThenValue && maxValue && moreThenValue < maxValue) {
        numericRules.push({
          method: "NUMERIC_RANGE",
          parameters: [moreThenValue.toString(10), maxValue.toString(10)]
        });
      }

      this.dialogRef.close(<GeneratedCodingData>{
        id: this.varInfo.id,
        processing: [],
        fragmenting: '',
        manualInstruction: '',
        codeModel: 'NUMBER',
        codeModelParameters: [],
        codes: [
          {
            id: 1,
            label: 'Richtig',
            score: 1,
            ruleSetOperatorAnd: false,
            ruleSets: [<RuleSet>{
              ruleOperatorAnd: true,
              rules: numericRules
            }],
            manualInstruction: ''
          },
          {
            id: 2,
            label: 'Falsch',
            score: 0,
            ruleSetOperatorAnd: false,
            ruleSets: [<RuleSet>{
              ruleOperatorAnd: false,
              rules: [{
                method: "ELSE"
              }]
            }],
            manualInstruction: ''
          }
        ]
      });
    } else if (this.generationModel === 'simple-input') {
      this.dialogRef.close(<GeneratedCodingData>{
        id: this.varInfo.id,
        processing: [],
        fragmenting: '',
        manualInstruction: '',
        codeModel: 'VALUE_LIST',
        codeModelParameters: [],
        codes: [
          {
            id: 1,
            label: 'Richtig',
            score: 1,
            ruleSetOperatorAnd: false,
            ruleSets: [<RuleSet>{
              ruleOperatorAnd: false,
              rules: [
                {
                  method: "MATCH",
                  parameters: [this.selectedOption || '']
                }
              ]
            }],
            manualInstruction: ''
          },
          {
            id: 2,
            label: 'Falsch',
            score: 0,
            ruleSetOperatorAnd: false,
            ruleSets: [<RuleSet>{
              ruleOperatorAnd: false,
              rules: [{
                method: "ELSE"
              }]
            }],
            manualInstruction: ''
          }
        ]
      });
    } else if (this.generationModel === 'single-choice-some' && this.singleChoiceLongVersion) {
      const codes: CodeData[] = [];
      this.options.forEach(o => {
        codes.push({
          id: codes.length + 1,
          label: '',
          score: o.value == this.selectedOption ? 1 : 0,
          ruleSetOperatorAnd: false,
          ruleSets: [<RuleSet>{
            ruleOperatorAnd: true,
            rules: [<CodingRule>{
              method: "MATCH",
              parameters: [o.value || '']
            }],
          }],
          manualInstruction: ''
        })
      });
      codes.push({
        id: null,
        label: '',
        score: 0,
        ruleSetOperatorAnd: false,
        ruleSets: [<RuleSet>{
          ruleOperatorAnd: false,
          rules: [<CodingRule>{
            method: "ELSE"
          }],
        }],
        manualInstruction: ''
      })
      this.dialogRef.close(<GeneratedCodingData>{
        id: this.varInfo.id,
        processing: [],
        fragmenting: '',
        codeModel: 'CHOICE',
        codeModelParameters: [],
        codes: codes
      });
    } else if (this.generationModel === 'multi-choice' && this.multiChoiceOrderMatters) {
      const fullCreditRuleSets: RuleSet[] = [];
      this.selectedDragOptions.forEach((o, i) => {
        fullCreditRuleSets.push({
          ruleOperatorAnd: true,
          valueArrayPos: i,
          rules: [
            {
              method: "MATCH",
              parameters: [o.value || '']
            },
            {
              method: "NO_OTHER_MATCHES"
            }
          ]
        })
      });
      this.dialogRef.close(<GeneratedCodingData>{
        id: this.varInfo.id,
        processing: [],
        fragmenting: '',
        codeModel: 'CHOICE',
        codeModelParameters: [],
        codes: [
          {
            id: 1,
            label: 'Richtig',
            score: 1,
            ruleSetOperatorAnd: true,
            ruleSets: fullCreditRuleSets,
            manualInstruction: ''
          },
          {
            id: 2,
            label: 'Falsch',
            score: 0,
            ruleSetOperatorAnd: false,
            ruleSets: [<RuleSet>{
              ruleOperatorAnd: false,
              rules: [{
                method: "ELSE"
              }]
            }],
            manualInstruction: ''
          }
        ]
      });
    } else if (this.generationModel === 'single-choice-many' || this.generationModel === 'single-choice-some' ||
        (this.generationModel === 'multi-choice')) {
      const fullCreditRules: CodingRule[] = [];
      if (this.generationModel === 'single-choice-many') {
        fullCreditRules.push({
          method: "MATCH",
          parameters: [this.selectedOption || '']
        })
      } else {
        if (this.selectedOptions.length > 0) {
          this.selectedOptions.forEach(s => {
            fullCreditRules.push({
              method: "MATCH",
              parameters: [s]
            })
          });
        } else {
          fullCreditRules.push({
            method: "MATCH",
            parameters: ['']
          })
        }
        if (this.generationModel === 'multi-choice') {
          fullCreditRules.push({
            method: "NO_OTHER_MATCHES",
          });
        }
      }
      this.dialogRef.close(<GeneratedCodingData>{
        id: this.varInfo.id,
        processing: [],
        fragmenting: '',
        codeModel: 'CHOICE',
        codeModelParameters: [],
        codes: [
          {
            id: 1,
            label: 'Richtig',
            score: 1,
            ruleSetOperatorAnd: false,
            ruleSets: [<RuleSet>{
              ruleOperatorAnd: true,
              rules: fullCreditRules
            }],
            manualInstruction: ''
          },
          {
            id: 2,
            label: 'Falsch',
            score: 0,
            ruleSetOperatorAnd: false,
            ruleSets: [<RuleSet>{
              ruleOperatorAnd: false,
              rules: [{
                method: "ELSE"
              }]
            }],
            manualInstruction: ''
          }
        ]
      })
    } else {
      this.dialogRef.close(null);
    }
  }
}
