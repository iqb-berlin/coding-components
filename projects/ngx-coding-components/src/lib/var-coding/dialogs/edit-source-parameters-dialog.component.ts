import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose
} from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatCheckbox } from '@angular/material/checkbox';
import {
  MatOption,
  MatSelect,
  MatSelectTrigger
} from '@angular/material/select';
import {
  KeyValue, KeyValuePipe, NgForOf, NgIf
} from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  SourceProcessingType,
  SourceType,
  VariableSourceParameters
} from '@iqbspecs/coding-scheme/coding-scheme.interface';
import {
  SchemerService,
  VARIABLE_NAME_CHECK_PATTERN
} from '../../services/schemer.service';

export interface EditSourceParametersDialogData {
  selfId: string;
  selfAlias: string;
  sourceType: SourceType;
  sourceParameters: VariableSourceParameters;
  deriveSources: string[];
}

@Component({
  templateUrl: 'edit-source-parameters-dialog.component.html',
  standalone: true,
  imports: [
    MatSelectTrigger,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButton,
    MatDialogClose,
    TranslateModule,
    FormsModule,
    MatFormField,
    MatInput,
    MatCheckbox,
    MatLabel,
    MatSelect,
    MatOption,
    KeyValuePipe,
    NgForOf,
    ReactiveFormsModule,
    NgIf
  ]
})
export class EditSourceParametersDialog {
  sourceTypeList: SourceType[] = [
    'COPY_VALUE',
    'CONCAT_CODE',
    'SUM_CODE',
    'SUM_SCORE',
    'UNIQUE_VALUES',
    'SOLVER',
    'MANUAL'
  ];

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
      ...this.data,
      sourceType: this.data.sourceType,
      sourceParameters: {
        ...this.data.sourceParameters,
        solverExpression: this.data.sourceParameters.solverExpression,
        processing: [...(this.data.sourceParameters.processing || [])]
      },
      deriveSources: [...this.data.deriveSources]
    };

    this.data = shadowProcessing;

    this.updatePossibleDeriveProcessing();
    this.updatePossibleNewSources();
  }

  updatePossibleNewSources(): void {
    const codingScheme = this.schemerService.codingScheme;

    if (!codingScheme) return;

    const validCodings = codingScheme.variableCodings.filter(
      (variableCoding: any) => {
        const aliasOrId = variableCoding.alias || variableCoding.id;
        return (
          aliasOrId !== this.data.selfAlias &&
          variableCoding.sourceType !== 'BASE_NO_VALUE'
        );
      }
    );

    this.possibleNewSources = new Map(
      validCodings.map(variableCoding => [
        variableCoding.id,
        variableCoding.alias || variableCoding.id
      ])
    );

    this.selectedSources.setValue(this.data.deriveSources);
  }

  updatePossibleDeriveProcessing(): void {
    const processingOptions: Record<string, SourceProcessingType[]> = {
      BASE: [
        'TAKE_DISPLAYED_AS_VALUE_CHANGED',
        'TAKE_NOT_REACHED_AS_VALUE_CHANGED',
        'TAKE_EMPTY_AS_VALID'
      ],
      UNIQUE_VALUES: [
        'REMOVE_ALL_SPACES',
        'REMOVE_DISPENSABLE_SPACES',
        'TO_NUMBER',
        'TO_LOWER_CASE'
      ],
      CONCAT_CODE: ['SORT']
    };

    this.possibleDeriveProcessing =
      processingOptions[this.data.sourceType] || [];
  }

  alterProcessing(processingId: SourceProcessingType, checked: boolean): void {
    const processingList = this.data.sourceParameters.processing;
    if (!processingList) return;

    const processIndex = processingList.indexOf(processingId);

    if (checked && processIndex === -1) {
      processingList.push(processingId);
      return;
    }

    if (!checked && processIndex !== -1) {
      processingList.splice(processIndex, 1);
    }
  }

  updateDeriveSources() {
    this.data.deriveSources = this.selectedSources.value;
  }

  toggleAllSelection() {
    this.selectedSources.setValue(Array.from(this.possibleNewSources.keys()));
  }

  // eslint-disable-next-line class-methods-use-this
  compareFn = (
    a: KeyValue<string, string>,
    b: KeyValue<string, string>
  ): number => a.value.localeCompare(b.value);

  protected readonly VARIABLE_NAME_CHECK_PATTERN = VARIABLE_NAME_CHECK_PATTERN;
}
