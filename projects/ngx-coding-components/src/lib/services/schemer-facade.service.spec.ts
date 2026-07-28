import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { ResolveIdentifierConflictsDialogComponent } from '../dialogs/resolve-identifier-conflicts-dialog.component';
import { SchemerFacadeService } from './schemer-facade.service';
import { SchemerService } from './schemer.service';
import { analyzeVariableIdentifiers } from './schemer-identifier-validation';

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
      .toEqual({ analysis });
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
