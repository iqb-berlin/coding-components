import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose
} from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatTooltip } from '@angular/material/tooltip';
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

interface SolverExpressionExample {
  expression: string;
  descriptionKey: string;
}

interface SolverVariableReference {
  sourceId: string;
  hasFragmentIndex: boolean;
  emptyPolicy?: string;
  nonNumericPolicy?: string;
}

const SOLVER_VARIABLE_PREFIX = '$';
const SOLVER_VARIABLE_REFERENCE_PATTERN =
  /\$\{\s*([\w,-]+)(?:\s*\[\s*(\d+)\s*])?(?:\s*:([^}:]*))?(?:\s*:([^}:]*))?\s*}/g;

@Component({
  templateUrl: 'edit-source-parameters-dialog.component.html',
  styles: [`
    .solver-expression-field {
      width: 100%;
    }

    .solver-expression-help {
      background: #f5f7ff;
      border-left: 4px solid #3f51b5;
      border-radius: 4px;
      color: rgb(0 0 0 / 82%);
      margin: -8px 0 8px;
      max-width: 640px;
      padding: 12px 14px;
    }

    .solver-expression-help__header {
      align-items: center;
      display: flex;
      gap: 8px;
      font-weight: 500;
    }

    .solver-expression-help__icon {
      color: #3f51b5;
      font-size: 20px;
      height: 20px;
      width: 20px;
    }

    .solver-expression-help p {
      margin: 8px 0;
    }

    .solver-expression-help ul {
      margin: 6px 0 10px;
      padding-left: 20px;
    }

    .solver-expression-help li {
      margin-bottom: 4px;
    }

    .solver-expression-help code {
      background: rgb(0 0 0 / 6%);
      border-radius: 3px;
      overflow-wrap: anywhere;
      padding: 1px 4px;
      white-space: normal;
    }

    .solver-expression-help__link {
      align-items: center;
      display: inline-flex;
      gap: 4px;
    }

    .solver-expression-help__link mat-icon {
      font-size: 16px;
      height: 16px;
      width: 16px;
    }

    .solver-source-menu__item {
      justify-content: flex-start;
    }

    .solver-source-menu__reference {
      color: rgb(0 0 0 / 60%);
      font-size: 12px;
      margin-left: 8px;
    }

    .solver-source-warning {
      align-items: flex-start;
      background: #fff8e1;
      border-left: 4px solid #ff8f00;
      border-radius: 4px;
      color: #5f3f00;
      display: flex;
      gap: 8px;
      margin: -8px 0 12px;
      max-width: 640px;
      padding: 10px 14px;
    }

    .solver-source-warning mat-icon {
      color: #f57c00;
      flex: 0 0 auto;
      font-size: 20px;
      height: 20px;
      width: 20px;
    }
  `,
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
  `],
  standalone: true,
  imports: [
    MatSelectTrigger,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButton,
    MatIconButton,
    MatDialogClose,
    TranslateModule,
    FormsModule,
    MatFormField,
    MatInput,
    MatCheckbox,
    MatLabel,
    MatSelect,
    MatOption,
    MatSuffix,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    MatTooltip,
    KeyValuePipe,
    NgForOf,
    ReactiveFormsModule,
    NgIf,
    MatIcon
  ]
})
export class EditSourceParametersDialog {
  readonly solverExpressionDocsUrl =
    'https://mathjs.org/docs/expressions/syntax.html';

  readonly solverExpressionExamples: SolverExpressionExample[] = [
    {
      expression: '1 + 2 * 3',
      descriptionKey: 'derive-processing.solver-help.examples.arithmetic'
    },
    {
      expression: `${SOLVER_VARIABLE_PREFIX}{Punkte} + ${SOLVER_VARIABLE_PREFIX}{Bonus}`,
      descriptionKey: 'derive-processing.solver-help.examples.variables'
    },
    {
      expression: `round(${SOLVER_VARIABLE_PREFIX}{Punkte} / ` +
        `${SOLVER_VARIABLE_PREFIX}{MaxPunkte} * 100, 1)`,
      descriptionKey: 'derive-processing.solver-help.examples.function'
    },
    {
      expression: `${SOLVER_VARIABLE_PREFIX}{Punkte} >= 5 ? 1 : 0`,
      descriptionKey: 'derive-processing.solver-help.examples.condition'
    }
  ];

  readonly solverVariablePrefix = SOLVER_VARIABLE_PREFIX;

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

  get solverSourceWarning(): string | null {
    const missingSourceLabels = this.getMissingSolverSourceIds()
      .map(sourceId => this.getSourceLabel(sourceId));

    if (missingSourceLabels.length < 1) return null;

    return `${this.tr(
      'derive-processing.solver-source-warning.unselected-sources'
    )}: ${missingSourceLabels.join(', ')}`;
  }

  updatePossibleNewSources(): void {
    const codingScheme = this.schemerService.codingScheme;

    if (!codingScheme) return;

    const validCodings = codingScheme.variableCodings.filter(
      (variableCoding: VariableCodingData) => (
        !this.isOwnVariable(variableCoding) &&
        variableCoding.sourceType !== 'BASE_NO_VALUE' &&
        !this.isDerivedFromSelf(variableCoding, codingScheme.variableCodings)
      )
    );

    this.possibleNewSources = new Map(
      validCodings.map(variableCoding => [
        variableCoding.id,
        variableCoding.alias || variableCoding.id
      ])
    );

    const possibleSourceIds = new Set(this.possibleNewSources.keys());
    this.data.deriveSources = this.data.deriveSources.filter(
      sourceId => possibleSourceIds.has(sourceId)
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

  insertSolverSourceReference(
    source: { id: string; label: string },
    input: HTMLInputElement
  ): void {
    const reference = this.getSolverVariableReference(
      source.label || source.id
    );
    const expression = this.data.sourceParameters.solverExpression || '';
    const selectionStart = input.selectionStart ?? expression.length;
    const selectionEnd = input.selectionEnd ?? selectionStart;

    this.data.sourceParameters.solverExpression =
      `${expression.slice(0, selectionStart)}${reference}${
        expression.slice(selectionEnd)
      }`;

    this.clearSolverTestResult();

    const cursorPosition = selectionStart + reference.length;
    window.setTimeout(() => {
      input.focus();
      input.setSelectionRange(cursorPosition, cursorPosition);
    });
  }

  getSolverSourceReference(source: { id: string; label: string }): string {
    return this.getSolverVariableReference(source.label || source.id);
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
    const solverReferences = EditSourceParametersDialog.getSolverReferences(
      expression,
      variableCodings
    );
    const referencedVariables = EditSourceParametersDialog
      .getReferencedSolverVariables(solverReferences);
    const missingSources = this.getMissingSolverSourceIds(referencedVariables);

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

    const invalidNumericSources = [
      ...new Set(
        solverReferences
          .filter(reference => this.isInvalidSolverTestValue(reference))
          .map(reference => reference.sourceId)
      )
    ];

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

  private getMissingSolverSourceIds(referencedVariables?: string[]): string[] {
    if (this.data.sourceType !== 'SOLVER') return [];

    const expression = this.data.sourceParameters.solverExpression || '';
    if (!expression.trim()) return [];

    const solverReferences = referencedVariables ||
      EditSourceParametersDialog.getReferencedSolverVariables(
        EditSourceParametersDialog.getSolverReferences(
          expression,
          this.getVariableCodingsForSolverTest()
        )
      );

    return solverReferences.filter(
      variableId => !this.data.deriveSources.includes(variableId)
    );
  }

  private static getSolverReferences(
    expression: string,
    variableCodings: VariableCodingData[]
  ): SolverVariableReference[] {
    const variableIdsByAlias = new Map(
      variableCodings
        .filter(coding => Boolean(coding.alias))
        .map(coding => [coding.alias as string, coding.id])
    );

    return Array.from(
      expression.matchAll(SOLVER_VARIABLE_REFERENCE_PATTERN)
    )
      .map(match => ({
        sourceId: variableIdsByAlias.get(match[1]) || match[1],
        hasFragmentIndex: typeof match[2] !== 'undefined',
        emptyPolicy: match[3],
        nonNumericPolicy: match[4]
      }));
  }

  private static getReferencedSolverVariables(
    references: SolverVariableReference[]
  ): string[] {
    return [...new Set(references.map(reference => reference.sourceId))];
  }

  private isInvalidSolverTestValue(
    reference: SolverVariableReference
  ): boolean {
    if (reference.hasFragmentIndex) return false;

    const value = this.solverTestValues[reference.sourceId] || '';
    if (CodingFactory.getValueAsNumber(value) !== null) return false;

    const policy = value.trim() ?
      reference.nonNumericPolicy :
      reference.emptyPolicy;
    if (typeof policy === 'undefined') return true;

    const trimmedPolicy = policy.trim();
    return trimmedPolicy.toUpperCase() !== 'INC' &&
      CodingFactory.getValueAsNumber(trimmedPolicy) === null;
  }

  private getSourceLabel(sourceId: string): string {
    const sourceAlias = this.schemerService.getVariableAliasById(sourceId);
    return this.possibleNewSources.get(sourceId) ||
      (sourceAlias === '?' ? sourceId : sourceAlias);
  }

  private isOwnVariable(variableCoding: VariableCodingData): boolean {
    return this.getSelfReferenceKeys([variableCoding]).some(
      selfReference => (
        variableCoding.id === selfReference ||
        variableCoding.alias === selfReference
      )
    );
  }

  private isDerivedFromSelf(
    variableCoding: VariableCodingData,
    variableCodings: VariableCodingData[]
  ): boolean {
    const selfReferenceKeys = new Set(this.getSelfReferenceKeys(variableCodings));
    if (selfReferenceKeys.size < 1) return false;

    const codingsByReference = new Map<string, VariableCodingData>();
    variableCodings.forEach(coding => {
      codingsByReference.set(coding.id, coding);
      if (coding.alias) codingsByReference.set(coding.alias, coding);
    });

    const visited = new Set<string>();
    const sourcesToCheck = [...(variableCoding.deriveSources || [])];

    while (sourcesToCheck.length > 0) {
      const sourceReference = sourcesToCheck.pop();
      if (sourceReference) {
        if (selfReferenceKeys.has(sourceReference)) return true;

        const sourceCoding = codingsByReference.get(sourceReference);
        if (sourceCoding && !visited.has(sourceCoding.id)) {
          if (
            selfReferenceKeys.has(sourceCoding.id) ||
            (sourceCoding.alias && selfReferenceKeys.has(sourceCoding.alias))
          ) {
            return true;
          }

          visited.add(sourceCoding.id);
          sourcesToCheck.push(...(sourceCoding.deriveSources || []));
        }
      }
    }

    return false;
  }

  private getSelfReferenceKeys(
    variableCodings: VariableCodingData[]
  ): string[] {
    const selfReferences = new Set<string>();
    if (this.data.selfId) selfReferences.add(this.data.selfId);
    if (this.data.selfAlias) selfReferences.add(this.data.selfAlias);

    const selfCoding = variableCodings.find(
      coding => (
        (this.data.selfId && coding.id === this.data.selfId) ||
        (this.data.selfAlias && (
          coding.id === this.data.selfAlias ||
          coding.alias === this.data.selfAlias
        ))
      )
    );

    if (selfCoding) {
      selfReferences.add(selfCoding.id);
      if (selfCoding.alias) selfReferences.add(selfCoding.alias);
    }

    return Array.from(selfReferences);
  }

  private static formatSolverTestValue(value: unknown): string {
    if (typeof value === 'string') return value;
    return JSON.stringify(value) || '';
  }

  private getSolverVariableReference(variableName: string): string {
    return `${this.solverVariablePrefix}{${variableName}}`;
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
