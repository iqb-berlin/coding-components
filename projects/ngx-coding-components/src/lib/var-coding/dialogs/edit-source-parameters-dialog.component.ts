import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose
} from '@angular/material/dialog';
import { SourceProcessingType, SourceType } from '@iqb/responses';
import { TranslateModule } from '@ngx-translate/core';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatCheckbox } from '@angular/material/checkbox';
import { VariableSourceParameters } from '@iqb/responses/coding-interfaces';
import { MatOption, MatSelect, MatSelectTrigger } from '@angular/material/select';
import {
  KeyValue, KeyValuePipe, NgForOf, NgIf
} from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SchemerService, VARIABLE_NAME_CHECK_PATTERN } from '../../services/schemer.service';

export interface EditSourceParametersDialogData {
  selfId: string,
  selfAlias: string,
  sourceType: SourceType,
  sourceParameters: VariableSourceParameters;
  deriveSources: string[]
}

@Component({
  templateUrl: 'edit-source-parameters-dialog.component.html',
  standalone: true,
  imports: [MatSelectTrigger,
    MatDialogTitle, MatDialogContent, MatDialogActions, MatButton, MatDialogClose, TranslateModule,
    FormsModule, MatFormField, MatInput, MatCheckbox, MatLabel, MatSelect, MatOption,
    KeyValuePipe, NgForOf, ReactiveFormsModule, NgIf
  ]
})
export class EditSourceParametersDialog {
  sourceTypeList: SourceType[] =
    ['COPY_VALUE',
      'CONCAT_CODE',
      'SUM_CODE',
      'SUM_SCORE',
      'UNIQUE_VALUES',
      'SOLVER',
      'MANUAL'];

  possibleDeriveProcessing: SourceProcessingType[] = [];
  selectedSources = new FormControl();
  possibleNewSources: ReadonlyMap<string, string> = new Map([]);
  newVariableMode = false;
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: EditSourceParametersDialogData,
    public schemerService: SchemerService
  ) {
    this.newVariableMode = !this.data.selfId;
    const shadowProcessing: EditSourceParametersDialogData = {
      selfId: this.data.selfId,
      selfAlias: this.data.selfAlias,
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
        if (shadowProcessing.sourceParameters.processing) shadowProcessing.sourceParameters.processing.push(p);
      });
    }
    this.data.deriveSources.forEach(p => {
      shadowProcessing.deriveSources.push(p);
    });
    this.data = shadowProcessing;
    this.updatePossibleDeriveProcessing();
    this.updatePossibleNewSources();
  }

  updatePossibleNewSources() {
    if (this.schemerService.codingScheme) {
      this.possibleNewSources = new Map(this.schemerService.codingScheme.variableCodings
        .filter(v => !([this.data.selfAlias].includes(v.alias || v.id)) &&
          v.sourceType !== 'BASE_NO_VALUE')
        .map(v => [v.id, v.alias || v.id]));
      this.selectedSources.setValue(this.data.deriveSources);
    }
  }

  updatePossibleDeriveProcessing() {
    if (this.data.sourceType === 'BASE') {
      this.possibleDeriveProcessing = ['TAKE_DISPLAYED_AS_VALUE_CHANGED', 'TAKE_EMPTY_AS_VALID'];
    } else if (this.data.sourceType === 'UNIQUE_VALUES') {
      this.possibleDeriveProcessing = ['REMOVE_ALL_SPACES', 'REMOVE_DISPENSABLE_SPACES',
        'TO_NUMBER', 'TO_LOWER_CASE'];
    } else if (this.data.sourceType === 'CONCAT_CODE') {
      this.possibleDeriveProcessing = ['SORT'];
    } else {
      this.possibleDeriveProcessing = [];
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

  updateDeriveSources() {
    this.data.deriveSources = this.selectedSources.value;
  }

  toggleAllSelection() {
    this.selectedSources.setValue(Array.from(this.possibleNewSources.keys()));
  }

  // eslint-disable-next-line class-methods-use-this
  compareFn = (a: KeyValue<string, string>, b: KeyValue<string, string>): number => a.value.localeCompare(b.value);

  protected readonly VARIABLE_NAME_CHECK_PATTERN = VARIABLE_NAME_CHECK_PATTERN;
}
