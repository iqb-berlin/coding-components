import { Component, Inject } from '@angular/core';
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

@Component({
  templateUrl: 'generate-coding-dialog.component.html',
  styles: [
    `.coding-action {
      background: #cccccc;
      color: black;
      padding: 4px 10px;
    }`
  ]
})

export class GenerateCodingDialogComponent {
  generationModel: 'none' | 'single-choice-some' | 'single-choice-many' | 'multi-choice' | 'integer';
  protected readonly ToTextFactory = ToTextFactory;
  selectedOption: string = '';
  selectedOptions: string[] = [];
  multiChoiceOrderMatters = false;
  singleChoiceLongVersion = false;
  options: {
    value: string,
    label: string
  }[] = [];
  numericMoreThen = '';
  numericMax = '';
  numericRuleText = '';

  constructor(
      @Inject(MAT_DIALOG_DATA) public varInfo: VariableInfo,
      public translateService: TranslateService,
      public dialogRef: MatDialogRef<GenerateCodingDialogComponent>,
  ) {
    if (varInfo) {
      if (varInfo.valuesComplete && varInfo.values && varInfo.values.length > 0) {
        if (varInfo.multiple) {
          this.generationModel = 'multi-choice';
        } else {
          this.generationModel = varInfo.values.length > 20 ? 'single-choice-many' : 'single-choice-some';
        }
        this.options = varInfo.values.map(v => <{value: string, label: string}>{
          value: (typeof v.value === 'string') ? v.value : v.value.toString(),
          label: v.label
        });
      } else if (varInfo.type === 'integer') {
        this.generationModel = 'integer'
      } else {
        this.generationModel = 'none'
      }
    } else {
      this.generationModel = 'none'
    }
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
    } else if (this.generationModel === 'single-choice-many' || this.generationModel === 'single-choice-some' ||
        (this.generationModel === 'multi-choice' && !this.multiChoiceOrderMatters)) {
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

      console.log(fullCreditRules);
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
    } else if (this.generationModel === 'multi-choice' && this.multiChoiceOrderMatters) {
      console.log(this.selectedOptions);
      this.dialogRef.close(null);
    } else {
      this.dialogRef.close(null);
    }
  }
}
