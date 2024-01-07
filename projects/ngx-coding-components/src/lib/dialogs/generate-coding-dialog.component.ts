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

  constructor(
      @Inject(MAT_DIALOG_DATA) public varInfo: VariableInfo,
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

  generateButtonClick() {
    if (this.generationModel === 'none') {
      this.dialogRef.close(null);
    } else if (this.generationModel === 'integer') {
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
              rules: [<CodingRule>{
                method: "NUMERIC_MATCH",
                parameters: ['']
              }]
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
      if (this.generationModel === 'multi-choice') {
        this.selectedOptions.forEach(s => {
          fullCreditRules.push({
            method: "MATCH",
            parameters: [s]
          })
        });
      } else {
        fullCreditRules.push({
          method: "MATCH",
          parameters: [this.selectedOption || '']
        })
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
    } else if (this.generationModel === 'multi-choice' && this.multiChoiceOrderMatters) {
      console.log(this.selectedOptions);
      this.dialogRef.close(null);
    } else {
      this.dialogRef.close(null);
    }
  }
}
