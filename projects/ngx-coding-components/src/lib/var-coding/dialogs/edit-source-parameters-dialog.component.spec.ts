import { SourceType, VariableSourceParameters, SourceProcessingType } from
  '@iqbspecs/coding-scheme/coding-scheme.interface';
import { TranslateService } from '@ngx-translate/core';
import { fakeAsync, tick } from '@angular/core/testing';
import { EditSourceParametersDialog, EditSourceParametersDialogData } from './edit-source-parameters-dialog.component';
import { SchemerService } from '../../services/schemer.service';

describe('EditSourceParametersDialog', () => {
  const solverRef = (variableName: string): string => `\${${variableName}}`;
  const solverPolicies = [
    { token: 'ERROR', outcome: 'error' },
    { token: 'INC', outcome: 'incomplete' },
    { token: '5', outcome: 'success' }
  ] as const;

  const translations: Record<string, string> = {
    'derive-processing.solver-test.result': 'Ergebnis',
    'status-label.CODING_INCOMPLETE': 'Kodierung unvollständig',
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

  const expectSolverOutcome = (
    dialog: EditSourceParametersDialog,
    outcome: 'success' | 'incomplete' | 'error' | 'invalid',
    successValue = '5'
  ): void => {
    dialog.runSolverTest();

    if (outcome === 'success') {
      expect(dialog.solverTestResult).toEqual({
        type: 'success',
        message: `Ergebnis: ${successValue}`
      });
      return;
    }

    if (outcome === 'incomplete') {
      expect(dialog.solverTestResult).toEqual({
        type: 'incomplete',
        message: 'Ergebnis: Kodierung unvollständig'
      });
      return;
    }

    expect(dialog.solverTestResult?.type).toBe('error');
    if (outcome === 'invalid') {
      expect(dialog.solverTestResult?.message).toContain(
        'Bitte numerischen Testwert prüfen'
      );
    } else {
      expect(dialog.solverTestResult?.message).toBe(
        'Der Ausdruck konnte nicht ausgewertet werden.'
      );
    }
  };

  const createPolicyDialog = (
    reference: string,
    testValue: string,
    fragmenting?: string
  ): EditSourceParametersDialog => {
    const dialog = createDialog({
      selfAlias: 'D',
      sourceType: 'SOLVER',
      sourceParameters: { solverExpression: solverRef(reference) },
      deriveSources: ['v1'],
      codingScheme: {
        variableCodings: [
          {
            id: 'v1',
            alias: 'V1',
            sourceType: 'BASE',
            ...(typeof fragmenting === 'string' ? { fragmenting } : {})
          }
        ]
      }
    });
    dialog.solverTestValues['v1'] = testValue;
    return dialog;
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

  it('updatePossibleNewSources should exclude direct descendants of the current variable', () => {
    const dialog = createDialog({
      selfId: 'd1',
      selfAlias: 'D1',
      codingScheme: {
        variableCodings: [
          {
            id: 'base1', alias: 'BASE1', sourceType: 'BASE'
          },
          {
            id: 'd1', alias: 'D1', sourceType: 'DERIVE', deriveSources: ['base1']
          },
          {
            id: 'd2', alias: 'D2', sourceType: 'DERIVE', deriveSources: ['d1']
          },
          {
            id: 'd3', alias: 'D3', sourceType: 'DERIVE', deriveSources: ['base1']
          }
        ]
      }
    });

    expect(Array.from(dialog.possibleNewSources.keys()).sort()).toEqual([
      'base1',
      'd3'
    ]);
  });

  it('updatePossibleNewSources should exclude indirect descendants of the current variable', () => {
    const dialog = createDialog({
      selfId: 'd1',
      selfAlias: 'D1',
      codingScheme: {
        variableCodings: [
          {
            id: 'base1', alias: 'BASE1', sourceType: 'BASE'
          },
          {
            id: 'd1', alias: 'D1', sourceType: 'DERIVE', deriveSources: ['base1']
          },
          {
            id: 'd2', alias: 'D2', sourceType: 'DERIVE', deriveSources: ['d1']
          },
          {
            id: 'd3', alias: 'D3', sourceType: 'DERIVE', deriveSources: ['d2']
          },
          {
            id: 'd4', alias: 'D4', sourceType: 'DERIVE', deriveSources: ['base1']
          }
        ]
      }
    });

    expect(Array.from(dialog.possibleNewSources.keys()).sort()).toEqual([
      'base1',
      'd4'
    ]);
  });

  it('updatePossibleNewSources should prune selected sources that would create a cycle', () => {
    const dialog = createDialog({
      selfId: 'd1',
      selfAlias: 'D1',
      deriveSources: ['base1', 'd2'],
      codingScheme: {
        variableCodings: [
          {
            id: 'base1', alias: 'BASE1', sourceType: 'BASE'
          },
          {
            id: 'd1', alias: 'D1', sourceType: 'DERIVE', deriveSources: ['base1']
          },
          {
            id: 'd2', alias: 'D2', sourceType: 'DERIVE', deriveSources: ['d1']
          }
        ]
      }
    });

    expect(dialog.data.deriveSources).toEqual(['base1']);
    expect(dialog.selectedSources.value).toEqual(['base1']);
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

  it('solverSourceWarning should recognize indexed and policy-qualified references', () => {
    [
      solverRef('V2[0]'),
      solverRef('V2:0'),
      solverRef('V2[1]:INC:0')
    ].forEach(solverExpression => {
      const dialog = createDialog({
        selfAlias: 'D',
        sourceType: 'SOLVER',
        sourceParameters: { solverExpression },
        deriveSources: ['v1']
      });

      expect(dialog.solverSourceWarning).toContain('V2');

      const selectedDialog = createDialog({
        selfAlias: 'D',
        sourceType: 'SOLVER',
        sourceParameters: { solverExpression },
        deriveSources: ['v2']
      });

      expect(selectedDialog.solverSourceWarning).toBeNull();
    });
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

  it('solverSourceReferences should include references for each source fragment', () => {
    const dialog = createDialog({
      selfAlias: 'D',
      sourceType: 'SOLVER',
      deriveSources: ['v1'],
      codingScheme: {
        variableCodings: [
          {
            id: 'v1',
            alias: 'Bruch',
            sourceType: 'BASE',
            fragmenting: '^(\\d+)\\s*/\\s*(\\d+)$'
          }
        ]
      }
    });

    expect(dialog.solverSourceReferences.map(
      source => dialog.getSolverSourceReference(source)
    )).toEqual([
      solverRef('Bruch'),
      solverRef('Bruch[0]'),
      solverRef('Bruch[1]')
    ]);
  });

  it('solverSourceReferences should ignore invalid fragmenting patterns', () => {
    const dialog = createDialog({
      selfAlias: 'D',
      sourceType: 'SOLVER',
      deriveSources: ['v1'],
      codingScheme: {
        variableCodings: [
          {
            id: 'v1',
            alias: 'V1',
            sourceType: 'BASE',
            fragmenting: '('
          }
        ]
      }
    });

    expect(dialog.solverSourceReferences.map(
      source => dialog.getSolverSourceReference(source)
    )).toEqual([solverRef('V1')]);
  });

  it('solverSourceWarning should recognize fragment and policy references', () => {
    const dialog = createDialog({
      selfAlias: 'D',
      sourceType: 'SOLVER',
      sourceParameters: {
        solverExpression: `${solverRef('V1[0]:INC')} + ${solverRef('V2:0:INC')}`
      },
      deriveSources: ['v1']
    });

    expect(dialog.solverSourceWarning).toBe(
      'Warnung: Im Solver-Ausdruck referenzierte Variable(n) ' +
      'sind nicht als Quell-Variable(n) ausgewählt: V2'
    );
  });

  it('runSolverTest should evaluate fragment references from raw source values', () => {
    const dialog = createDialog({
      selfAlias: 'D',
      sourceType: 'SOLVER',
      sourceParameters: {
        solverExpression: solverRef('Bruch[0]:INC')
      },
      deriveSources: ['v1'],
      codingScheme: {
        variableCodings: [
          {
            id: 'v1',
            alias: 'Bruch',
            sourceType: 'BASE',
            fragmenting: '^(\\d+)\\s*/\\s*(\\d+)$'
          }
        ]
      }
    });

    dialog.solverTestValues['v1'] = '1/2';
    dialog.runSolverTest();

    expect(dialog.solverTestResult).toEqual({
      type: 'success',
      message: 'Ergebnis: 1'
    });
  });

  solverPolicies.forEach(emptyPolicy => {
    solverPolicies.forEach(nonNumericPolicy => {
      const policyLabel =
        `empty=${emptyPolicy.token}, nonNumeric=${nonNumericPolicy.token}`;
      const referencePolicies =
        `${emptyPolicy.token}:${nonNumericPolicy.token}`;

      it(`should apply whole-value empty policies (${policyLabel})`, () => {
        ['', '   '].forEach(testValue => {
          const dialog = createPolicyDialog(
            `V1:${referencePolicies}`,
            testValue
          );

          expectSolverOutcome(dialog, emptyPolicy.outcome);
        });
      });

      it(`should apply whole-value non-numeric policies (${policyLabel})`, () => {
        const dialog = createPolicyDialog(
          `V1:${referencePolicies}`,
          'abc'
        );
        const expectedOutcome = nonNumericPolicy.token === 'ERROR' ?
          'invalid' :
          nonNumericPolicy.outcome;

        expectSolverOutcome(dialog, expectedOutcome);
      });

      it(`should preserve whole numeric values (${policyLabel})`, () => {
        const dialog = createPolicyDialog(
          `V1:${referencePolicies}`,
          '7'
        );

        expectSolverOutcome(dialog, 'success', '7');
      });

      it(`should apply fragment empty policies (${policyLabel})`, () => {
        const dialog = createPolicyDialog(
          `V1[0]:${referencePolicies}`,
          '',
          '^(.*)$'
        );

        expectSolverOutcome(dialog, emptyPolicy.outcome);
      });

      it(`should apply fragment non-numeric policies (${policyLabel})`, () => {
        const dialog = createPolicyDialog(
          `V1[0]:${referencePolicies}`,
          'abc',
          '^(.*)$'
        );

        expectSolverOutcome(dialog, nonNumericPolicy.outcome);
      });

      it(`should preserve numeric fragment values (${policyLabel})`, () => {
        const dialog = createPolicyDialog(
          `V1[0]:${referencePolicies}`,
          '7',
          '^(.*)$'
        );

        expectSolverOutcome(dialog, 'success', '7');
      });

      it(`should apply empty policies to missing fragments (${policyLabel})`, () => {
        const dialog = createPolicyDialog(
          `V1[1]:${referencePolicies}`,
          '7',
          '^(\\d+)$'
        );

        expectSolverOutcome(dialog, emptyPolicy.outcome);
      });
    });
  });

  it('runSolverTest should support the shorthand empty policy syntax', () => {
    const defaultError = createPolicyDialog('V1:ERROR', '');
    expectSolverOutcome(defaultError, 'error');

    const incomplete = createPolicyDialog('V1:INC', '');
    expectSolverOutcome(incomplete, 'incomplete');

    const replacement = createPolicyDialog('V1:5', '');
    expectSolverOutcome(replacement, 'success');
  });

  it('runSolverTest should resolve ID and alias references together', () => {
    const dialog = createDialog({
      selfAlias: 'D',
      sourceType: 'SOLVER',
      sourceParameters: {
        solverExpression:
          `${solverRef('First[1]:ERROR:ERROR')} + ` +
          `${solverRef('v2:ERROR:4')}`
      },
      deriveSources: ['v1', 'v2'],
      codingScheme: {
        variableCodings: [
          {
            id: 'v1',
            alias: 'First',
            sourceType: 'BASE',
            fragmenting: '^([A-Z]+)-(\\d+)$'
          },
          {
            id: 'v2',
            alias: 'Second',
            sourceType: 'BASE'
          }
        ]
      }
    });

    dialog.solverTestValues['v1'] = 'ABC-12';
    dialog.solverTestValues['v2'] = 'abc';

    expectSolverOutcome(dialog, 'success', '16');
  });

  it('runSolverTest should handle whole and fragment references to one source', () => {
    const dialog = createDialog({
      selfAlias: 'D',
      sourceType: 'SOLVER',
      sourceParameters: {
        solverExpression:
          `${solverRef('V1[0]:ERROR:ERROR')} + ` +
          `${solverRef('V1:ERROR:5')}`
      },
      deriveSources: ['v1'],
      codingScheme: {
        variableCodings: [
          {
            id: 'v1',
            alias: 'V1',
            sourceType: 'BASE',
            fragmenting: '^(\\d+)$'
          }
        ]
      }
    });
    dialog.solverTestValues['v1'] = '7';

    expectSolverOutcome(dialog, 'success', '14');
  });

  it('solverSourceReferences should ignore non-capturing regex groups', () => {
    const dialog = createDialog({
      selfAlias: 'D',
      sourceType: 'SOLVER',
      deriveSources: ['v1'],
      codingScheme: {
        variableCodings: [
          {
            id: 'v1',
            alias: 'V1',
            sourceType: 'BASE',
            fragmenting: '^(?:prefix-)(\\d+)$'
          }
        ]
      }
    });

    expect(dialog.solverSourceReferences.map(
      source => dialog.getSolverSourceReference(source)
    )).toEqual([
      solverRef('V1'),
      solverRef('V1[0]')
    ]);
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

  it('runSolverTest should apply an empty-value policy', () => {
    const dialog = createDialog({
      selfAlias: 'D',
      sourceType: 'SOLVER',
      sourceParameters: { solverExpression: solverRef('V1:0') },
      deriveSources: ['v1']
    });

    dialog.solverTestValues['v1'] = '';
    dialog.runSolverTest();

    expect(dialog.solverTestResult).toEqual({
      type: 'success',
      message: 'Ergebnis: 0'
    });
  });

  it('runSolverTest should treat whitespace-only values as empty', () => {
    const dialog = createPolicyDialog('V1:0:ERROR', '   ');

    expectSolverOutcome(dialog, 'success', '0');
  });

  it('runSolverTest should apply a non-numeric-value policy', () => {
    const dialog = createDialog({
      selfAlias: 'D',
      sourceType: 'SOLVER',
      sourceParameters: { solverExpression: solverRef('V1:ERROR:5') },
      deriveSources: ['v1']
    });

    dialog.solverTestValues['v1'] = 'abc';
    dialog.runSolverTest();

    expect(dialog.solverTestResult).toEqual({
      type: 'success',
      message: 'Ergebnis: 5'
    });
  });

  it('runSolverTest should report an incomplete result for an empty-value INC policy', () => {
    const dialog = createDialog({
      selfAlias: 'D',
      sourceType: 'SOLVER',
      sourceParameters: { solverExpression: solverRef('V1:INC') },
      deriveSources: ['v1']
    });

    dialog.solverTestValues['v1'] = '';
    dialog.runSolverTest();

    expect(dialog.solverTestResult).toEqual({
      type: 'incomplete',
      message: 'Ergebnis: Kodierung unvollständig'
    });
  });

  it('runSolverTest should report an incomplete result for a non-numeric-value INC policy', () => {
    const dialog = createDialog({
      selfAlias: 'D',
      sourceType: 'SOLVER',
      sourceParameters: { solverExpression: solverRef('V1:ERROR:INC') },
      deriveSources: ['v1']
    });

    dialog.solverTestValues['v1'] = 'abc';
    dialog.runSolverTest();

    expect(dialog.solverTestResult).toEqual({
      type: 'incomplete',
      message: 'Ergebnis: Kodierung unvollständig'
    });
  });

  it('runSolverTest should evaluate a numeric fragment from a raw value', () => {
    const dialog = createDialog({
      selfAlias: 'D',
      sourceType: 'SOLVER',
      sourceParameters: { solverExpression: solverRef('V1[1]') },
      deriveSources: ['v1'],
      codingScheme: {
        variableCodings: [
          {
            id: 'v1',
            alias: 'V1',
            sourceType: 'BASE',
            fragmenting: '([A-Za-z]+)-(\\d+)'
          }
        ]
      }
    });

    dialog.solverTestValues['v1'] = 'ABC-7';
    dialog.runSolverTest();

    expect(dialog.solverTestResult).toEqual({
      type: 'success',
      message: 'Ergebnis: 7'
    });
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
    expect(dialog.solverPolicySyntax).toBe(
      solverRef('VAR[i]:emptyPolicy:nonNumericPolicy')
    );
    expect(expressions).toContain(solverRef('Bruch[0]:INC'));
    expect(expressions).toContain(solverRef('Summand:0:INC'));
  });
});
