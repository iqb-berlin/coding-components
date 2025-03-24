import { Component, OnInit, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose
} from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { MatButton } from '@angular/material/button';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatInput } from '@angular/material/input';
import { MatFormField } from '@angular/material/form-field';

@Component({
  template: `
    <h1 mat-dialog-title>{{ inputData.title }}</h1>

    <mat-dialog-content>
      @if (inputData.prompt) {
        <div class="prompt">{{inputData.prompt}}</div>
      }
      <mat-form-field>
        <input matInput [placeholder]="inputData.placeholder" [(ngModel)]="inputData.value">
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-raised-button color="primary" [mat-dialog-close]="inputData.value">
        {{ inputData.saveButtonLabel }}
      </button>
      @if (showCancel) {
        <button mat-raised-button [mat-dialog-close]="false">{{'dialog-cancel' | translate}}</button>
      }
    </mat-dialog-actions>
    `,
  standalone: true,
  styles: ['.prompt { padding-bottom: 20px;}'],
  imports: [
    MatDialogTitle, MatDialogContent, MatFormField, MatInput, ReactiveFormsModule, FormsModule,
    MatDialogActions, MatButton, MatDialogClose, TranslateModule
  ]
})

export class SimpleInputDialogComponent implements OnInit {
  showCancel = true;

  constructor(@Inject(MAT_DIALOG_DATA) public inputData: SimpleInputDialogData) {}

  ngOnInit(): void {
    this.inputData.title = this.inputData.title?.trim() || 'Dateneingabe';
    this.inputData.saveButtonLabel = this.inputData.saveButtonLabel?.trim() || 'OK';
    this.inputData.placeholder = this.inputData.placeholder?.trim() || 'Bitte eingeben';
    this.showCancel = this.inputData.showCancel;
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
