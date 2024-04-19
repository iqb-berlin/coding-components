import {
  Component, OnInit, Inject, ViewChild
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { MatSelectionList, MatListOption } from '@angular/material/list';
import { TranslateModule } from '@ngx-translate/core';
import { MatButton } from '@angular/material/button';


@Component({
    template: `
      <h4 mat-dialog-title>{{ selectData.title }}</h4>
      <mat-dialog-content>
        @if (selectData.prompt) {
          {{selectData.prompt}}
        }
        <mat-selection-list #variables multiple="false">
          @for (v of selectData.variables; track v) {
            <mat-list-option [value]="v">
              {{v}}
            </mat-list-option>
          }
        </mat-selection-list>
      </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-raised-button color="primary" [disabled]="variables.selectedOptions.selected.length <= 0"
      (click)="okButtonClick()">{{ selectData.okButtonLabel }}</button>
      <button mat-raised-button [mat-dialog-close]="false">{{'dialog-cancel' | translate}}</button>
    </mat-dialog-actions>
    `,
    standalone: true,
    imports: [MatDialogTitle, MatDialogContent, MatSelectionList, MatListOption, MatDialogActions, MatButton, MatDialogClose, TranslateModule]
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
