import {
  Component, OnInit, Inject, ViewChild
} from '@angular/core';
import {
  MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose
} from '@angular/material/dialog';
import { MatSelectionList, MatListOption } from '@angular/material/list';
import { TranslateModule } from '@ngx-translate/core';
import { MatButton } from '@angular/material/button';
import { VariableCodingData } from '@iqb/responses';

@Component({
  template: `
      <h4 mat-dialog-title>{{ selectData.title }}</h4>
      <mat-dialog-content>
        @if (selectData.variables.length === 0) {
          {{'dialog-no-variables' | translate}}
        } @else if (selectData.prompt) {
          {{selectData.prompt}}
        }
        <mat-selection-list #variables multiple="true">
          @for (v of selectData.variables; track v) {
            <mat-list-option [value]="v.alias">
              <div class="fx-row-start-start">
                @if(selectData.codingStatus){
                  @if(selectData.codingStatus[v.id] === 'OK') {
                    <div>&nbsp;&nbsp;</div>
                  } @else {
                    <div
                      [class]="(this.selectData.codingStatus[v.id] === 'WARNING' ? 'problem-warning' : 'problem-error')"
                      [style.text-align]="'center'">
                      &nbsp;
                    </div>
                  }
                }
                {{v.alias}}
              </div>
            </mat-list-option>
          }
        </mat-selection-list>
      </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-raised-button color="primary"
        [disabled]="!variables || getSelected().length === 0"
        (click)="okButtonClick()">{{ selectData.okButtonLabel }}
      </button>
      <button mat-raised-button
        [mat-dialog-close]=[]>{{'dialog-cancel' | translate}}
      </button>
    </mat-dialog-actions>
    `,
  styles: [
    '.problem-warning {background-color: #ffcc00; margin-right: 5px}',
    '.problem-error {background-color: #ff3300; margin-right: 5px}'
  ],
  standalone: true,
  imports: [MatDialogTitle,
    MatDialogContent,
    MatSelectionList,
    MatListOption,
    MatDialogActions,
    MatButton,
    MatDialogClose,
    TranslateModule]
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
    this.selectData.variables.sort((a, b) => a.alias.localeCompare(b.alias));
    setTimeout(() => {
      this.setSelectedValues();
    });
  }

  getSelected() : string[] {
    if (this.variablesElement && this.variablesElement.selectedOptions) {
      if (this.variablesElement.selectedOptions.selected.length > 0) {
        return this.variablesElement.selectedOptions.selected.map(o => o.value);
      }
    }
    return [];
  }

  okButtonClick() {
    const selectedOptions = this.variablesElement?.selectedOptions.selected;
    this.dialogRef.close(selectedOptions?.map(o => o.value));
  }

  private setSelectedValues() {
    if (this.variablesElement && this.selectData.selectedVariable) {
      this.variablesElement.options.forEach((option: MatListOption) => {
        if (option.value === this.selectData.selectedVariable?.alias) {
          option.selected = true;
        }
      });
    }
  }
}

export interface SelectVariableDialogData {
  title: string;
  prompt: string;
  variables: VariableCodingData[];
  selectedVariable: VariableCodingData | null;
  codingStatus: { [id: string]: string; },
  okButtonLabel: string;
}
