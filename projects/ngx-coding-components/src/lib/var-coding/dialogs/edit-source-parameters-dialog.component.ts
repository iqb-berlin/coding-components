import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose
} from '@angular/material/dialog';
import { SourceProcessingType, SourceType } from '@iqb/responses';
import { TranslateModule } from '@ngx-translate/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatCheckbox } from '@angular/material/checkbox';
import { VariableSourceParameters } from '@iqb/responses/coding-interfaces';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatChip, MatChipListbox, MatChipRemove } from '@angular/material/chips';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatIcon } from '@angular/material/icon';
import { KeyValuePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SchemerService, VARIABLE_NAME_CHECK_PATTERN } from '../../services/schemer.service';
import { VariableAliasPipe } from '../../pipes/variable-alias.pipe';

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
  imports: [
    MatDialogTitle, MatDialogContent, MatDialogActions, MatButton, MatDialogClose, TranslateModule,
    FormsModule, MatFormField, MatInput, MatCheckbox, MatLabel, MatSelect, MatOption, MatChipRemove,
    MatMenu, MatChip, MatMenuTrigger, MatIcon, MatIconButton, MatMenuItem, VariableAliasPipe,
    KeyValuePipe, MatChipListbox
  ]
})
export class EditSourceParametersDialog {
  sourceTypeList: SourceType[] = ['COPY_VALUE', 'CONCAT_CODE', 'SUM_CODE', 'SUM_SCORE', 'UNIQUE_VALUES', 'SOLVER'];
  possibleDeriveProcessing: SourceProcessingType[] = [];
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
        .filter(v => !([...this.data.deriveSources, this.data.selfId].includes(v.id)) && v.sourceType === 'BASE')
        .sort()
        .map(v => [v.id, v.alias || v.id]));
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

  deleteDeriveSource(varId: string) {
    const sourcePos = this.data.deriveSources.indexOf(varId);
    if (sourcePos >= 0) this.data.deriveSources.splice(sourcePos, 1);
    this.updatePossibleNewSources();
  }

  addDeriveSource(varId: string) {
    this.data.deriveSources.push(varId);
    this.data.deriveSources.sort();
    this.updatePossibleNewSources();
  }

  protected readonly VARIABLE_NAME_CHECK_PATTERN = VARIABLE_NAME_CHECK_PATTERN;
}
