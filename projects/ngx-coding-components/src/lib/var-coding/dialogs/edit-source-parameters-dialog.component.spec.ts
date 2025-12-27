import { EditSourceParametersDialog } from './edit-source-parameters-dialog.component';

describe('EditSourceParametersDialog', () => {
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

    const data = {
      selfId: options.selfId ?? 'v1',
      selfAlias: options.selfAlias ?? 'V1',
      sourceType: options.sourceType ?? 'COPY_VALUE',
      sourceParameters: baseSourceParameters,
      deriveSources: [...(options.deriveSources ?? [])]
    };

    const hasCodingSchemeOverride = Object.prototype.hasOwnProperty.call(options, 'codingScheme');
    const schemerService = {
      codingScheme: hasCodingSchemeOverride ?
        options.codingScheme :
        {
          variableCodings: [
            { id: 'v1', alias: 'V1', sourceType: 'BASE' },
            { id: 'v2', alias: 'V2', sourceType: 'DERIVE' },
            { id: 'v3', alias: 'V3', sourceType: 'BASE_NO_VALUE' }
          ]
        }
    } as unknown;

    return new EditSourceParametersDialog(data as unknown, schemerService as unknown);
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
    expect(dialog.possibleDeriveProcessing).toContain('TO_LOWER_CASE');

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

    dialog.alterProcessing('SORT' as unknown as Parameters<EditSourceParametersDialog['alterProcessing']>[0], true);
    expect((dialog.data as unknown as { sourceParameters: { processing: string[] } }).sourceParameters.processing).toEqual(['SORT']);

    dialog.alterProcessing('SORT' as unknown as Parameters<EditSourceParametersDialog['alterProcessing']>[0], true);
    expect((dialog.data as unknown as { sourceParameters: { processing: string[] } }).sourceParameters.processing).toEqual(['SORT']);

    dialog.alterProcessing('SORT' as unknown as Parameters<EditSourceParametersDialog['alterProcessing']>[0], false);
    expect((dialog.data as unknown as { sourceParameters: { processing: string[] } }).sourceParameters.processing).toEqual([]);
  });

  it('alterProcessing should do nothing when processing list is missing', () => {
    const dialog = createDialog({ sourceParameters: {} });

    dialog.alterProcessing('SORT' as unknown as Parameters<EditSourceParametersDialog['alterProcessing']>[0], true);

    expect((dialog.data as unknown as { sourceParameters: { processing: string[] } }).sourceParameters.processing).toEqual(['SORT']);
  });

  it('updateDeriveSources should copy selectedSources value into data.deriveSources', () => {
    const dialog = createDialog({ deriveSources: [] });

    dialog.selectedSources.setValue(['v2']);
    dialog.updateDeriveSources();

    expect((dialog.data as unknown as { deriveSources: string[] }).deriveSources).toEqual(['v2']);
  });

  it('toggleAllSelection should select all possibleNewSources keys', () => {
    const dialog = createDialog({});

    dialog.toggleAllSelection();

    expect(dialog.selectedSources.value).toEqual(['v2']);
  });
});
