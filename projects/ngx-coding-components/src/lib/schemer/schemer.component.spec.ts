import { CodingSchemeFactory, CodingSchemeProblem } from '@iqb/responses';
import { CodingFactory } from '@iqb/responses/coding-factory';
import { VariableCodingData } from '@iqbspecs/coding-scheme/coding-scheme.interface';
import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';
import { of } from 'rxjs';
import { MessageDialogComponent } from '../dialogs/message-dialog.component';
import { FileService } from '../services/file.service';
import { SchemerComponent } from './schemer.component';

class FakeTranslateService {
  instant(key: string): string {
    return key;
  }
}

class FakeMatDialog {
  afterClosedValue: unknown = false;

  open = jasmine.createSpy('open').and.callFake(() => ({
    afterClosed: () => of(this.afterClosedValue)
  }));
}

describe('SchemerComponent', () => {
  let component: SchemerComponent;

  let translate: FakeTranslateService;
  let schemerService: {
    codingScheme: { variableCodings: VariableCodingData[] } | null;
    varList: VariableInfo[];
    allVariableIds: string[];
    userRole: 'RO' | 'RW_MINIMAL' | 'RW_MAXIMAL';
    setCodingScheme: (v: unknown) => void;
    setVarList: (v: unknown) => void;
    setUserRole: (v: unknown) => void;
    checkRenamedVarAliasOk: (alias: string, id?: string) => boolean;
  };

  let schemerFacade: {
    tryResolveVarListDuplicates: jasmine.Spy;
    varListDuplicatesResolved$: { subscribe: () => { unsubscribe: () => void } };
  };

  let dialog: FakeMatDialog;
  let messageDialog: FakeMatDialog;
  let selectVariableDialog: FakeMatDialog;
  let inputDialog: FakeMatDialog;
  let editSourceParametersDialog: FakeMatDialog;

  beforeEach(() => {
    translate = new FakeTranslateService();
    dialog = new FakeMatDialog();
    messageDialog = new FakeMatDialog();
    selectVariableDialog = new FakeMatDialog();
    inputDialog = new FakeMatDialog();
    editSourceParametersDialog = new FakeMatDialog();

    schemerService = {
      codingScheme: null,
      varList: [],
      allVariableIds: [],
      userRole: 'RW_MAXIMAL',
      setCodingScheme: (v: unknown) => {
        schemerService.codingScheme = v as unknown as never;
      },
      setVarList: (v: unknown) => {
        schemerService.varList = (v as unknown as VariableInfo[]) || [];
      },
      setUserRole: (v: unknown) => {
        schemerService.userRole = v as unknown as never;
      },
      checkRenamedVarAliasOk: () => true
    };

    schemerFacade = {
      tryResolveVarListDuplicates: jasmine.createSpy('tryResolveVarListDuplicates').and.returnValue(false),
      varListDuplicatesResolved$: { subscribe: () => ({ unsubscribe: () => undefined }) }
    };

    component = new SchemerComponent(
      translate as unknown as never,
      schemerService as unknown as never,
      schemerFacade as unknown as never,
      messageDialog as unknown as never,
      dialog as unknown as never,
      dialog as unknown as never,
      selectVariableDialog as unknown as never,
      editSourceParametersDialog as unknown as never,
      inputDialog as unknown as never
    );
  });

  it('updateVariableLists should return early if schemerFacade wants to resolve duplicates', () => {
    schemerFacade.tryResolveVarListDuplicates.and.returnValue(true);

    schemerService.setVarList([
      {
        id: 'v1', type: 'string', format: '', multiple: false, nullable: false, values: [], valuePositionLabels: []
      } as unknown as VariableInfo
    ]);
    schemerService.setCodingScheme({ variableCodings: [] } as unknown as never);

    const validateSpy = spyOn(CodingSchemeFactory, 'validate').and.returnValue([] as unknown as CodingSchemeProblem[]);

    component.updateVariableLists();

    expect(validateSpy).not.toHaveBeenCalled();
  });

  it('updateVariableLists should remove orphan empty BASE variables not in varList', () => {
    const orphanEmptyBase: VariableCodingData = {
      id: 'orphan',
      alias: 'orphan',
      sourceType: 'BASE',
      label: 'orphan',
      codeModel: 'MANUAL_AND_RULES',
      manualInstruction: '',
      codes: [],
      processing: []
    } as unknown as VariableCodingData;

    const keepBase: VariableCodingData = {
      id: 'keep',
      alias: 'keep',
      sourceType: 'BASE',
      label: 'keep',
      codeModel: 'MANUAL_AND_RULES',
      manualInstruction: '',
      codes: [{
        id: 1, type: 'FULL_CREDIT', label: '', score: 1
      }]
    } as unknown as VariableCodingData;

    schemerService.setVarList([
      {
        id: 'keep',
        alias: 'Keep',
        type: 'string',
        format: '',
        multiple: false,
        nullable: false,
        values: [],
        valuePositionLabels: []
      } as unknown as VariableInfo
    ]);
    schemerService.setCodingScheme({ variableCodings: [orphanEmptyBase, keepBase] } as unknown as never);

    spyOn(CodingSchemeFactory, 'validate').and.returnValue([] as unknown as CodingSchemeProblem[]);

    component.updateVariableLists();

    const ids = (schemerService.codingScheme?.variableCodings || []).map(v => v.id);
    expect(ids).toContain('keep');
    expect(ids).not.toContain('orphan');
  });

  it('updateVariableLists should add missing BASE variables for varList entries and sync aliases', () => {
    schemerService.setVarList([
      {
        id: 'a',
        alias: 'AA',
        type: 'string',
        format: '',
        multiple: false,
        nullable: false,
        values: [],
        valuePositionLabels: [],
        valuesComplete: true,
        page: ''
      } as unknown as VariableInfo,
      {
        id: 'b',
        alias: '',
        type: 'string',
        format: '',
        multiple: false,
        nullable: false,
        values: [],
        valuePositionLabels: [],
        valuesComplete: true,
        page: ''
      } as unknown as VariableInfo
    ]);
    schemerService.setCodingScheme({ variableCodings: [] } as unknown as never);

    const createSpy = spyOn(CodingFactory, 'createCodingVariable').and.callFake((id: string) => ({
      id,
      sourceType: 'BASE',
      alias: ''
    }) as unknown as VariableCodingData);

    spyOn(CodingSchemeFactory, 'validate').and.returnValue([] as unknown as CodingSchemeProblem[]);

    component.updateVariableLists();

    expect(createSpy).toHaveBeenCalledWith('a');
    expect(createSpy).toHaveBeenCalledWith('b');

    const scheme = schemerService.codingScheme as unknown as { variableCodings: VariableCodingData[] };
    const a = scheme.variableCodings.find(v => v.id === 'a') as VariableCodingData;
    const b = scheme.variableCodings.find(v => v.id === 'b') as VariableCodingData;

    expect(a.alias).toBe('AA');
    expect(b.alias).toBe('b');
  });

  it('updateVariableLists should compute codingStatus ERROR/WARNING based on validate() problems', () => {
    const schemeVars: VariableCodingData[] = [
      {
        id: 'v1', alias: 'A', sourceType: 'BASE', codes: []
      } as unknown as VariableCodingData,
      {
        id: 'v2', alias: 'B', sourceType: 'BASE', codes: []
      } as unknown as VariableCodingData
    ];

    schemerService.setVarList([
      {
        id: 'v1',
        alias: 'A',
        type: 'string',
        format: '',
        multiple: false,
        nullable: false,
        values: [],
        valuePositionLabels: []
      } as unknown as VariableInfo,
      {
        id: 'v2',
        alias: 'B',
        type: 'string',
        format: '',
        multiple: false,
        nullable: false,
        values: [],
        valuePositionLabels: []
      } as unknown as VariableInfo
    ]);
    schemerService.setCodingScheme({ variableCodings: schemeVars } as unknown as never);

    const problems: CodingSchemeProblem[] = [
      { variableId: 'A', breaking: true } as unknown as CodingSchemeProblem,
      { variableId: 'B', breaking: false } as unknown as CodingSchemeProblem
    ];

    spyOn(CodingSchemeFactory, 'validate').and.returnValue(problems);

    component.updateVariableLists();

    expect(component.codingStatus['v1']).toBe('ERROR');
    expect(component.codingStatus['v2']).toBe('WARNING');
  });

  it('updateVariableLists should handle validate() throwing and set problems to []', () => {
    schemerService.setVarList([
      {
        id: 'v1',
        alias: 'A',
        type: 'string',
        format: '',
        multiple: false,
        nullable: false,
        values: [],
        valuePositionLabels: []
      } as unknown as VariableInfo
    ]);
    schemerService.setCodingScheme({
      variableCodings: [{
        id: 'v1', alias: 'A', sourceType: 'BASE', codes: []
      } as unknown as VariableCodingData]
    } as unknown as never);

    spyOn(CodingSchemeFactory, 'validate').and.throwError('boom');

    component.updateVariableLists();

    expect(component.problems).toEqual([]);
    expect(component.codingStatus['v1']).toBe('OK');
  });

  it('renameVarScheme should open error dialog when selected variable is BASE', () => {
    component.selectedCoding$.next({ id: 'v1', alias: 'A', sourceType: 'BASE' } as unknown as VariableCodingData);

    component.renameVarScheme();

    expect(messageDialog.open).toHaveBeenCalled();
    expect(messageDialog.open.calls.mostRecent().args[0]).toBe(MessageDialogComponent);
  });

  it('renameVarScheme should set alias and emit scheme change when dialog returns value and check passes', () => {
    const emitSpy = spyOn(component.codingSchemeChanged, 'emit');
    schemerService.setCodingScheme({
      variableCodings: [{
        id: 'd1', alias: 'Old', sourceType: 'DERIVE', codes: []
      } as unknown as VariableCodingData]
    } as unknown as never);

    const selected = (schemerService.codingScheme as unknown as
      { variableCodings: VariableCodingData[] }).variableCodings[0];
    component.selectedCoding$.next(selected);

    inputDialog.afterClosedValue = 'NewAlias';
    (schemerService as unknown as { checkRenamedVarAliasOk: (a: string, id?: string) => boolean })
      .checkRenamedVarAliasOk = () => true;

    spyOn(CodingSchemeFactory, 'validate').and.returnValue([] as unknown as CodingSchemeProblem[]);

    component.renameVarScheme();

    expect(selected.alias).toBe('NewAlias');
    expect(emitSpy).toHaveBeenCalled();
  });

  it('renameVarScheme should show error when alias duplicate', () => {
    schemerService.setCodingScheme({
      variableCodings: [{
        id: 'd1', alias: 'Old', sourceType: 'DERIVE', codes: []
      } as unknown as VariableCodingData]
    } as unknown as never);

    const selected = (schemerService.codingScheme as unknown as
      { variableCodings: VariableCodingData[] }).variableCodings[0];
    component.selectedCoding$.next(selected);

    inputDialog.afterClosedValue = 'DupAlias';
    (schemerService as unknown as { checkRenamedVarAliasOk: () => boolean }).checkRenamedVarAliasOk = () => false;

    component.renameVarScheme();

    expect(messageDialog.open).toHaveBeenCalled();
    expect(messageDialog.open.calls.mostRecent().args[0]).toBe(MessageDialogComponent);
  });

  it('exportVariable should show info dialog when no scheme', async () => {
    schemerService.setCodingScheme({ variableCodings: [] } as unknown as never);
    await component.exportVariable();
    expect(messageDialog.open).toHaveBeenCalled();
    expect(messageDialog.open.calls.mostRecent().args[0]).toBe(MessageDialogComponent);
  });

  it('exportVariable should not save when selection dialog returns empty', async () => {
    spyOn(FileService, 'saveToFile');
    schemerService.setCodingScheme({
      variableCodings: [{
        id: 'v1', alias: 'A', sourceType: 'BASE', codes: []
      } as unknown as VariableCodingData]
    } as unknown as never);

    selectVariableDialog.afterClosedValue = [];
    await component.exportVariable();
    expect(FileService.saveToFile).not.toHaveBeenCalled();
  });

  it('exportVariable should save selected variable when chosen', async () => {
    const saveSpy = spyOn(FileService, 'saveToFile');
    schemerService.setCodingScheme({
      variableCodings: [{
        id: 'v1', alias: 'A', sourceType: 'BASE', codes: []
      } as unknown as VariableCodingData]
    } as unknown as never);

    selectVariableDialog.afterClosedValue = ['A'];
    await component.exportVariable();

    expect(saveSpy).toHaveBeenCalled();
    const args0 = saveSpy.calls.mostRecent().args[0] as string;
    expect(args0).toContain('iqb-variable-export');
  });

  it('importVariable should return early for RO', async () => {
    schemerService.userRole = 'RO';
    const loadSpy = spyOn(FileService, 'loadFile');
    await component.importVariable();
    expect(loadSpy).not.toHaveBeenCalled();
  });

  it('importVariable should show error when no scheme', async () => {
    schemerService.userRole = 'RW_MAXIMAL';
    schemerService.setCodingScheme(null);
    await component.importVariable();
    expect(messageDialog.open).toHaveBeenCalled();
    expect(messageDialog.open.calls.mostRecent().args[0]).toBe(MessageDialogComponent);
  });

  it('importVariable should show error on invalid file format', async () => {
    schemerService.userRole = 'RW_MAXIMAL';
    schemerService.setCodingScheme({ variableCodings: [] } as unknown as never);
    spyOn(FileService, 'loadFile').and.resolveTo('{"foo":1}');

    await component.importVariable();
    expect(messageDialog.open).toHaveBeenCalled();
    expect(messageDialog.open.calls.mostRecent().args[0]).toBe(MessageDialogComponent);
  });

  it('importVariable should overwrite existing var only when confirmed', async () => {
    schemerService.userRole = 'RW_MAXIMAL';
    schemerService.setCodingScheme({
      variableCodings: [{
        id: 'v1', alias: 'A', sourceType: 'BASE', codes: []
      } as unknown as VariableCodingData]
    } as unknown as never);

    const payload = {
      type: 'iqb-variable-export',
      version: 1,
      variableCoding: {
        id: 'v1', alias: 'A2', sourceType: 'BASE', codes: []
      }
    };
    spyOn(FileService, 'loadFile').and.resolveTo(JSON.stringify(payload));

    // cancel overwrite
    messageDialog.afterClosedValue = false;
    await component.importVariable();
    expect((schemerService.codingScheme as unknown as { variableCodings: VariableCodingData[] })
      .variableCodings[0].alias).toBe('A');

    // confirm replacement
    messageDialog.afterClosedValue = true;
    spyOn(CodingSchemeFactory, 'validate').and.returnValue([] as unknown as CodingSchemeProblem[]);
    await component.importVariable();
    expect((schemerService.codingScheme as unknown as { variableCodings: VariableCodingData[] })
      .variableCodings[0].alias).toBe('A2');
  });

  it('addVarScheme should show error when alias duplicate', () => {
    schemerService.userRole = 'RW_MAXIMAL';
    schemerService.setCodingScheme({ variableCodings: [] } as unknown as never);
    (schemerService as unknown as { checkRenamedVarAliasOk: () => boolean }).checkRenamedVarAliasOk = () => false;

    editSourceParametersDialog.afterClosedValue = {
      selfAlias: 'DUP',
      sourceType: 'SUM_SCORE',
      sourceParameters: { processing: [], solverExpression: '' },
      deriveSources: []
    };

    component.addVarScheme();
    expect(messageDialog.open).toHaveBeenCalled();
    expect(messageDialog.open.calls.mostRecent().args[0]).toBe(MessageDialogComponent);
  });

  it('addVarScheme should add new var scheme when ok', () => {
    schemerService.userRole = 'RW_MAXIMAL';
    schemerService.setCodingScheme({ variableCodings: [] } as unknown as never);
    (schemerService as unknown as { checkRenamedVarAliasOk: () => boolean }).checkRenamedVarAliasOk = () => true;
    spyOn(CodingSchemeFactory, 'validate').and.returnValue([] as unknown as CodingSchemeProblem[]);

    editSourceParametersDialog.afterClosedValue = {
      selfAlias: 'NEW',
      sourceType: 'SUM_SCORE',
      sourceParameters: { processing: [], solverExpression: '' },
      deriveSources: []
    };

    component.addVarScheme();

    const scheme = schemerService.codingScheme as unknown as { variableCodings: VariableCodingData[] };
    expect(scheme.variableCodings.some(v => v.alias === 'NEW')).toBeTrue();
  });

  it('isEmptyCoding should return false when label differs from id', () => {
    const schemerComponentPrivate = SchemerComponent as unknown as {
      isEmptyCoding: (coding: VariableCodingData) => boolean;
    };
    const coding = { id: 'x', label: 'Label', sourceType: 'BASE' } as unknown as VariableCodingData;
    expect(schemerComponentPrivate.isEmptyCoding(coding)).toBeFalse();
  });

  it('isEmptyCoding should return false when processing/fragmenting/codes are present', () => {
    const schemerComponentPrivate = SchemerComponent as unknown as {
      isEmptyCoding: (coding: VariableCodingData) => boolean;
    };

    expect(schemerComponentPrivate.isEmptyCoding({
      id: 'x',
      label: 'x',
      sourceType: 'BASE',
      processing: ['SORT_ARRAY']
    } as unknown as VariableCodingData)).toBeFalse();

    expect(schemerComponentPrivate.isEmptyCoding({
      id: 'x',
      label: 'x',
      sourceType: 'BASE',
      fragmenting: 'f'
    } as unknown as VariableCodingData)).toBeFalse();

    expect(schemerComponentPrivate.isEmptyCoding({
      id: 'x',
      label: 'x',
      sourceType: 'BASE',
      codes: [{
        id: 1, type: 'FULL_CREDIT', label: '', score: 1
      }]
    } as unknown as VariableCodingData)).toBeFalse();
  });

  it('isEmptyCoding should return false when manualInstruction is non-empty', () => {
    const schemerComponentPrivate = SchemerComponent as unknown as {
      isEmptyCoding: (coding: VariableCodingData) => boolean;
    };

    expect(schemerComponentPrivate.isEmptyCoding({
      id: 'x',
      label: 'x',
      sourceType: 'BASE',
      codeModel: 'MANUAL_AND_RULES',
      manualInstruction: 'something'
    } as unknown as VariableCodingData)).toBeFalse();
  });

  it('isEmptyCoding should return false when codeModel is not MANUAL_AND_RULES', () => {
    const schemerComponentPrivate = SchemerComponent as unknown as {
      isEmptyCoding: (coding: VariableCodingData) => boolean;
    };

    expect(schemerComponentPrivate.isEmptyCoding({
      id: 'x',
      label: 'x',
      sourceType: 'BASE',
      codeModel: 'AUTO'
    } as unknown as VariableCodingData)).toBeFalse();
  });

  it('isEmptyCoding should return true for minimal empty coding', () => {
    const schemerComponentPrivate = SchemerComponent as unknown as {
      isEmptyCoding: (coding: VariableCodingData) => boolean;
    };

    expect(schemerComponentPrivate.isEmptyCoding({
      id: 'x',
      label: 'x',
      sourceType: 'BASE',
      codeModel: 'MANUAL_AND_RULES',
      manualInstruction: '',
      codes: [],
      processing: []
    } as unknown as VariableCodingData)).toBeTrue();
  });

  it('importVariable should add new variable when id does not exist', async () => {
    const emitSpy = spyOn(component.codingSchemeChanged, 'emit');
    const updateSpy = spyOn(component, 'updateVariableLists');

    schemerService.userRole = 'RW_MAXIMAL';
    schemerService.setCodingScheme({ variableCodings: [] } as unknown as never);
    const payload = {
      type: 'iqb-variable-export',
      version: 1,
      variableCoding: {
        id: 'new1', alias: 'NEW1', sourceType: 'BASE', codes: []
      }
    };
    spyOn(FileService, 'loadFile').and.resolveTo(JSON.stringify(payload));
    spyOn(CodingSchemeFactory, 'validate').and.returnValue([] as unknown as CodingSchemeProblem[]);

    await component.importVariable();

    const scheme = schemerService.codingScheme as unknown as { variableCodings: VariableCodingData[] };
    expect(scheme.variableCodings.some(v => v.id === 'new1')).toBeTrue();
    expect(updateSpy).toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalled();
  });

  it('addVarScheme should do nothing if role is RO or scheme is missing', () => {
    schemerService.userRole = 'RO';
    schemerService.setCodingScheme({ variableCodings: [] } as unknown as never);
    component.addVarScheme();
    expect(editSourceParametersDialog.open).not.toHaveBeenCalled();

    schemerService.userRole = 'RW_MAXIMAL';
    schemerService.setCodingScheme(null);
    component.addVarScheme();
    expect(editSourceParametersDialog.open).not.toHaveBeenCalled();
  });

  it('addVarScheme should do nothing when dialog result is false', () => {
    schemerService.userRole = 'RW_MAXIMAL';
    schemerService.setCodingScheme({ variableCodings: [] } as unknown as never);

    const emitSpy = spyOn(component.codingSchemeChanged, 'emit');
    const updateSpy = spyOn(component, 'updateVariableLists');

    editSourceParametersDialog.afterClosedValue = false;
    component.addVarScheme();

    expect(emitSpy).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('deleteVarScheme should remove selected variables and emit', () => {
    const emitSpy = spyOn(component.codingSchemeChanged, 'emit');
    const updateSpy = spyOn(component, 'updateVariableLists');

    schemerService.setCodingScheme({
      variableCodings: [
        {
          id: 'v1', alias: 'A', sourceType: 'BASE', codes: []
        } as unknown as VariableCodingData,
        {
          id: 'd1', alias: 'D', sourceType: 'DERIVE', codes: []
        } as unknown as VariableCodingData
      ]
    } as unknown as never);

    component.codingStatus = { v1: 'OK', d1: 'OK' };
    component.selectedCoding$
      .next((schemerService.codingScheme as unknown as { variableCodings: VariableCodingData[] }).variableCodings[1]);

    selectVariableDialog.afterClosedValue = ['D'];
    spyOn(CodingSchemeFactory, 'validate').and.returnValue([] as unknown as CodingSchemeProblem[]);

    component.deleteVarScheme();

    const scheme = schemerService.codingScheme as unknown as { variableCodings: VariableCodingData[] };
    expect(scheme.variableCodings.some(v => v.id === 'd1')).toBeFalse();
    expect(component.selectedCoding$.getValue()).toBeNull();
    expect(updateSpy).toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalled();
  });

  it('copyVarScheme should clone selected coding into target variable and emit', () => {
    const emitSpy = spyOn(component.codingSchemeChanged, 'emit');
    const updateSpy = spyOn(component, 'updateVariableLists');

    const selected: VariableCodingData = {
      id: 's1',
      alias: 'S',
      sourceType: 'DERIVE',
      codes: [{
        id: 1, type: 'FULL_CREDIT', label: 'x', score: 1
      }]
    } as unknown as VariableCodingData;

    const target: VariableCodingData = {
      id: 't1',
      alias: 'T',
      sourceType: 'DERIVE',
      codes: []
    } as unknown as VariableCodingData;

    schemerService.setCodingScheme({ variableCodings: [selected, target] } as unknown as never);
    component.selectedCoding$.next(selected);

    selectVariableDialog.afterClosedValue = ['T'];
    spyOn(CodingSchemeFactory, 'validate').and.returnValue([] as unknown as CodingSchemeProblem[]);

    component.copyVarScheme();

    const scheme = schemerService.codingScheme as unknown as { variableCodings: VariableCodingData[] };
    const updatedTarget = scheme.variableCodings.find(v => v.id === 't1') as unknown as { codes: unknown[] };
    expect(updatedTarget.codes.length).toBe(1);
    expect(updateSpy).toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalled();
  });

  it('activateBaseNoValueVars should switch selected BASE_NO_VALUE vars to BASE and emit', () => {
    const emitSpy = spyOn(component.codingSchemeChanged, 'emit');
    const updateSpy = spyOn(component, 'updateVariableLists');

    schemerService.setCodingScheme({
      variableCodings: [
        {
          id: 'n1', alias: 'N1', sourceType: 'BASE_NO_VALUE', codes: []
        } as unknown as VariableCodingData
      ]
    } as unknown as never);
    schemerService.setVarList([]);

    selectVariableDialog.afterClosedValue = ['N1'];
    spyOn(CodingSchemeFactory, 'validate').and.returnValue([] as unknown as CodingSchemeProblem[]);

    component.activateBaseNoValueVars();

    const scheme = schemerService.codingScheme as unknown as { variableCodings: VariableCodingData[] };
    expect(scheme.variableCodings.find(v => v.id === 'n1')?.sourceType).toBe('BASE');
    expect(schemerService.varList.some(v => v.id === 'n1')).toBeTrue();
    expect(updateSpy).toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalled();
  });

  it('showCodingScheme should do nothing when codingScheme is null', () => {
    schemerService.setCodingScheme(null);
    component.showCodingScheme();
    expect(dialog.open).not.toHaveBeenCalled();
  });
});
