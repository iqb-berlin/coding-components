import {
  Component, Inject
} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import { TranslateService } from "@ngx-translate/core";

@Component({
  template: `
    <h1 mat-dialog-title>{{ (refData.isFragmentMode ? 'rule' : 'rule-set') + '.reference.prompt' | translate }}</h1>
    <mat-dialog-content>
      <mat-selection-list [(ngModel)]="newSelection" multiple="false">
        <mat-list-option [value]="'any'">
          {{(refData.isFragmentMode ? 'rule' : 'rule-set') + '.reference.any' | translate}}
        </mat-list-option>
        <mat-list-option [value]="'specific'">
          {{(refData.isFragmentMode ? 'rule' : 'rule-set') + '.reference.specific' | translate}}:
        </mat-list-option>
      </mat-selection-list>
      <mat-form-field>
        <input matInput [disabled]="newSelection[0] === 'any'"
               [(ngModel)]="newValue"
               type="number">
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-raised-button color="primary" (click)="okButtonClick()">{{ 'dialog-save' | translate }}</button>
      <button mat-raised-button [mat-dialog-close]="false">{{'dialog-cancel' | translate}}</button>
    </mat-dialog-actions>
  `
})
export class SelectCodeRuleReferenceDialogComponent {
  newValue: number;
  newSelection: string[];

  constructor(
    @Inject(MAT_DIALOG_DATA) public refData: SelectCodeRuleReferenceDialogData,
    public dialogRef: MatDialogRef<SelectCodeRuleReferenceDialogComponent>,
    public translateService: TranslateService
  ) {
    this.newValue = this.refData.value < 0 ? 0 : this.refData.value + 1;
    this.newSelection = this.refData.value < 0 ? ['any'] : ['specific'];
  }

  okButtonClick() {
    if (this.newSelection[0] === 'any') {
      this.dialogRef.close(-1);
    } else {
      this.dialogRef.close(this.newValue - 1);
    }
  }
}

export interface SelectCodeRuleReferenceDialogData {
  isFragmentMode: boolean;
  value: number;
}
