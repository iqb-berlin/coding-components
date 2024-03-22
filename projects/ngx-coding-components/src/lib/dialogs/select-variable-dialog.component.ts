import {
  Component, OnInit, Inject, ViewChild
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { MatSelectionList, MatListOption } from '@angular/material/list';
import { TranslateModule } from '@ngx-translate/core';
import { MatButton } from '@angular/material/button';
import { NgIf, NgFor } from '@angular/common';

@Component({
    template: `
    <h1 mat-dialog-title>{{ selectData.title }}</h1>
    <div *ngIf="selectData.prompt">{{selectData.prompt}}</div>

    <mat-dialog-content>
      <mat-selection-list #variables multiple="false">
        <mat-list-option *ngFor="let v of selectData.variables" [value]="v">
          {{v}}
        </mat-list-option>
      </mat-selection-list>
    </mat-dialog-content>

    <mat-dialog-actions>
      <button mat-raised-button color="primary" [disabled]="variables.selectedOptions.selected.length <= 0"
              (click)="okButtonClick()">{{ selectData.okButtonLabel }}</button>
      <button mat-raised-button [mat-dialog-close]="false">{{'dialog-cancel' | translate}}</button>
    </mat-dialog-actions>
  `,
    standalone: true,
    imports: [MatDialogTitle, NgIf, MatDialogContent, MatSelectionList, NgFor, MatListOption, MatDialogActions, MatButton, MatDialogClose, TranslateModule]
})
export class SelectVariableDialogComponent implements OnInit {
  @ViewChild('variables') variablesElement?: MatSelectionList;

  constructor(
    @Inject(MAT_DIALOG_DATA) public selectData: SelectVariableDialogData,
    public dialogRef: MatDialogRef<SelectVariableDialogComponent>
  ) {}

  ngOnInit(): void {
    if ((typeof this.selectData.title === 'undefined') || (this.selectData.title.length === 0)) {
      this.selectData.title = 'Variable wählen';
    }
    if ((typeof this.selectData.okButtonLabel === 'undefined') ||
      (this.selectData.okButtonLabel.length === 0)) {
      this.selectData.okButtonLabel = 'OK';
    }
  }

  okButtonClick() {
    const selectedOptions = this.variablesElement?.selectedOptions.selected;
    this.dialogRef.close(selectedOptions ? selectedOptions[0].value : '');
  }
}

export interface SelectVariableDialogData {
  title: string;
  prompt: string;
  variables: string[];
  okButtonLabel: string;
}
