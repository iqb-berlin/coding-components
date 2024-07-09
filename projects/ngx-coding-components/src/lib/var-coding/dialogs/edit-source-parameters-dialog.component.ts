import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose
} from '@angular/material/dialog';
import { SourceProcessingType, SourceType } from '@iqb/responses';
import { TranslateModule } from '@ngx-translate/core';
import { MatButton } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { MatTooltip } from '@angular/material/tooltip';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatCheckbox } from '@angular/material/checkbox';
import { VariableSourceParameters } from '@iqb/responses/coding-interfaces';
import { MatOption, MatSelect } from '@angular/material/select';

export interface EditSourceParametersDialogData {
  sourceType: SourceType,
  sourceParameters: VariableSourceParameters;
  deriveSources: string[]
}

@Component({
  template: `
    <h1 mat-dialog-title>{{ 'derive-header' | translate }}</h1>

    <mat-dialog-content>
      <div class="fx-column-start-stretch">
        @if (data.sourceType !== 'BASE') {
          <mat-form-field>
            <mat-label>{{ 'derive-method.prompt' | translate }}</mat-label>
            <mat-select [(value)]="data.sourceType" (selectionChange)="sourceTypeChanged()">
              @for (st of sourceTypeList; track st) {
                <mat-option [value]="st">
                  {{ 'derive-method.' + st | translate }}
                </mat-option>
              }
            </mat-select>
          </mat-form-field>
        }

        @if (possibleDeriveProcessing.length > 0) {
          <div>{{ 'derive-processing.prompt' | translate }}</div>
          @for (p of possibleDeriveProcessing; track p) {
            <mat-checkbox [checked]="data.sourceParameters.processing?.includes(p)"
                          (change)="alterProcessing(p, $event.checked)">
              {{ 'derive-processing.' + p | translate }}
            </mat-checkbox>
          }
        }
        @if (data.sourceType === 'SOLVER') {
          <mat-form-field>
            <mat-label>{{ 'derive-processing.SOLVER_EXPRESSION' | translate }}</mat-label>
            <input matInput [(ngModel)]="data.sourceParameters.solverExpression">
          </mat-form-field>
        }
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-raised-button color="primary" [mat-dialog-close]="data">{{ 'dialog-save' | translate }}</button>
      <button mat-raised-button [mat-dialog-close]="false">{{ 'dialog-cancel' | translate }}</button>
    </mat-dialog-actions>
  `,
  standalone: true,
  imports: [
    MatDialogTitle, MatDialogContent, MatDialogActions, MatButton, MatDialogClose, TranslateModule,
    FormsModule, MatTooltip, MatFormField, MatInput, MatCheckbox, MatLabel, MatSelect, MatOption
  ]
})
export class EditSourceParametersDialog {
  sourceTypeList: SourceType[] = ['COPY_VALUE', 'CONCAT_CODE', 'SUM_CODE', 'SUM_SCORE', 'UNIQUE_VALUES', 'SOLVER'];
  possibleDeriveProcessing: SourceProcessingType[] = []

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: EditSourceParametersDialogData
  ) {
    const shadowProcessing: EditSourceParametersDialogData = {
      sourceType: 'BASE',
      sourceParameters: {
        solverExpression: '',
        processing: []
      },
      deriveSources: []
    };
    shadowProcessing.sourceType = this.data.sourceType;
    shadowProcessing.sourceParameters.solverExpression = this.data.sourceParameters.solverExpression;
    if (this.data.sourceParameters.processing && shadowProcessing.sourceParameters.processing) {
      this.data.sourceParameters.processing.forEach(p => {
        if (shadowProcessing.sourceParameters.processing) shadowProcessing.sourceParameters.processing.push(p)
      });
    }
    this.data.deriveSources.forEach(p => {
      shadowProcessing.deriveSources.push(p)
    });
    this.data = shadowProcessing;
    this.sourceTypeChanged();
  }

  sourceTypeChanged() {
    this.data.sourceParameters.processing = [];
    if (this.data.sourceType === 'BASE') {
      this.possibleDeriveProcessing = ['TAKE_DISPLAYED_AS_VALUE_CHANGED', 'TAKE_EMPTY_AS_VALID']
    } else if (this.data.sourceType === 'UNIQUE_VALUES') {
      this.possibleDeriveProcessing = ['REMOVE_ALL_SPACES', 'REMOVE_DISPENSABLE_SPACES',
        'TO_NUMBER', 'TO_LOWER_CASE'];
    } else if (this.data.sourceType === 'CONCAT_CODE') {
      this.possibleDeriveProcessing = ['SORT']
    } else {
      this.possibleDeriveProcessing = []
    }
  }

  alterProcessing(processingId: SourceProcessingType, checked: boolean) {
    if (this.data.sourceParameters.processing) {
      const processPos = this.data.sourceParameters.processing.indexOf(processingId);
      if (checked && processPos < 0) {
        this.data.sourceParameters.processing.push(processingId);
      } else if (!checked && processPos >= 0) {
        this.data.sourceParameters.processing.splice(processPos, 1);
      }
    }
  }
}
