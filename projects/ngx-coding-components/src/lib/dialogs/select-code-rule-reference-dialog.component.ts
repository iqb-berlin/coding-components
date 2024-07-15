import {
  Component, Inject
} from '@angular/core';
import {
  MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose
} from '@angular/material/dialog';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { MatButton } from '@angular/material/button';
import { MatInput } from '@angular/material/input';
import { MatFormField } from '@angular/material/form-field';

import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatSelectionList, MatListOption } from '@angular/material/list';

@Component({
  template: `
    <h1 mat-dialog-title>{{ (refData.isFragmentMode ? 'rule' : 'rule-set') + '.reference.title' | translate }}</h1>
    <mat-dialog-content>
      <div>{{(refData.isFragmentMode ? 'rule' : 'rule-set') + '.reference.prompt' | translate}}</div>
      <mat-selection-list [(ngModel)]="newSelection" multiple="false">
        <mat-list-option [value]="'ANY'">
          {{(refData.isFragmentMode ? 'rule' : 'rule-set') + '.reference.any' | translate}}
        </mat-list-option>
        @if (!refData.isFragmentMode) {
          <mat-list-option [value]="'SUM'">
            {{(refData.isFragmentMode ? 'rule' : 'rule-set') + '.reference.sum' | translate}}
          </mat-list-option>
        }
        <mat-list-option [value]="'specific'">
          {{(refData.isFragmentMode ? 'rule' : 'rule-set') + '.reference.specific' | translate}}:
        </mat-list-option>
      </mat-selection-list>
      <mat-form-field>
        <input matInput [disabled]="newSelection[0] !== 'specific'"
          [(ngModel)]="newValue"
          type="number">
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-raised-button color="primary" [disabled]="newSelection[0] === 'specific' && newValue <= 0"
      (click)="okButtonClick()">{{ 'dialog-save' | translate }}</button>
      <button mat-raised-button [mat-dialog-close]="false">{{'dialog-cancel' | translate}}</button>
    </mat-dialog-actions>
    `,
  standalone: true,
  imports: [
    MatDialogTitle, MatDialogContent, MatSelectionList, ReactiveFormsModule, FormsModule,
    MatListOption, MatFormField, MatInput, MatDialogActions, MatButton, MatDialogClose, TranslateModule]
})
export class SelectCodeRuleReferenceDialogComponent {
  newValue: number;
  newSelection: string[];

  constructor(
    @Inject(MAT_DIALOG_DATA) public refData: SelectCodeRuleReferenceDialogData,
    public dialogRef: MatDialogRef<SelectCodeRuleReferenceDialogComponent>,
    public translateService: TranslateService
  ) {
    this.newValue = typeof this.refData.value === 'number' ? this.refData.value + 1 : 0;
    this.newSelection = typeof this.refData.value === 'number' ? ['specific'] : [this.refData.value];
  }

  okButtonClick() {
    if (this.newSelection[0] === 'specific') {
      this.dialogRef.close(this.newValue - 1);
    } else {
      this.dialogRef.close(this.newSelection[0]);
    }
  }
}

export interface SelectCodeRuleReferenceDialogData {
  isFragmentMode: boolean;
  value: number | 'ANY' | 'SUM';
}
