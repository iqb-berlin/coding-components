import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import {CodingRule, RuleSet, ToTextFactory, VariableCodingData, VariableInfo} from "@iqb/responses";
import {CodingFactory} from "@iqb/responses/coding-factory";

@Component({
  template: `
    <h1 mat-dialog-title>{{ 'coding.generate.dialog-title' | translate}} '{{varInfo.id}}'</h1>

    <mat-dialog-content>
      <div *ngFor="let info of ToTextFactory.varInfoAsText(varInfo)">
        <p>{{info}}</p>
      </div>
      <div *ngIf="!newCoding" [style.font-style]="'italic'">{{ 'coding.generate.no-suggestion' | translate}}</div>
      <div *ngIf="newCoding" class="coding-action">
        <p [style.font-weight]="'bold'">{{ 'coding.generate.title' | translate}}</p>
        <p>{{ 'coding.generate.' + newCodingMessage | translate}}</p>
        <p [style.font-style]="'italic'">{{ 'coding.generate.warning' | translate}}
        </p>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions>
      <button mat-raised-button [disabled]="!newCoding" [mat-dialog-close]="newCoding">{{'coding.generate.action' | translate}}</button>
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
  protected readonly ToTextFactory = ToTextFactory;
  newCoding?: VariableCodingData;
  newCodingMessage = '';
  constructor(@Inject(MAT_DIALOG_DATA) public varInfo: VariableInfo) {
    if (varInfo.valuesComplete && varInfo.values && varInfo.values.length > 0) {
      if (varInfo.multiple) {
        if (varInfo.values.length < 10) {
          this.newCodingMessage = 'new-coding-dragndrop';
          this.newCoding = CodingFactory.createCodingVariableFromVarInfo(varInfo);
          this.newCoding.codeModel = "CHOICE";
          this.newCoding.codes = [
            {
              id: 1,
              label: 'RICHTIG',
              score: 1,
              ruleSetOperatorAnd: false,
              ruleSets: [<RuleSet>{
                ruleOperatorAnd: true,
                rules: varInfo.values.map(v => <CodingRule>{
                  method: "MATCH",
                  parameters: [(typeof v.value === 'string') ? v.value : v.value.toString()]
                })
              }],
              manualInstruction: ''
            },
            {
              id: 2,
              label: 'FALSCH - alle anderen Antworten',
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
          ];
        }
      } else {
        this.newCodingMessage = 'new-coding-choice';
        this.newCoding = CodingFactory.createCodingVariableFromVarInfo(varInfo);
        this.newCoding.codeModel = "CHOICE";
        this.newCoding.codes = [
          {
            id: 1,
            label: 'RICHTIG',
            score: 1,
            ruleSetOperatorAnd: false,
            ruleSets: [<RuleSet>{
              ruleOperatorAnd: true,
              rules: [{
                method: "MATCH",
                parameters: ['bitte Wert eintragen']
              }]
            }],
            manualInstruction: ''
          },
          {
            id: 2,
            label: 'FALSCH - alle anderen Antworten',
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
        ];
      }
    }
  }
}
