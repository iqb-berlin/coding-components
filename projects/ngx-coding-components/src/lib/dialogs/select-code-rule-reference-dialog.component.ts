import {
  Component, Inject
} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import { TranslateService } from "@ngx-translate/core";

@Component({
  template: `
    <h1 mat-dialog-title>{{ (refData.isFragmentMode ? 'rule' : 'rule-set') + '.reference.title' | translate }}</h1>
    <mat-dialog-content>
      <div>{{(refData.isFragmentMode ? 'rule' : 'rule-set') + '.reference.prompt' | translate}}</div>
      <mat-selection-list [(ngModel)]="newSelection" multiple="false">
        <mat-list-option [value]="'ANY'">
          {{(refData.isFragmentMode ? 'rule' : 'rule-set') + '.reference.any' | translate}}
        </mat-list-option>
        <mat-list-option [value]="'SUM'" *ngIf="!refData.isFragmentMode">
          {{(refData.isFragmentMode ? 'rule' : 'rule-set') + '.reference.sum' | translate}}
        </mat-list-option>
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
