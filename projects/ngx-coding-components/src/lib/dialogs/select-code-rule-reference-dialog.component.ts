import {
  Component, Inject
} from '@angular/core';
import {
  MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose
} from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { MatButton } from '@angular/material/button';
import { MatInput } from '@angular/material/input';
import { MatFormField } from '@angular/material/form-field';

import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatSelectionList, MatListOption } from '@angular/material/list';

export interface SelectCodeRuleReferenceDialogData {
  isFragmentMode: boolean;
  value?: number | 'ANY' | 'ANY_OPEN' | 'SUM' | 'LENGTH' ;
}

@Component({
  template: `
    <h1 mat-dialog-title>{{ (refData.isFragmentMode ? 'rule' : 'rule-set') + '.reference.title' | translate }}</h1>
    <mat-dialog-content>
      <div>{{(refData.isFragmentMode ? 'rule' : 'rule-set') + '.reference.prompt' | translate}}</div>
      <mat-selection-list [(ngModel)]="newSelection" multiple="false"
        [attr.aria-describedby]="!refData.isFragmentMode &&
          (newSelection[0] === 'ANY' || newSelection[0] === 'ANY_OPEN' || newSelection[0] === 'legacy') ?
            'array-reference-help' : null">
        @if (hasLegacyReference) {
          <mat-list-option [value]="'legacy'" class="reference-option">
            <span class="reference-label">{{'rule-set.reference.legacy' | translate}}</span>
          </mat-list-option>
        }
        <mat-list-option [value]="'ANY'" class="reference-option">
          <span class="reference-label">
            {{(refData.isFragmentMode ? 'rule' : 'rule-set') + '.reference.any' | translate}}
          </span>
        </mat-list-option>
        @if (!refData.isFragmentMode) {
          <mat-list-option [value]="'ANY_OPEN'" class="reference-option">
            <span class="reference-label">{{'rule-set.reference.any-open' | translate}}</span>
          </mat-list-option>
          <mat-list-option [value]="'SUM'">
            {{'rule-set.reference.sum' | translate}}
          </mat-list-option>
          <mat-list-option [value]="'LENGTH'">
            {{'rule-set.reference.length' | translate}}
          </mat-list-option>
        }
        <mat-list-option [value]="'specific'" class="reference-option">
          <span class="reference-label">
            {{(refData.isFragmentMode ? 'rule' : 'rule-set') + '.reference.specific' | translate}}:
          </span>
        </mat-list-option>
      </mat-selection-list>
      @if (!refData.isFragmentMode &&
        (newSelection[0] === 'ANY' || newSelection[0] === 'ANY_OPEN' || newSelection[0] === 'legacy')) {
        <p id="array-reference-help" aria-live="polite">
          {{(newSelection[0] === 'legacy' ? 'rule-set.reference.legacy-help' :
            newSelection[0] === 'ANY' ? 'rule-set.reference.any-help' :
              'rule-set.reference.any-open-help') | translate}}
        </p>
      }
      <mat-form-field>
        <input matInput [disabled]="newSelection[0] !== 'specific'"
          [(ngModel)]="newValue"
          type="number">
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-raised-button color="primary" [disabled]="newSelection[0] === 'specific' && newValue <= 0"
      (click)="okButtonClick()">{{ 'dialog-save' | translate }}</button>
      <button mat-raised-button [mat-dialog-close]="false">{{'dialog-cancel' | translate}}</button>
    </mat-dialog-actions>
    `,
  styles: [`
    .reference-option {
      height: auto;
      min-height: 48px;
      padding-top: 8px;
      padding-bottom: 8px;
    }
    .reference-label {
      display: block;
      white-space: normal;
      line-height: 1.4;
    }
  `],
  standalone: true,
  imports: [
    MatDialogTitle, MatDialogContent, MatSelectionList, ReactiveFormsModule, FormsModule,
    MatListOption, MatFormField, MatInput, MatDialogActions, MatButton, MatDialogClose, TranslateModule]
})
export class SelectCodeRuleReferenceDialogComponent {
  newValue: number;
  newSelection: string[];
  readonly hasLegacyReference: boolean;

  constructor(
    @Inject(MAT_DIALOG_DATA) public refData: SelectCodeRuleReferenceDialogData,
    public dialogRef: MatDialogRef<SelectCodeRuleReferenceDialogComponent>
  ) {
    this.hasLegacyReference = !refData.isFragmentMode &&
      (refData.value === undefined || (typeof refData.value === 'number' && refData.value < 0));
    if (this.hasLegacyReference) {
      this.newValue = 0;
      this.newSelection = ['legacy'];
    } else if (typeof this.refData.value === 'number') {
      this.newValue = this.refData.value + 1;
      this.newSelection = ['specific'];
    } else {
      this.newValue = 0;
      this.newSelection = [this.refData.value || 'ANY'];
    }
  }

  okButtonClick(): void {
    // Keep the original absent/legacy reference; false leaves the caller's rule set unchanged.
    if (this.newSelection[0] === 'legacy') {
      this.dialogRef.close(false);
      return;
    }
    const result = this.newSelection[0] === 'specific' ? this.newValue - 1 : this.newSelection[0];
    this.dialogRef.close(result);
  }
}
