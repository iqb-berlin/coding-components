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
      <div *ngIf="!newCodingMessage" [style.font-style]="'italic'">{{ 'coding.generate.no-suggestion' | translate}}</div>
      <div *ngIf="newCodingMessage" class="coding-action">
        <p [style.font-weight]="'bold'">{{ 'coding.generate.title' | translate}}</p>
        <p>{{ 'coding.generate.' + newCodingMessage | translate}}</p>
        <mat-selection-list *ngIf="newCodingMessage === 'new-coding-choice'"
                            [(ngModel)]="selectedChoice" label="Wert für 'Richtig'"
                            multiple="false">
          <mat-list-option *ngFor="let c of newCodingChoices" [value]="c.value">
            '{{c.value}}' - {{c.label}}
          </mat-list-option>
        </mat-selection-list>
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
  selectedChoice?: string;
  newCodingChoices: {
    value: string,
    label: string
  }[] = [];
  newCodingMessage = '';

  get newCoding(): VariableCodingData | null {
    if (this.varInfo.valuesComplete && this.varInfo.values && this.varInfo.values.length > 0) {
      if (this.varInfo.multiple) {
        if (this.varInfo.values.length < 20) {
          this.newCodingMessage = 'new-coding-dragndrop';
          const newCoding = CodingFactory.createCodingVariableFromVarInfo(this.varInfo);
          newCoding.codeModel = "CHOICE";
          newCoding.codes = [
            {
              id: 1,
              label: 'Richtig',
              score: 1,
              ruleSetOperatorAnd: false,
              ruleSets: [<RuleSet>{
                ruleOperatorAnd: true,
                rules: this.varInfo.values.map(v => <CodingRule>{
                  method: "MATCH",
                  parameters: [(typeof v.value === 'string') ? v.value : v.value.toString()]
                })
              }],
              manualInstruction: ''
            },
            {
              id: 2,
              label: 'Falsch - alle anderen Antworten',
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
          return newCoding;
        }
      } else {
        this.newCodingMessage = 'new-coding-choice';
        const newCoding = CodingFactory.createCodingVariableFromVarInfo(this.varInfo);
        newCoding.codeModel = "CHOICE";
        newCoding.codes = [
          {
            id: 1,
            label: 'Richtig',
            score: 1,
            ruleSetOperatorAnd: false,
            ruleSets: [<RuleSet>{
              ruleOperatorAnd: true,
              rules: [{
                method: "MATCH",
                parameters: [this.selectedChoice || '']
              }]
            }],
            manualInstruction: ''
          },
          {
            id: 2,
            label: 'Falsch - alle anderen Antworten',
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
        return newCoding;
      }
    }
    return null;
  }

  constructor(@Inject(MAT_DIALOG_DATA) public varInfo: VariableInfo) {
    if (varInfo.valuesComplete && varInfo.values && varInfo.values.length > 0) {
      if (varInfo.multiple) {
        if (varInfo.values.length < 20) {
          this.newCodingMessage = 'new-coding-dragndrop';
        }
      } else {
        if (varInfo.values.length > 20) {
          this.newCodingMessage += 'new-coding-choice-no-selection'
        } else {
          this.newCodingMessage += 'new-coding-choice'
          this.newCodingChoices = this.varInfo.values.map(v => <{value: string, label: string}>{
            value: (typeof v.value === 'string') ? v.value : v.value.toString(),
            label: v.label
          });
        }
      }
    }
  }
}
