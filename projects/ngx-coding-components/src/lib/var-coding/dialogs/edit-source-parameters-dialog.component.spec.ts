import { SourceType, VariableSourceParameters, SourceProcessingType } from
  '@iqbspecs/coding-scheme/coding-scheme.interface';
import { TranslateService } from '@ngx-translate/core';
import { fakeAsync, tick } from '@angular/core/testing';
import { EditSourceParametersDialog, EditSourceParametersDialogData } from './edit-source-parameters-dialog.component';
import { SchemerService } from '../../services/schemer.service';

describe('EditSourceParametersDialog', () => {
  const solverRef = (variableName: string): string => `\${${variableName}}`;

  const translations: Record<string, string> = {
    'derive-processing.solver-test.result': 'Ergebnis',
    'derive-processing.solver-test.error-expression-missing': 'Bitte einen Solver-Ausdruck eingeben.',
    'derive-processing.solver-test.error-sources-missing': 'Bitte mindestens eine Quellvariable auswählen.',
    'derive-processing.solver-test.error-unselected-source': 'Der Ausdruck verweist auf nicht ausgewählte Quelle(n)',
    'derive-processing.solver-test.error-invalid-value': 'Bitte numerischen Testwert prüfen',
    'derive-processing.solver-test.error-evaluation': 'Der Ausdruck konnte nicht ausgewertet werden.',
    'derive-processing.solver-source-warning.unselected-sources':
      'Warnung: Im Solver-Ausdruck referenzierte Variable(n) sind nicht als Quell-Variable(n) ausgewählt'
  };

  const createDialog = (options: {
    selfId?: string;
    selfAlias?: string;
    sourceType?: string;
    sourceParameters?: { processing?: string[]; solverExpression?: string };
    deriveSources?: string[];
    codingScheme?: { variableCodings: unknown[] } | null;
  }) => {
    const baseSourceParameters: { processing?: string[]; solverExpression?: string } = {};
    if (typeof options.sourceParameters?.solverExpression !== 'undefined') {
      baseSourceParameters.solverExpression = options.sourceParameters.solverExpression;
    }
    if (typeof options.sourceParameters?.processing !== 'undefined') {
      baseSourceParameters.processing = [...options.sourceParameters.processing];
    }

    const data: EditSourceParametersDialogData = {
      selfId: options.selfId ?? 'd1',
      selfAlias: options.selfAlias ?? 'V1',
      sourceType: (options.sourceType as SourceType) ?? 'COPY_VALUE',
      sourceParameters: baseSourceParameters as VariableSourceParameters,
      deriveSources: [...(options.deriveSources ?? [])]
    };

    const hasCodingSchemeOverride = Object.prototype.hasOwnProperty.call(options, 'codingScheme');
    const codingScheme = hasCodingSchemeOverride ?
      options.codingScheme :
      {
        variableCodings: [
          { id: 'v1', alias: 'V1', sourceType: 'BASE' },
          { id: 'v2', alias: 'V2', sourceType: 'DERIVE' },
          { id: 'v3', alias: 'V3', sourceType: 'BASE_NO_VALUE' }
        ]
      };
    const schemerService = {
      codingScheme,
      getVariableAliasById: (varId: string) => {
        const variableCoding = codingScheme?.variableCodings.find(
          variable => (variable as { id: string }).id === varId
        ) as { id: string; alias?: string } | undefined;
        return variableCoding?.alias || variableCoding?.id || '?';
      }
    } as unknown as SchemerService;

    const translateService = {
      instant: (key: string) => translations[key] || key
    } as unknown as TranslateService;

    return new EditSourceParametersDialog(
      data,
      schemerService,
      translateService
    );
  };

  it('should set newVariableMode when selfId is missing', () => {
    const dialog = createDialog({ selfId: '' });
    expect(dialog.newVariableMode).toBeTrue();
  });

  it('updatePossibleDeriveProcessing should set options based on sourceType', () => {
    const dialog = createDialog({ sourceType: 'CONCAT_CODE' });
    expect(dialog.possibleDeriveProcessing).toEqual(['SORT']);

    (dialog.data as unknown as { sourceType: string }).sourceType = 'UNIQUE_VALUES';
    dialog.updatePossibleDeriveProcessing();
    expect(dialog.possibleDeriveProcessing).toContain('TO_LOWER_CASE' as SourceProcessingType);

    (dialog.data as unknown as { sourceType: string }).sourceType = 'SOLVER';
    dialog.updatePossibleDeriveProcessing();
    expect(dialog.possibleDeriveProcessing).toEqual([]);
  });

  it('updatePossibleNewSources should exclude selfAlias and BASE_NO_VALUE and set selectedSources', () => {
    const dialog = createDialog({
      selfAlias: 'V1',
      deriveSources: ['v2']
    });

    expect(Array.from(dialog.possibleNewSources.keys())).toEqual(['v2']);
    expect(dialog.selectedSources.value).toEqual(['v2']);
  });

  it('updatePossibleNewSources should return early when codingScheme is missing', () => {
    const dialog = createDialog({ codingScheme: null });
    dialog.possibleNewSources = new Map([['x', 'X']]);

    dialog.updatePossibleNewSources();

    expect(Array.from(dialog.possibleNewSources.keys())).toEqual(['x']);
  });

  it('alterProcessing should add/remove entries when processing list exists', () => {
    const dialog = createDialog({ sourceParameters: { processing: [] } });

    dialog.alterProcessing('SORT' as SourceProcessingType, true);
    expect(dialog.data.sourceParameters.processing).toEqual(['SORT' as SourceProcessingType]);

    dialog.alterProcessing('SORT' as SourceProcessingType, true);
    expect(dialog.data.sourceParameters.processing).toEqual(['SORT' as SourceProcessingType]);

    dialog.alterProcessing('SORT' as SourceProcessingType, false);
    expect(dialog.data.sourceParameters.processing).toEqual([]);
  });

  it('alterProcessing should do nothing when processing list is missing', () => {
    const dialog = createDialog({ sourceParameters: {} });

    dialog.alterProcessing('SORT' as SourceProcessingType, true);

    expect(dialog.data.sourceParameters.processing).toEqual(['SORT' as SourceProcessingType]);
  });

  it('updateDeriveSources should copy selectedSources value into data.deriveSources', () => {
    const dialog = createDialog({ deriveSources: [] });

    dialog.selectedSources.setValue(['v2']);
    dialog.updateDeriveSources();

    expect(dialog.data.deriveSources).toEqual(['v2']);
  });

  it('toggleAllSelection should select all possibleNewSources keys', () => {
    const dialog = createDialog({});

    dialog.toggleAllSelection();

    expect(dialog.selectedSources.value).toEqual(['v2']);
    expect(dialog.data.deriveSources).toEqual(['v2']);
  });

  it('runSolverTest should evaluate the current expression with test values', () => {
    const dialog = createDialog({
      selfAlias: 'D',
      sourceType: 'SOLVER',
      sourceParameters: {
        solverExpression: `${solverRef('V1')} + ${solverRef('V2')}`
      },
      deriveSources: ['v1', 'v2']
    });

    dialog.solverTestValues['v1'] = '2';
    dialog.solverTestValues['v2'] = '3';
    dialog.runSolverTest();

    expect(dialog.solverTestResult).toEqual({
      type: 'success',
      message: 'Ergebnis: 5'
    });
  });

  it('runSolverTest should show missing selected sources for referenced variables', () => {
    const dialog = createDialog({
      selfAlias: 'D',
      sourceType: 'SOLVER',
      sourceParameters: {
        solverExpression: `${solverRef('V1')} + ${solverRef('V2')}`
      },
      deriveSources: ['v1']
    });

    dialog.solverTestValues['v1'] = '2';
    dialog.runSolverTest();

    expect(dialog.solverTestResult?.type).toBe('error');
    expect(dialog.solverTestResult?.message).toContain(
      'Der Ausdruck verweist auf nicht ausgewählte Quelle(n)'
    );
    expect(dialog.solverTestResult?.message).toContain('V2');
  });

  it('solverSourceWarning should show referenced variables that are not selected as sources', () => {
    const dialog = createDialog({
      selfAlias: 'D',
      sourceType: 'SOLVER',
      sourceParameters: {
        solverExpression: `${solverRef('V1')} + ${solverRef('V2')}`
      },
      deriveSources: ['v1']
    });

    expect(dialog.solverSourceWarning).toContain(
      'Warnung: Im Solver-Ausdruck referenzierte Variable(n)'
    );
    expect(dialog.solverSourceWarning).toContain('V2');
  });

  it('solverSourceWarning should update when expression or source selection changes', () => {
    const dialog = createDialog({
      selfAlias: 'D',
      sourceType: 'SOLVER',
      sourceParameters: { solverExpression: `${solverRef('V2')}` },
      deriveSources: ['v1']
    });

    expect(dialog.solverSourceWarning).toContain('V2');

    dialog.selectedSources.setValue(['v1', 'v2']);
    dialog.updateDeriveSources();
    expect(dialog.solverSourceWarning).toBeNull();

    dialog.data.sourceParameters.solverExpression = `${solverRef('V1')}`;
    dialog.selectedSources.setValue(['v2']);
    dialog.updateDeriveSources();
    expect(dialog.solverSourceWarning).toContain('V1');

    dialog.data.sourceParameters.solverExpression = '';
    expect(dialog.solverSourceWarning).toBeNull();
  });

  it('insertSolverSourceReference should insert the selected source at the cursor', fakeAsync(() => {
    const dialog = createDialog({
      selfAlias: 'D',
      sourceType: 'SOLVER',
      sourceParameters: { solverExpression: 'round( + 1)' },
      deriveSources: ['v1']
    });
    const input = document.createElement('input');
    input.value = dialog.data.sourceParameters.solverExpression || '';
    input.setSelectionRange(6, 6);

    dialog.insertSolverSourceReference({ id: 'v1', label: 'V1' }, input);
    tick();

    expect(dialog.data.sourceParameters.solverExpression).toBe(
      `round(${solverRef('V1')} + 1)`
    );
    expect(input.selectionStart).toBe(11);
    expect(input.selectionEnd).toBe(11);
  }));

  it('insertSolverSourceReference should replace the selected expression range', fakeAsync(() => {
    const dialog = createDialog({
      selfAlias: 'D',
      sourceType: 'SOLVER',
      sourceParameters: { solverExpression: '1 + placeholder' },
      deriveSources: ['v2']
    });
    const input = document.createElement('input');
    input.value = dialog.data.sourceParameters.solverExpression || '';
    input.setSelectionRange(4, 15);

    dialog.insertSolverSourceReference({ id: 'v2', label: 'V2' }, input);
    tick();

    expect(dialog.data.sourceParameters.solverExpression).toBe(
      `1 + ${solverRef('V2')}`
    );
    expect(dialog.solverTestResult).toBeNull();
  }));

  it('getSolverSourceReference should expose the inserted reference syntax', () => {
    const dialog = createDialog({
      selfAlias: 'D',
      sourceType: 'SOLVER',
      deriveSources: ['v1']
    });

    expect(dialog.getSolverSourceReference({ id: 'v1', label: 'V1' })).toBe(
      solverRef('V1')
    );
  });

  it('runSolverTest should report non-numeric test values', () => {
    const dialog = createDialog({
      selfAlias: 'D',
      sourceType: 'SOLVER',
      sourceParameters: { solverExpression: `${solverRef('V1')} + 1` },
      deriveSources: ['v1']
    });

    dialog.solverTestValues['v1'] = 'abc';
    dialog.runSolverTest();

    expect(dialog.solverTestResult?.type).toBe('error');
    expect(dialog.solverTestResult?.message).toContain(
      'Bitte numerischen Testwert prüfen'
    );
    expect(dialog.solverTestResult?.message).toContain('V1');
  });

  it('runSolverTest should report syntax and evaluation errors', () => {
    const dialog = createDialog({
      selfAlias: 'D',
      sourceType: 'SOLVER',
      sourceParameters: { solverExpression: `${solverRef('V1')} +` },
      deriveSources: ['v1']
    });

    dialog.solverTestValues['v1'] = '2';
    dialog.runSolverTest();

    expect(dialog.solverTestResult).toEqual({
      type: 'error',
      message: 'Der Ausdruck konnte nicht ausgewertet werden.'
    });
  });

  it('updateDeriveSources should keep solver test values aligned with selected sources', () => {
    const dialog = createDialog({
      selfAlias: 'D',
      sourceType: 'SOLVER',
      deriveSources: ['v1']
    });

    dialog.solverTestValues['v1'] = '4';
    dialog.solverTestResult = { type: 'success', message: 'Ergebnis: 4' };
    dialog.selectedSources.setValue(['v2']);
    dialog.updateDeriveSources();

    expect(dialog.data.deriveSources).toEqual(['v2']);
    expect(dialog.solverTestValues).toEqual({ v2: '' });
    expect(dialog.solverTestResult).toBeNull();
  });

  it('should provide solver expression help examples and docs link', () => {
    const dialog = createDialog({ sourceType: 'SOLVER' });
    const expressions = dialog.solverExpressionExamples.map(
      example => example.expression
    );

    expect(dialog.solverExpressionDocsUrl).toBe(
      'https://mathjs.org/docs/expressions/syntax.html'
    );
    expect(expressions).toContain('1 + 2 * 3');
    expect(expressions.some(expression => expression.includes('${'))).toBeTrue();
    expect(expressions.some(expression => expression.includes('round('))).toBeTrue();
    expect(expressions.some(
      expression => expression.includes('?') && expression.includes(':')
    )).toBeTrue();
  });
});
