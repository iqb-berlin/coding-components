import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import {CodingAsText, ToTextFactory, VariableCodingData} from "@iqb/responses";
import { TranslateModule } from '@ngx-translate/core';
import { MatButton } from '@angular/material/button';
import { NgIf, NgFor } from '@angular/common';

@Component({
    template: `
    <h1 mat-dialog-title>{{varCoding.id}}{{varCoding.label ? ' - ' + varCoding.label : ''}}</h1>

    <mat-dialog-content>
      <div class="fx-row-start-center">
        <div class="fx-flex-row-20">Quelle:</div>
        <div class="fx-flex-fill">{{varCodingText.source}}</div>
      </div>
      <div class="fx-row-start-center">
        <div class="fx-flex-row-20">Verarbeitung:</div>
        <div class="fx-flex-fill">{{varCodingText.processing || 'keine'}}</div>
      </div>
      <div class="fx-row-start-center">
        <div class="fx-flex-row-20">Allgemeine Instruktion:</div>
        <div class="fx-flex-fill">{{varCodingText.hasManualInstruction ? 'ja' : 'keine'}}</div>
      </div>
      <h3>Codes</h3>
      <ng-container *ngIf="varCodingText.codes.length > 0">
        <div class="fx-row-start-center" [style.font-weight]="'bold'">
          <div class="fx-flex-row-10" [style.text-align]="'center'">Code</div>
          <div class="fx-flex-row-10" [style.text-align]="'center'">Score</div>
          <div class="fx-flex-row-20">Titel</div>
          <div class="fx-flex-fill">Bedingung(en)</div>
          <div class="fx-flex-row-10" [style.text-align]="'center'">Instruktions- text ?</div>
        </div>
        <div class="fx-row-start-center code-row" *ngFor="let codeText of varCodingText.codes">
          <div class="fx-flex-row-10" [style.text-align]="'center'">{{codeText.code}}</div>
          <div class="fx-flex-row-10" [style.text-align]="'center'">{{codeText.score}}</div>
          <div class="fx-flex-row-20">{{codeText.label}}</div>
          <div class="fx-flex-fill">
            <ul *ngIf="codeText.ruleSetDescriptions.length > 1">
              <li *ngFor="let d of codeText.ruleSetDescriptions">{{d}}</li>
            </ul>
            <p *ngIf="codeText.ruleSetDescriptions.length > 1">Verknüpfung der Regelsätze: {{codeText.ruleSetOperatorAnd ? 'UND' : 'ODER'}}</p>
            <p *ngIf="codeText.ruleSetDescriptions.length === 1">{{codeText.ruleSetDescriptions[0]}}</p>
            <p *ngIf="codeText.ruleSetDescriptions.length < 1">keine</p>
          </div>
          <div class="fx-flex-row-10" [style.text-align]="'center'">{{codeText.hasManualInstruction ? 'ja' : '-'}}</div>
        </div>
      </ng-container>
      <div *ngIf="varCodingText.codes.length === 0">keine</div>
    </mat-dialog-content>

    <mat-dialog-actions>
      <button mat-raised-button [mat-dialog-close]="false">{{'dialog-close' | translate}}</button>
    </mat-dialog-actions>
  `,
    styles: [
        '.code-row:nth-child(even) {background-color: #f1f1f1;}'
    ],
    standalone: true,
    imports: [MatDialogTitle, MatDialogContent, NgIf, NgFor, MatDialogActions, MatButton, MatDialogClose, TranslateModule]
})
export class ShowCodingDialogComponent {
  varCodingText: CodingAsText;

  constructor(@Inject(MAT_DIALOG_DATA) public varCoding: VariableCodingData) {
    this.varCodingText = {
      id: this.varCoding.id,
      label: this.varCoding.label,
      source: ToTextFactory.sourceAsText(this.varCoding.id, this.varCoding.sourceType, this.varCoding.deriveSources),
      processing: ToTextFactory.processingAsText(this.varCoding.processing, this.varCoding.fragmenting),
      hasManualInstruction: !!this.varCoding.manualInstruction,
      codes: this.varCoding.codes.map(code => ToTextFactory.codeAsText(code))
    };
  }
}
