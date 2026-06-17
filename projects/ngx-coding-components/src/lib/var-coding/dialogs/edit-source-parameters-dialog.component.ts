import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose
} from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
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
  VariableCodingData,
  VariableSourceParameters
} from '@iqbspecs/coding-scheme/coding-scheme.interface';
import { Response } from '@iqbspecs/response/response.interface';
import { CodingFactory, CodingSchemeFactory } from '@iqb/responses';
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

type SolverTestResult = {
  type: 'success' | 'error';
  message: string;
};

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
    MatIcon,
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
  ],
  styles: [
    `
      .solver-test-area {
        border-top: 1px solid rgba(0, 0, 0, 0.12);
        margin-top: 8px;
        padding-top: 16px;
      }

      .solver-test-header {
        align-items: center;
        display: flex;
        gap: 16px;
        justify-content: space-between;
        margin-bottom: 12px;
      }

      .solver-test-title {
        font-weight: 600;
      }

      .solver-test-values {
        display: grid;
        gap: 8px 12px;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      }

      .solver-test-result {
        border-radius: 4px;
        margin-top: 8px;
        padding: 8px 12px;
      }

      .solver-test-result-ok {
        background: #e8f5e9;
        color: #1b5e20;
      }

      .solver-test-result-error {
        background: #ffebee;
        color: #b71c1c;
      }

      .solver-test-hint {
        color: rgba(0, 0, 0, 0.6);
        margin-bottom: 8px;
      }
    `
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
  solverTestValues: Record<string, string> = {};
  solverTestResult: SolverTestResult | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: EditSourceParametersDialogData,
    public schemerService: SchemerService,
    private translateService: TranslateService
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

  get selectedSolverSources(): { id: string; label: string }[] {
    return (this.data.deriveSources || []).map(sourceId => ({
      id: sourceId,
      label: this.possibleNewSources.get(sourceId) || sourceId
    }));
  }

  updatePossibleNewSources(): void {
    const codingScheme = this.schemerService.codingScheme;

    if (!codingScheme) return;

    const validCodings = codingScheme.variableCodings.filter(
      (variableCoding: VariableCodingData) => {
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
    this.syncSolverTestValues();
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
    this.clearSolverTestResult();
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
    this.data.deriveSources = this.selectedSources.value || [];
    this.syncSolverTestValues();
    this.clearSolverTestResult();
  }

  toggleAllSelection() {
    this.selectedSources.setValue(Array.from(this.possibleNewSources.keys()));
    this.updateDeriveSources();
  }

  clearSolverTestResult(): void {
    this.solverTestResult = null;
  }

  runSolverTest(): void {
    this.updateDeriveSources();

    const expression = this.data.sourceParameters.solverExpression || '';
    if (!expression.trim()) {
      this.setSolverTestError(
        'derive-processing.solver-test.error-expression-missing'
      );
      return;
    }

    if (!this.data.deriveSources.length) {
      this.setSolverTestError(
        'derive-processing.solver-test.error-sources-missing'
      );
      return;
    }

    const variableCodings = this.getVariableCodingsForSolverTest();
    const referencedVariables = EditSourceParametersDialog.getReferencedSolverVariables(
      expression,
      variableCodings
    );
    const missingSources = referencedVariables.filter(
      variableId => !this.data.deriveSources.includes(variableId)
    );

    if (missingSources.length > 0) {
      this.solverTestResult = {
        type: 'error',
        message: `${this.tr(
          'derive-processing.solver-test.error-unselected-source'
        )}: ${missingSources.map(sourceId => this.getSourceLabel(sourceId))
          .join(', ')}`
      };
      return;
    }

    const invalidNumericSources = referencedVariables.filter(
      sourceId => CodingFactory.getValueAsNumber(
        this.solverTestValues[sourceId] || ''
      ) === null
    );

    if (invalidNumericSources.length > 0) {
      this.solverTestResult = {
        type: 'error',
        message: `${this.tr(
          'derive-processing.solver-test.error-invalid-value'
        )}: ${invalidNumericSources.map(sourceId => this.getSourceLabel(sourceId))
          .join(', ')}`
      };
      return;
    }

    try {
      const result = CodingSchemeFactory.deriveValue(
        variableCodings,
        this.getSolverTestCoding(),
        this.getSolverTestResponses()
      );

      if (result.status === 'VALUE_CHANGED') {
        this.solverTestResult = {
          type: 'success',
          message: `${this.tr('derive-processing.solver-test.result')}: ${
            EditSourceParametersDialog.formatSolverTestValue(result.value)
          }`
        };
        return;
      }
    } catch {
      // fall through to the shared error message
    }

    this.setSolverTestError(
      'derive-processing.solver-test.error-evaluation'
    );
  }

  private syncSolverTestValues(): void {
    const selectedSourceIds = new Set(this.data.deriveSources || []);
    const nextValues: Record<string, string> = {};

    selectedSourceIds.forEach(sourceId => {
      nextValues[sourceId] = this.solverTestValues[sourceId] || '';
    });

    this.solverTestValues = nextValues;
  }

  private getVariableCodingsForSolverTest(): VariableCodingData[] {
    const sourceCodings = this.schemerService.codingScheme?.variableCodings ||
      [];
    const solverCoding = this.getSolverTestCoding();
    const hasSelfCoding = sourceCodings.some(coding => coding.id === solverCoding.id);

    if (hasSelfCoding) {
      return sourceCodings.map(
        coding => (coding.id === solverCoding.id ? solverCoding : coding)
      );
    }

    return [...sourceCodings, solverCoding];
  }

  private getSolverTestCoding(): VariableCodingData {
    return {
      id: this.data.selfId || this.data.selfAlias || '__solver_test__',
      alias: this.data.selfAlias,
      sourceType: 'SOLVER',
      sourceParameters: {
        ...this.data.sourceParameters,
        processing: this.data.sourceParameters.processing || [],
        solverExpression: this.data.sourceParameters.solverExpression || ''
      },
      deriveSources: [...this.data.deriveSources]
    };
  }

  private getSolverTestResponses(): Response[] {
    return this.data.deriveSources.map(sourceId => ({
      id: sourceId,
      value: this.solverTestValues[sourceId] || '',
      status: 'VALUE_CHANGED'
    }));
  }

  private static getReferencedSolverVariables(
    expression: string,
    variableCodings: VariableCodingData[]
  ): string[] {
    const variableIdsByAlias = new Map(
      variableCodings
        .filter(coding => Boolean(coding.alias))
        .map(coding => [coding.alias as string, coding.id])
    );
    const references = Array.from(expression.matchAll(/\$\{(\s*[\w,-]+\s*)}/g))
      .map(match => match[1].trim())
      .map(variableName => variableIdsByAlias.get(variableName) ||
        variableName);

    return [...new Set(references)];
  }

  private getSourceLabel(sourceId: string): string {
    const sourceAlias = this.schemerService.getVariableAliasById(sourceId);
    return this.possibleNewSources.get(sourceId) ||
      (sourceAlias === '?' ? sourceId : sourceAlias);
  }

  private static formatSolverTestValue(value: unknown): string {
    if (typeof value === 'string') return value;
    return JSON.stringify(value) || '';
  }

  private setSolverTestError(translationKey: string): void {
    this.solverTestResult = {
      type: 'error',
      message: this.tr(translationKey)
    };
  }

  private tr(translationKey: string): string {
    return this.translateService.instant(translationKey) as string;
  }

  // eslint-disable-next-line class-methods-use-this
  compareFn = (
    a: KeyValue<string, string>,
    b: KeyValue<string, string>
  ): number => a.value.localeCompare(b.value);

  protected readonly VARIABLE_NAME_CHECK_PATTERN = VARIABLE_NAME_CHECK_PATTERN;
}
