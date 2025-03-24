import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose
} from '@angular/material/dialog';
import {
  CodingAsText,
  CodingToTextMode,
  ToTextFactory
} from '@iqb/responses';
import { TranslateModule } from '@ngx-translate/core';
import { MatButton } from '@angular/material/button';
import { MatSlideToggle, MatSlideToggleChange } from '@angular/material/slide-toggle';
import { FormsModule } from '@angular/forms';
import { VariableCodingData } from '@iqbspecs/coding-scheme/coding-scheme.interface';

export interface ShowCodingData {
  varCoding: VariableCodingData,
  mode: CodingToTextMode
}

@Component({
  template: `
    <h1 mat-dialog-title>{{varCoding.alias || varCoding.id}}{{varCoding.label ? ' - ' + varCoding.label : ''}}</h1>

    <mat-dialog-content>
      <div class="fx-row-end-center">
        <mat-slide-toggle [(ngModel)]="isSimpleMode" (change)="updateText($event)">
          {{'show-coding.simple-mode-label' | translate}}</mat-slide-toggle>
      </div>
      <div class="info">
        <div class="fx-row-start-center">
          <div class="fx-flex-row-20">{{'manual-instruction.coding.source' | translate}}:</div>
          <div class="fx-flex-fill">{{varCodingText?.source}}</div>
        </div>
        <div class="fx-row-start-center">
          <div class="fx-flex-row-20">{{'processing.prompt' | translate}}:</div>
          <div class="fx-flex-fill">{{varCodingText?.processing || 'keine'}}</div>
        </div>
        <div class="fx-row-start-center">
          <div class="fx-flex-row-20">{{'manual-instruction.coding.title' | translate}}:</div>
          <div class="fx-flex-fill">{{varCodingText?.hasManualInstruction ? 'ja' : 'keine'}}</div>
        </div>
      </div>
      <h3>Codes</h3>
      @if (varCodingText && varCodingText.codes && varCodingText.codes.length > 0) {
        <div class="fx-row-start-center" [style.font-weight]="'bold'">
          <div class="fx-flex-row-10" [style.text-align]="'center'">Code</div>
          <div class="fx-flex-row-10" [style.text-align]="'center'">Score</div>
          <div class="fx-flex-row-20">Titel</div>
          <div class="fx-flex-fill">Bedingung(en)</div>
          <div class="fx-flex-row-15" [style.text-align]="'center'">Instruktion</div>
        </div>
        @for (codeText of varCodingText.codes; track codeText) {
          <div class="fx-row-start-center code-row">
            <div class="fx-flex-row-10" [style.text-align]="'center'">{{codeText.id}}</div>
            <div class="fx-flex-row-10" [style.text-align]="'center'">{{codeText.score}}</div>
            <div class="fx-flex-row-20">{{codeText.label}}</div>
            <div class="fx-flex-fill">
              @if (codeText.ruleSetDescriptions.length > 1) {
                <ul>
                  @for (d of codeText.ruleSetDescriptions; track d) {
                    <li>{{d}}</li>
                  }
                </ul>
              }
              @if (codeText.ruleSetDescriptions.length > 1) {
                <p>Verknüpfung der Regelsätze: {{codeText.ruleSetOperatorAnd ? 'UND' : 'ODER'}}</p>
              }
              @if (codeText.ruleSetDescriptions.length === 1) {
                <p>{{codeText.ruleSetDescriptions[0]}}</p>
              }
              @if (codeText.ruleSetDescriptions.length < 1) {
                <p>keine</p>
              }
            </div>
            <div class="fx-flex-row-10" [style.text-align]="'center'">
              {{codeText.hasManualInstruction ? 'ja' : '-'}}
            </div>
          </div>
        }
      }
      @if (varCodingText && varCodingText.codes && varCodingText.codes.length === 0) {
        <div>keine</div>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-raised-button color="primary"  [mat-dialog-close]="mode">{{'dialog-close' | translate}}</button>
    </mat-dialog-actions>
    `,
  styles: [
    '.code-row:nth-child(even) {background-color: #f1f1f1;}',
    '.info {margin-top: 20px;}'
  ],
  standalone: true,
  imports: [MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButton,
    MatDialogClose,
    TranslateModule,
    MatSlideToggle,
    FormsModule]
})
export class ShowCodingDialogComponent {
  varCoding: VariableCodingData;
  varCodingText: CodingAsText | undefined;
  mode: CodingToTextMode | undefined;
  isSimpleMode: boolean;

  constructor(@Inject(MAT_DIALOG_DATA) public showCodingData: ShowCodingData) {
    this.varCoding = showCodingData.varCoding;
    this.isSimpleMode = showCodingData.mode === 'SIMPLE';
    this.updateText(this.isSimpleMode);
  }

  updateText(newValue: MatSlideToggleChange | boolean) {
    const booleanValue = typeof newValue === 'boolean' ? newValue : newValue.checked;
    this.mode = booleanValue ? 'SIMPLE' : 'EXTENDED';
    this.varCodingText = {
      id: this.varCoding.alias || this.varCoding.id,
      label: this.varCoding.label,
      source: ToTextFactory.sourceAsText(
        this.varCoding.alias || this.varCoding.id,
        this.varCoding.sourceType,
        this.varCoding.deriveSources),
      processing: ToTextFactory.processingAsText(this.varCoding.processing, this.varCoding.fragmenting),
      hasManualInstruction: !!this.varCoding.manualInstruction,
      codes: this.varCoding.codes.map(code => ToTextFactory.codeAsText(code, this.mode))
    };
  }
}
