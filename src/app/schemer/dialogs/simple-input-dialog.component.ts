import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  template: `
    <h1 mat-dialog-title>{{ inputData.title }}</h1>

    <mat-dialog-content>
      <div *ngIf="inputData.prompt">{{inputData.prompt}}</div>
      <mat-form-field>
        <input matInput [placeholder]="inputData.placeholder" [(ngModel)]="inputData.value">
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions>
      <button mat-raised-button color="primary" [mat-dialog-close]="inputData.value">{{ inputData.saveButtonLabel }}</button>
      <button mat-raised-button *ngIf="showCancel" [mat-dialog-close]="false">{{'dialog-cancel' | translate}}</button>
    </mat-dialog-actions>
  `
})
export class SimpleInputDialogComponent implements OnInit {
  showCancel = true;

  constructor(@Inject(MAT_DIALOG_DATA) public inputData: SimpleInputDialogData) {}

  ngOnInit(): void {
    if ((typeof this.inputData.title === 'undefined') || (this.inputData.title.length === 0)) {
      this.inputData.title = 'Dateneingabe';
    }
    if ((typeof this.inputData.saveButtonLabel === 'undefined') ||
      (this.inputData.saveButtonLabel.length === 0)) {
      this.inputData.saveButtonLabel = 'OK';
    }
    if ((typeof this.inputData.placeholder === 'undefined') ||
      (this.inputData.placeholder.length === 0)) {
      this.inputData.placeholder = 'Bitte eingeben';
    }
    if (!this.inputData.showCancel) {
      this.showCancel = false;
    }
  }
}

export interface SimpleInputDialogData {
  title: string;
  prompt: string;
  placeholder: string;
  saveButtonLabel: string;
  value: string;
  showCancel: boolean;
}
