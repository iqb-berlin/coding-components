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
  template: `
    <h1 mat-dialog-title>{{ 'coding.generate.dialog-title' | translate}} '{{varInfo.id}}'</h1>

    <mat-dialog-content>
      <div *ngIf="varInfo">
        <p *ngFor="let info of ToTextFactory.varInfoAsText(varInfo)">{{info}}</p>
      </div>
      <div *ngIf="!varInfo">
        <p>{{ 'coding.generate.no-var-info' | translate}}</p>
      </div>
      <div *ngIf="generationModel === 'none'" [style.font-style]="'italic'">{{ 'coding.generate.model.none' | translate}}</div>
      <div *ngIf="generationModel !== 'none'" class="coding-action">
        <p [style.font-weight]="'bold'">{{ 'coding.generate.title' | translate}}</p>
        <p>{{ 'coding.generate.model.' + generationModel | translate}}</p>
        <div *ngIf="generationModel === 'multi-choice'" class="fx-column-start-stretch">
          <div class="fx-row-end-center">
            <mat-label [style.margin-right.px]="8">{{'coding.generate.model.multi-choice-order-prompt' | translate}}</mat-label>
            <mat-checkbox [(ngModel)]="multiChoiceOrderMatters" disabled="true"></mat-checkbox>
            <div>{{ 'coding.generate.model.multi-choice-' + (multiChoiceOrderMatters ? 'yes' : 'no') | translate}}</div>
          </div>
          <mat-selection-list *ngIf="!multiChoiceOrderMatters" [(ngModel)]="selectedOptions" multiple="true">
            <mat-list-option *ngFor="let c of options" [value]="c.value">
              '{{c.value}}'{{c.label ? ' - ' : '' }}{{c.label}}
            </mat-list-option>
          </mat-selection-list>
          <div *ngIf="multiChoiceOrderMatters">
            coming soon: drag'n'drop of values
          </div>
        </div>
        <mat-selection-list *ngIf="generationModel === 'single-choice-some'"
                            [(ngModel)]="selectedOption" multiple="false">
          <mat-list-option *ngFor="let c of options" [value]="c.value">
            '{{c.value}}'{{c.label ? ' - ' : '' }}{{c.label}}
          </mat-list-option>
        </mat-selection-list>
        <mat-form-field *ngIf="generationModel === 'single-choice-many'">
          <mat-select [(value)]="selectedOption">
            <mat-option *ngFor="let c of options" [value]="c.value">
              '{{c.value}}'{{c.label ? ' - ' : '' }}{{c.label}}
            </mat-option>
          </mat-select>
        </mat-form-field>
        <div *ngIf="generationModel === 'integer'">
          coming soon: integer
        </div>
        <p [style.font-style]="'italic'">{{ 'coding.generate.warning' | translate}}</p>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions>
      <button mat-raised-button [disabled]="generationModel === 'none'" (click)="generateButtonClick()">{{'coding.generate.action' | translate}}</button>
      <button mat-raised-button [mat-dialog-close]="false">{{'dialog-close' | translate}}</button>
    </mat-dialog-actions>
  `,
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
