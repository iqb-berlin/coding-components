import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { CodingFactory } from '@iqb/responses/coding-factory';
import { ResolveIdentifierConflictsDialogComponent } from '../dialogs/resolve-identifier-conflicts-dialog.component';
import { SchemerFacadeService } from './schemer-facade.service';
import { SchemerService } from './schemer.service';
import { analyzeVariableIdentifiers } from './schemer-identifier-validation';
import { ResolveOrphanCodingsDialogComponent } from '../dialogs/resolve-orphan-codings-dialog.component';

describe('SchemerFacadeService', () => {
  let schemerService: SchemerService;
  let dialog: MatDialog;

  beforeEach(() => {
    schemerService = new SchemerService();
    dialog = {
      open: jasmine.createSpy('open')
    } as unknown as MatDialog;
  });

  const createService = () => new SchemerFacadeService(schemerService, dialog);

  const prepareRecovery = (textType?: string) => {
    schemerService.setVarList([
      { id: 'current', alias: 'response', type: 'string' } as never,
      ...(textType ? [{ id: 'current-text', alias: 'text_1', type: textType } as never] : [])
    ]);
    schemerService.setCodingScheme({
      variableCodings: [
        {
          id: 'previous', alias: 'response', sourceType: 'BASE', codes: [{ id: 1, score: 2 }]
        },
        {
          id: 'derived', alias: 'result', sourceType: 'COPY_VALUE', deriveSources: ['previous']
        }
      ]
    } as never);
    if (textType) {
      schemerService.codingScheme!.variableCodings.push({
        ...CodingFactory.createBaseCodingVariable('previous-text', 'BASE_NO_VALUE'), alias: 'text_1'
      });
    }
    const afterClosed = new Subject<unknown>();
    (dialog.open as jasmine.Spy).and.returnValue({
      close: jasmine.createSpy('close'),
      afterClosed: () => afterClosed.asObservable()
    });
    const service = createService();
    const changes = jasmine.createSpy('changes');
    service.identifierConflictChanges$.subscribe(changes);
    const before = JSON.stringify(schemerService.codingScheme);
    service.tryResolveIdentifierConflicts();
    return {
      service, afterClosed, changes, before
    };
  };

  it('shows the diagnostic dialog instead of offering a transfer that would fail on a retained source conflict', () => {
    const { service, afterClosed, changes } = prepareRecovery();
    afterClosed.next(undefined);
    schemerService.codingScheme!.variableCodings[0].deriveSources = ['old-text'];
    schemerService.codingScheme!.variableCodings.push({
      ...CodingFactory.createBaseCodingVariable('old-text', 'BASE_NO_VALUE'), alias: 'result'
    });
    const before = JSON.stringify(schemerService.codingScheme);
    service.resetIdentifierConflictResolutionState();
    service.tryResolveIdentifierConflicts();
    const call = (dialog.open as jasmine.Spy).calls.mostRecent();
    expect(call.args[0]).toBe(ResolveIdentifierConflictsDialogComponent);
    expect(call.args[1].data.recoveryProblems).toEqual([
      'Weitere ungültige Variablenbezeichner müssen zuerst an ihrer Quelle korrigiert werden.'
    ]);
    afterClosed.next({ decisions: ['TRANSFER'], discardedIds: [] });
    expect(JSON.stringify(schemerService.codingScheme)).toBe(before);
    expect(changes).not.toHaveBeenCalled();
  });

  describe('derived alias conflicts', () => {
    const prepareDerived = () => {
      schemerService.setVarList([{ id: 'new_mc', alias: '01', type: 'string' } as never]);
      const oldRow = { ...CodingFactory.createCodingVariable('old_row'), alias: '01a' };
      oldRow.codes = [{ id: 1, type: 'FULL_CREDIT', score: 2 }];
      schemerService.setCodingScheme({
        version: '3.5',
        variableCodings: [oldRow, {
          ...CodingFactory.createCodingVariable('derived'),
          alias: '01',
          sourceType: 'SUM_SCORE',
          deriveSources: ['old_row'],
          codes: [{ id: 1, type: 'FULL_CREDIT', score: 3 }]
        }]
      } as never);
      const afterClosed = new Subject<unknown>();
      (dialog.open as jasmine.Spy).and.returnValue({
        close: jasmine.createSpy('close'), afterClosed: () => afterClosed
      });
      const service = createService();
      const changes = jasmine.createSpy('changes');
      service.identifierConflictChanges$.subscribe(changes);
      service.tryResolveIdentifierConflicts();
      const data = (dialog.open as jasmine.Spy).calls.mostRecent().args[1].data;
      return {
        service, afterClosed, changes, data, before: structuredClone(schemerService.codingScheme)
      };
    };
    const rename = { derivedChanges: [{ id: 'derived', action: 'RENAME', alias: 'old_01' }], confirmDeletion: false };

    it('opens an editable derived-conflict dialog using a detached snapshot', () => {
      const { data, before } = prepareDerived();
      expect((dialog.open as jasmine.Spy).calls.mostRecent().args[0]).toBe(ResolveIdentifierConflictsDialogComponent);
      expect(data.canEdit()).toBeTrue();
      expect(data.variableCodings).toEqual(before!.variableCodings);
      data.variableCodings[1].codes = [];
      expect(schemerService.codingScheme).toEqual(before);
    });

    it('commits a rename exactly once and preserves all coding content', () => {
      const { afterClosed, changes, before } = prepareDerived();
      const host = structuredClone(schemerService.varList);
      afterClosed.next(rename);
      afterClosed.next(rename);
      expect(schemerService.codingScheme!.variableCodings).toEqual([
        before!.variableCodings[0], { ...before!.variableCodings[1], alias: 'old_01' }
      ]);
      expect(schemerService.varList).toEqual(host);
      expect(changes).toHaveBeenCalledOnceWith(true);
    });

    it('deletes only the explicitly confirmed derived variable', () => {
      const { afterClosed, changes, before } = prepareDerived();
      afterClosed.next({ derivedChanges: [{ id: 'derived', action: 'DELETE' }], confirmDeletion: true });
      expect(schemerService.codingScheme!.variableCodings).toEqual([before!.variableCodings[0]]);
      expect(changes).toHaveBeenCalledOnceWith(true);
    });

    [undefined, { derivedChanges: [{ id: 'old_row', action: 'DELETE' }], confirmDeletion: true },
      { derivedChanges: [{ id: 'derived', action: 'DELETE' }], confirmDeletion: false },
      { derivedChanges: [{ id: 'derived', action: 'RENAME', alias: 'bad.alias' }] }].forEach(result => {
      it(`leaves the scheme unchanged for cancellation or invalid requests: ${JSON.stringify(result)}`, () => {
        const { afterClosed, changes, before } = prepareDerived();
        afterClosed.next(result);
        expect(schemerService.codingScheme).toEqual(before);
        expect(changes).not.toHaveBeenCalled();
      });
    });

    it('rechecks write rights before applying derived changes', () => {
      const {
        afterClosed, data, changes, before
      } = prepareDerived();
      schemerService.setUserRole('RO');
      expect(data.canEdit()).toBeFalse();
      afterClosed.next(rename);
      expect(schemerService.codingScheme).toEqual(before);
      expect(changes).not.toHaveBeenCalled();
    });

    ['content', 'variables', 'replacement', 'reset'].forEach(update => {
      it(`rejects stale derived edits after a ${update} update`, () => {
        const { service, afterClosed, changes } = prepareDerived();
        if (update === 'content') schemerService.codingScheme!.variableCodings[1].manualInstruction = 'Later change';
        if (update === 'variables') schemerService.varList[0].alias = 'other';
        if (update === 'replacement') schemerService.setCodingScheme(structuredClone(schemerService.codingScheme));
        if (update === 'reset') service.resetIdentifierConflictResolutionState();
        const before = structuredClone(schemerService.codingScheme);
        afterClosed.next(rename);
        expect(schemerService.codingScheme).toEqual(before);
        if (update === 'reset') expect(changes).not.toHaveBeenCalled();
        else expect(changes).toHaveBeenCalledOnceWith(false);
      });
    });
  });

  ['no-value', 'NO_VALUE'].forEach(type => {
    (['TRANSFER', 'START_EMPTY', undefined] as const).forEach(decision => {
      it(`resolves the combined text/radio facade case with ${type} and ${decision || 'cancel'}`, () => {
        const { afterClosed, changes, before } = prepareRecovery(type);
        const variables = JSON.stringify(schemerService.varList);
        expect((dialog.open as jasmine.Spy).calls.mostRecent().args[0]).toBe(ResolveOrphanCodingsDialogComponent);
        expect((dialog.open as jasmine.Spy).calls.mostRecent().args[1].data.conflicts.length).toBe(1);
        expect(JSON.stringify(schemerService.codingScheme)).toBe(before);
        afterClosed.next(decision ? { decisions: [decision], discardedIds: [] } : undefined);
        afterClosed.complete();
        if (decision) {
          expect(changes).toHaveBeenCalledOnceWith(true);
          expect(schemerService.codingScheme!.variableCodings.map(coding => coding.id))
            .not.toContain('previous-text');
          expect(schemerService.codingScheme!.variableCodings.find(coding => coding.id === 'current-text'))
            .toEqual(jasmine.objectContaining({ sourceType: 'BASE_NO_VALUE', alias: 'text_1', codes: [] }));
          expect(schemerService.codingScheme!.variableCodings.find(coding => coding.id === 'current')?.codes)
            .toEqual(decision === 'TRANSFER' ? [{ id: 1, score: 2 }] : []);
        } else {
          expect(changes).not.toHaveBeenCalled();
          expect(JSON.stringify(schemerService.codingScheme)).toBe(before);
        }
        expect(JSON.stringify(schemerService.varList)).toBe(variables);
      });
    });
  });

  it('offers explicit recovery for one orphan and commits a transfer exactly once', () => {
    const { afterClosed, changes } = prepareRecovery();
    expect((dialog.open as jasmine.Spy).calls.mostRecent().args[0]).toBe(ResolveOrphanCodingsDialogComponent);
    expect(schemerService.codingScheme?.variableCodings[0].id).toBe('previous');
    afterClosed.next({ decisions: ['TRANSFER'], discardedIds: [] });
    afterClosed.complete();
    expect(schemerService.codingScheme?.variableCodings.map(coding => coding.id)).toEqual(['derived', 'current']);
    expect(schemerService.codingScheme?.variableCodings[0].deriveSources).toEqual(['current']);
    expect(changes).toHaveBeenCalledOnceWith(true);
  });

  it('cancels recovery without changing or emitting a scheme', () => {
    const { afterClosed, changes, before } = prepareRecovery();
    afterClosed.next(undefined);
    afterClosed.complete();
    expect(JSON.stringify(schemerService.codingScheme)).toBe(before);
    expect(changes).not.toHaveBeenCalled();
  });

  it('preserves derived codings and their old source when starting empty', () => {
    const { afterClosed, changes } = prepareRecovery();
    afterClosed.next({ decisions: ['START_EMPTY'], discardedIds: [] });
    expect(schemerService.codingScheme?.variableCodings[0].deriveSources).toEqual(['previous']);
    expect(schemerService.codingScheme?.variableCodings.find(coding => coding.id === 'current')?.codes).toEqual([]);
    expect(changes).toHaveBeenCalledOnceWith(true);
  });

  it('rechecks read-only rights at commit time', () => {
    const { afterClosed, changes, before } = prepareRecovery();
    const data = (dialog.open as jasmine.Spy).calls.mostRecent().args[1].data;
    expect(data.canEdit()).toBeTrue();
    schemerService.setUserRole('RO');
    expect(data.canEdit()).toBeFalse();
    afterClosed.next({ decisions: ['TRANSFER'], discardedIds: [] });
    expect(JSON.stringify(schemerService.codingScheme)).toBe(before);
    expect(changes).not.toHaveBeenCalled();
  });

  it('rejects a stale choice even when only coding content changed', () => {
    const { afterClosed, changes } = prepareRecovery();
    schemerService.codingScheme!.variableCodings[0].manualInstruction = 'A later host update';
    const updated = JSON.stringify(schemerService.codingScheme);
    afterClosed.next({ decisions: ['TRANSFER'], discardedIds: [] });
    expect(JSON.stringify(schemerService.codingScheme)).toBe(updated);
    expect(changes).toHaveBeenCalledOnceWith(false);
  });

  it('rejects a choice from a replaced scheme with otherwise identical contents', () => {
    const { afterClosed, changes, before } = prepareRecovery();
    schemerService.setCodingScheme(JSON.parse(before));
    afterClosed.next({ decisions: ['TRANSFER'], discardedIds: [] });
    expect(JSON.stringify(schemerService.codingScheme)).toBe(before);
    expect(changes).toHaveBeenCalledOnceWith(false);
  });

  it('does not apply a recovery result after the component has reset its dialog', () => {
    const {
      service, afterClosed, changes, before
    } = prepareRecovery();
    service.resetIdentifierConflictResolutionState();
    afterClosed.next({ decisions: ['TRANSFER'], discardedIds: [] });
    expect(JSON.stringify(schemerService.codingScheme)).toBe(before);
    expect(changes).not.toHaveBeenCalled();
  });

  it('offers manual cleanup for multiple old candidates and commits only the explicit choice', () => {
    const { service, afterClosed } = prepareRecovery();
    afterClosed.next(undefined);
    schemerService.codingScheme!.variableCodings.push({
      id: 'even-older', alias: 'response', sourceType: 'BASE', codes: [{ id: 2 }]
    });
    service.resetIdentifierConflictResolutionState();
    service.tryResolveIdentifierConflicts();
    const call = (dialog.open as jasmine.Spy).calls.mostRecent();
    expect(call.args[0]).toBe(ResolveOrphanCodingsDialogComponent);
    expect(call.args[1].data.conflicts[0].candidates.map((coding: { id: string }) => coding.id))
      .toEqual(['previous', 'even-older']);
    const before = JSON.stringify(schemerService.codingScheme);
    afterClosed.next({ decisions: ['TRANSFER'], discardedIds: [] });
    expect(JSON.stringify(schemerService.codingScheme)).toBe(before);
  });

  it('applies explicit orphan deletions and transfer together while preserving missing dependent sources', () => {
    const { service, afterClosed, changes } = prepareRecovery();
    afterClosed.next(undefined);
    schemerService.codingScheme!.variableCodings.push({
      id: 'even-older', alias: 'response', sourceType: 'BASE', codes: [{ id: 2 }]
    });
    service.resetIdentifierConflictResolutionState();
    service.tryResolveIdentifierConflicts();
    afterClosed.next({ decisions: ['TRANSFER'], discardedIds: ['previous'] });
    expect(schemerService.codingScheme!.variableCodings.map(coding => coding.id)).toEqual(['derived', 'current']);
    expect(schemerService.codingScheme!.variableCodings.find(coding => coding.id === 'current')?.codes)
      .toEqual([{ id: 2 }]);
    expect(schemerService.codingScheme!.variableCodings.find(coding => coding.id === 'derived')?.deriveSources)
      .toEqual(['previous']);
    expect(changes).toHaveBeenCalledOnceWith(true);
  });

  it('tryResolveIdentifierConflicts should keep blocking while already resolving', () => {
    const service = createService();

    schemerService.setVarList([
      { id: 'A', alias: 'A' } as never,
      { id: 'A', alias: 'B' } as never
    ]);

    const afterClosed$ = new Subject<unknown>();
    const dialogRef = {
      close: jasmine.createSpy('close'),
      afterClosed: () => afterClosed$.asObservable()
    };
    (dialog.open as jasmine.Spy).and.returnValue(dialogRef);

    expect(service.tryResolveIdentifierConflicts()).toBeTrue();
    expect(service.tryResolveIdentifierConflicts()).toBeTrue();

    afterClosed$.complete();
  });

  it('tryResolveIdentifierConflicts should stop blocking while resolving if the current varList becomes valid', () => {
    const service = createService();

    schemerService.setVarList([
      { id: 'A', alias: 'A' } as never,
      { id: 'A', alias: 'B' } as never
    ]);

    const afterClosed$ = new Subject<unknown>();
    const dialogRef = {
      close: jasmine.createSpy('close'),
      afterClosed: () => afterClosed$.asObservable()
    };
    (dialog.open as jasmine.Spy).and.returnValue(dialogRef);

    expect(service.tryResolveIdentifierConflicts()).toBeTrue();

    schemerService.setVarList([
      { id: 'AA', alias: 'AA' } as never,
      { id: 'BB', alias: 'BB' } as never
    ]);

    expect(service.tryResolveIdentifierConflicts()).toBeFalse();
    expect(dialogRef.close).toHaveBeenCalled();

    afterClosed$.next(null);
    afterClosed$.complete();

    schemerService.setVarList([
      { id: 'A', alias: 'A' } as never,
      { id: 'A', alias: 'B' } as never
    ]);

    expect(service.tryResolveIdentifierConflicts()).toBeTrue();
    expect(dialog.open).toHaveBeenCalledTimes(2);
  });

  it(
    'tryResolveIdentifierConflicts should close a transient scheme-only conflict once varList makes the state valid',
    () => {
      const service = createService();
      const afterClosed$ = new Subject<unknown>();
      const dialogRef = {
        close: jasmine.createSpy('close'),
        afterClosed: () => afterClosed$.asObservable()
      };
      (dialog.open as jasmine.Spy).and.returnValue(dialogRef);

      schemerService.setCodingScheme({
        variableCodings: [{
          id: 'a',
          alias: '',
          sourceType: 'BASE'
        }]
      } as never);

      expect(service.tryResolveIdentifierConflicts()).toBeTrue();

      schemerService.setVarList([{ id: 'a', alias: 'A' } as never]);

      expect(service.tryResolveIdentifierConflicts()).toBeFalse();
      expect(dialogRef.close).toHaveBeenCalled();

      afterClosed$.next(null);
      afterClosed$.complete();

      expect(service.tryResolveIdentifierConflicts()).toBeFalse();
      expect(dialog.open).toHaveBeenCalledTimes(1);
    }
  );

  it('tryResolveIdentifierConflicts should return false for an empty varList', () => {
    const service = createService();

    schemerService.setVarList([]);
    expect(service.tryResolveIdentifierConflicts()).toBeFalse();
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('tryResolveIdentifierConflicts should return false when there are no duplicates', () => {
    const service = createService();

    schemerService.setVarList([
      { id: 'AA', alias: 'AA' } as never,
      { id: 'BB', alias: 'BB' } as never
    ]);

    expect(service.tryResolveIdentifierConflicts()).toBeFalse();
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('tryResolveIdentifierConflicts should allow unique aliases matching other ids', () => {
    const service = createService();

    schemerService.setVarList([
      { id: '04', alias: '02' } as never,
      { id: '02', alias: '05' } as never
    ]);

    expect(service.tryResolveIdentifierConflicts()).toBeFalse();
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('tryResolveIdentifierConflicts should open dialog when invalid ids or aliases exist', () => {
    const service = createService();

    schemerService.setVarList([
      { id: '01.Text', alias: 'valid' } as never,
      { id: 'also-valid', alias: '' } as never
    ]);
    const analysis = analyzeVariableIdentifiers(schemerService.varList);

    (dialog.open as jasmine.Spy).and.returnValue({
      afterClosed: () => new Subject<unknown>().asObservable()
    });

    expect(service.tryResolveIdentifierConflicts()).toBeTrue();
    expect(dialog.open).toHaveBeenCalled();
    expect((dialog.open as jasmine.Spy).calls.mostRecent().args[0]).toBe(
      ResolveIdentifierConflictsDialogComponent
    );
    expect((dialog.open as jasmine.Spy).calls.mostRecent().args[1].data)
      .toEqual(jasmine.objectContaining({ analysis, variables: schemerService.varList, variableCodings: [] }));
  });

  it('tryResolveIdentifierConflicts should open dialog when duplicates exist', () => {
    const service = createService();

    schemerService.setVarList([
      { id: 'A', alias: 'A' } as never,
      { id: 'A', alias: 'B' } as never
    ]);

    (dialog.open as jasmine.Spy).and.returnValue({
      afterClosed: () => new Subject<unknown>().asObservable()
    });

    expect(service.tryResolveIdentifierConflicts()).toBeTrue();
    expect(dialog.open).toHaveBeenCalled();
    expect((dialog.open as jasmine.Spy).calls.mostRecent().args[0]).toBe(
      ResolveIdentifierConflictsDialogComponent
    );
  });

  it('tryResolveIdentifierConflicts should block invalid derived identifiers', () => {
    const service = createService();

    schemerService.setVarList([{ id: 'base' } as never]);
    schemerService.setCodingScheme({
      variableCodings: [
        { id: 'base', alias: 'base', sourceType: 'BASE' },
        { id: 'd_1', alias: '01.Text', sourceType: 'COPY_VALUE' }
      ]
    } as never);

    (dialog.open as jasmine.Spy).and.returnValue({
      afterClosed: () => new Subject<unknown>().asObservable()
    });

    expect(service.tryResolveIdentifierConflicts()).toBeTrue();
    const dialogData = (dialog.open as jasmine.Spy).calls.mostRecent().args[1]
      .data;
    expect(dialogData.analysis.identifiers).toEqual([
      { id: 'base', origin: 'VAR_LIST', sourceIndex: 0 },
      {
        id: 'd_1',
        alias: '01.Text',
        origin: 'DERIVED_CODING',
        sourceIndex: 1
      }
    ]);
  });

  it('tryResolveIdentifierConflicts should block unrepresented invalid base codings', () => {
    const service = createService();

    schemerService.setVarList([{ id: 'base' } as never]);
    schemerService.setCodingScheme({
      variableCodings: [
        { id: 'base', alias: 'base', sourceType: 'BASE' },
        {
          id: 'orphan.invalid',
          alias: 'Orphan',
          sourceType: 'BASE',
          codes: [{ id: 1 }]
        }
      ]
    } as never);

    (dialog.open as jasmine.Spy).and.returnValue({
      afterClosed: () => new Subject<unknown>().asObservable()
    });

    expect(service.tryResolveIdentifierConflicts()).toBeTrue();
    const dialogData = (dialog.open as jasmine.Spy).calls.mostRecent().args[1]
      .data;
    expect(dialogData.analysis.identifiers).toEqual([
      { id: 'base', origin: 'VAR_LIST', sourceIndex: 0 },
      {
        id: 'orphan.invalid',
        alias: 'Orphan',
        origin: 'BASE_CODING',
        sourceIndex: 1
      }
    ]);
  });

  it('tryResolveIdentifierConflicts should ignore removable empty orphan base codings', () => {
    const service = createService();

    schemerService.setVarList([
      { id: 'fresh', alias: 'orphan' } as never
    ]);
    schemerService.setCodingScheme({
      variableCodings: [{
        id: 'orphan',
        alias: 'orphan',
        sourceType: 'BASE',
        label: 'orphan',
        codeModel: 'MANUAL_AND_RULES',
        manualInstruction: '',
        codes: [],
        processing: []
      }]
    } as never);

    expect(service.tryResolveIdentifierConflicts()).toBeFalse();
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('tryResolveIdentifierConflicts should validate empty base codings without a variable list', () => {
    const service = createService();

    schemerService.setVarList([]);
    schemerService.setCodingScheme({
      variableCodings: [{
        id: 'orphan.invalid',
        alias: 'orphan',
        sourceType: 'BASE',
        label: 'orphan.invalid',
        codeModel: 'MANUAL_AND_RULES',
        manualInstruction: '',
        codes: [],
        processing: []
      }]
    } as never);
    (dialog.open as jasmine.Spy).and.returnValue({
      afterClosed: () => new Subject<unknown>().asObservable()
    });

    expect(service.tryResolveIdentifierConflicts()).toBeTrue();
    expect(dialog.open).toHaveBeenCalledWith(
      ResolveIdentifierConflictsDialogComponent,
      jasmine.objectContaining({ disableClose: true })
    );
  });

  it('tryResolveIdentifierConflicts should detect derived public collisions', () => {
    const service = createService();

    schemerService.setVarList([{ id: 'base-public' } as never]);
    schemerService.setCodingScheme({
      variableCodings: [
        { id: 'base-public', alias: 'base-public', sourceType: 'BASE' },
        { id: 'd_1', alias: 'BASE-PUBLIC', sourceType: 'COPY_VALUE' }
      ]
    } as never);

    (dialog.open as jasmine.Spy).and.returnValue({
      afterClosed: () => new Subject<unknown>().asObservable()
    });

    expect(service.tryResolveIdentifierConflicts()).toBeTrue();
    expect(dialog.open).toHaveBeenCalled();
  });

  it('tryResolveIdentifierConflicts should keep blocking a dismissed duplicate signature', () => {
    const service = createService();

    schemerService.setVarList([
      { id: 'A', alias: 'A' } as never,
      { id: 'A', alias: 'B' } as never
    ]);

    const afterClosed$ = new Subject<unknown>();
    (dialog.open as jasmine.Spy).and.returnValue({
      afterClosed: () => afterClosed$.asObservable()
    });

    expect(service.tryResolveIdentifierConflicts()).toBeTrue();
    afterClosed$.next(null);
    afterClosed$.complete();

    expect(service.tryResolveIdentifierConflicts()).toBeTrue();
    expect(dialog.open).toHaveBeenCalledTimes(1);
  });

  it('resetIdentifierConflictResolutionState should allow the same dismissed conflict to open again', () => {
    const service = createService();

    schemerService.setVarList([
      { id: 'A', alias: 'A' } as never,
      { id: 'A', alias: 'B' } as never
    ]);

    const afterClosed$ = new Subject<unknown>();
    (dialog.open as jasmine.Spy).and.returnValue({
      afterClosed: () => afterClosed$.asObservable()
    });

    expect(service.tryResolveIdentifierConflicts()).toBeTrue();
    afterClosed$.next(null);

    expect(service.tryResolveIdentifierConflicts()).toBeTrue();
    expect(dialog.open).toHaveBeenCalledTimes(1);

    service.resetIdentifierConflictResolutionState();

    expect(service.tryResolveIdentifierConflicts()).toBeTrue();
    expect(dialog.open).toHaveBeenCalledTimes(2);
  });

  it('resetIdentifierConflictResolutionState should clear an in-progress dialog state', () => {
    const service = createService();

    schemerService.setVarList([
      { id: 'A', alias: 'A' } as never,
      { id: 'A', alias: 'B' } as never
    ]);

    (dialog.open as jasmine.Spy).and.returnValue({
      afterClosed: () => new Subject<unknown>().asObservable()
    });

    expect(service.tryResolveIdentifierConflicts()).toBeTrue();
    expect(service.tryResolveIdentifierConflicts()).toBeTrue();
    expect(dialog.open).toHaveBeenCalledTimes(1);

    service.resetIdentifierConflictResolutionState();

    expect(service.tryResolveIdentifierConflicts()).toBeTrue();
    expect(dialog.open).toHaveBeenCalledTimes(2);
  });

  it('resetIdentifierConflictResolutionState should ignore stale dialog close callbacks', () => {
    const service = createService();

    schemerService.setVarList([
      { id: 'A', alias: 'A' } as never,
      { id: 'A', alias: 'B' } as never
    ]);

    const staleAfterClosed$ = new Subject<unknown>();
    const nextAfterClosed$ = new Subject<unknown>();
    const staleDialogRef = {
      close: jasmine.createSpy('close'),
      afterClosed: () => staleAfterClosed$.asObservable()
    };
    const nextDialogRef = {
      close: jasmine.createSpy('close'),
      afterClosed: () => nextAfterClosed$.asObservable()
    };
    (dialog.open as jasmine.Spy).and.returnValues(
      staleDialogRef,
      nextDialogRef
    );

    expect(service.tryResolveIdentifierConflicts()).toBeTrue();

    service.resetIdentifierConflictResolutionState();
    staleAfterClosed$.next(null);

    expect(service.tryResolveIdentifierConflicts()).toBeTrue();
    expect(staleDialogRef.close).toHaveBeenCalled();
    expect(dialog.open).toHaveBeenCalledTimes(2);
  });

  it('tryResolveIdentifierConflicts should not mutate varList or codingScheme when dialog closes', () => {
    const service = createService();

    schemerService.setVarList([
      { id: 'A', alias: 'A' } as never,
      { id: 'A', alias: 'B' } as never
    ]);

    schemerService.setCodingScheme({
      variableCodings: [
        { id: 'A', alias: 'A', sourceType: 'BASE' } as never,
        {
          id: 'X', alias: 'X', sourceType: 'COPY_VALUE', deriveSources: ['A']
        } as never
      ]
    } as never);

    const afterClosed$ = new Subject<unknown>();
    (dialog.open as jasmine.Spy).and.returnValue({
      afterClosed: () => afterClosed$.asObservable()
    });

    expect(service.tryResolveIdentifierConflicts()).toBeTrue();

    afterClosed$.next(null);
    afterClosed$.complete();

    expect(schemerService.varList.map(v => v.id)).toEqual(['A', 'A']);

    const vcIds = (schemerService.codingScheme?.variableCodings || []).map(v => v.id);
    expect(vcIds).toEqual(['A', 'X']);

    const derivedSources = (schemerService.codingScheme?.variableCodings || [])[1].deriveSources;
    expect(derivedSources).toEqual(['A']);
  });
});
