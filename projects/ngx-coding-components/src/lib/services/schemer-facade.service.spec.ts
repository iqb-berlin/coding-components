import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { ResolveVarListDuplicatesDialogComponent } from '../dialogs/resolve-varlist-duplicates-dialog.component';
import { SchemerFacadeService } from './schemer-facade.service';
import { SchemerService } from './schemer.service';

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

  it('tryResolveVarListDuplicates should keep blocking while already resolving', () => {
    const service = createService();

    schemerService.setVarList([
      { id: 'A', alias: 'A' } as never,
      { id: 'A', alias: 'B' } as never
    ]);

    const afterClosed$ = new Subject<unknown>();
    (dialog.open as jasmine.Spy).and.returnValue({
      afterClosed: () => afterClosed$.asObservable()
    });

    expect(service.tryResolveVarListDuplicates()).toBeTrue();
    expect(service.tryResolveVarListDuplicates()).toBeTrue();

    afterClosed$.complete();
  });

  it('tryResolveVarListDuplicates should stop blocking while resolving if the current varList becomes valid', () => {
    const service = createService();

    schemerService.setVarList([
      { id: 'A', alias: 'A' } as never,
      { id: 'A', alias: 'B' } as never
    ]);

    const afterClosed$ = new Subject<unknown>();
    (dialog.open as jasmine.Spy).and.returnValue({
      afterClosed: () => afterClosed$.asObservable()
    });

    expect(service.tryResolveVarListDuplicates()).toBeTrue();

    schemerService.setVarList([
      { id: 'AA', alias: 'AA' } as never,
      { id: 'BB', alias: 'BB' } as never
    ]);

    expect(service.tryResolveVarListDuplicates()).toBeFalse();

    afterClosed$.next(null);
    afterClosed$.complete();

    schemerService.setVarList([
      { id: 'A', alias: 'A' } as never,
      { id: 'A', alias: 'B' } as never
    ]);

    expect(service.tryResolveVarListDuplicates()).toBeTrue();
    expect(dialog.open).toHaveBeenCalledTimes(2);
  });

  it('tryResolveVarListDuplicates should return false for an empty varList', () => {
    const service = createService();

    schemerService.setVarList([]);
    expect(service.tryResolveVarListDuplicates()).toBeFalse();
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('tryResolveVarListDuplicates should return false when there are no duplicates', () => {
    const service = createService();

    schemerService.setVarList([
      { id: 'AA', alias: 'AA' } as never,
      { id: 'BB', alias: 'BB' } as never
    ]);

    expect(service.tryResolveVarListDuplicates()).toBeFalse();
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('tryResolveVarListDuplicates should open dialog when invalid ids or aliases exist', () => {
    const service = createService();

    schemerService.setVarList([
      { id: 'A', alias: 'AA' } as never,
      { id: 'BB', alias: 'x' } as never
    ]);

    (dialog.open as jasmine.Spy).and.returnValue({
      afterClosed: () => new Subject<unknown>().asObservable()
    });

    expect(service.tryResolveVarListDuplicates()).toBeTrue();
    expect(dialog.open).toHaveBeenCalled();
    expect((dialog.open as jasmine.Spy).calls.mostRecent().args[0]).toBe(
      ResolveVarListDuplicatesDialogComponent
    );
  });

  it('tryResolveVarListDuplicates should open dialog when duplicates exist', () => {
    const service = createService();

    schemerService.setVarList([
      { id: 'A', alias: 'A' } as never,
      { id: 'A', alias: 'B' } as never
    ]);

    (dialog.open as jasmine.Spy).and.returnValue({
      afterClosed: () => new Subject<unknown>().asObservable()
    });

    expect(service.tryResolveVarListDuplicates()).toBeTrue();
    expect(dialog.open).toHaveBeenCalled();
    expect((dialog.open as jasmine.Spy).calls.mostRecent().args[0]).toBe(
      ResolveVarListDuplicatesDialogComponent
    );
  });

  it('tryResolveVarListDuplicates should keep blocking a dismissed duplicate signature', () => {
    const service = createService();

    schemerService.setVarList([
      { id: 'A', alias: 'A' } as never,
      { id: 'A', alias: 'B' } as never
    ]);

    const afterClosed$ = new Subject<unknown>();
    (dialog.open as jasmine.Spy).and.returnValue({
      afterClosed: () => afterClosed$.asObservable()
    });

    expect(service.tryResolveVarListDuplicates()).toBeTrue();
    afterClosed$.next(null);
    afterClosed$.complete();

    expect(service.tryResolveVarListDuplicates()).toBeTrue();
    expect(dialog.open).toHaveBeenCalledTimes(1);
  });

  it('resetVarListDuplicateResolutionState should allow the same dismissed conflict to open again', () => {
    const service = createService();

    schemerService.setVarList([
      { id: 'A', alias: 'A' } as never,
      { id: 'A', alias: 'B' } as never
    ]);

    const afterClosed$ = new Subject<unknown>();
    (dialog.open as jasmine.Spy).and.returnValue({
      afterClosed: () => afterClosed$.asObservable()
    });

    expect(service.tryResolveVarListDuplicates()).toBeTrue();
    afterClosed$.next(null);

    expect(service.tryResolveVarListDuplicates()).toBeTrue();
    expect(dialog.open).toHaveBeenCalledTimes(1);

    service.resetVarListDuplicateResolutionState();

    expect(service.tryResolveVarListDuplicates()).toBeTrue();
    expect(dialog.open).toHaveBeenCalledTimes(2);
  });

  it('resetVarListDuplicateResolutionState should clear an in-progress dialog state', () => {
    const service = createService();

    schemerService.setVarList([
      { id: 'A', alias: 'A' } as never,
      { id: 'A', alias: 'B' } as never
    ]);

    (dialog.open as jasmine.Spy).and.returnValue({
      afterClosed: () => new Subject<unknown>().asObservable()
    });

    expect(service.tryResolveVarListDuplicates()).toBeTrue();
    expect(service.tryResolveVarListDuplicates()).toBeTrue();
    expect(dialog.open).toHaveBeenCalledTimes(1);

    service.resetVarListDuplicateResolutionState();

    expect(service.tryResolveVarListDuplicates()).toBeTrue();
    expect(dialog.open).toHaveBeenCalledTimes(2);
  });

  it('resetVarListDuplicateResolutionState should ignore stale dialog close callbacks', () => {
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

    expect(service.tryResolveVarListDuplicates()).toBeTrue();

    service.resetVarListDuplicateResolutionState();
    staleAfterClosed$.next(null);

    expect(service.tryResolveVarListDuplicates()).toBeTrue();
    expect(staleDialogRef.close).toHaveBeenCalled();
    expect(dialog.open).toHaveBeenCalledTimes(2);
  });

  it('tryResolveVarListDuplicates should not mutate varList or codingScheme when dialog closes', () => {
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

    expect(service.tryResolveVarListDuplicates()).toBeTrue();

    afterClosed$.next(null);
    afterClosed$.complete();

    expect(schemerService.varList.map(v => v.id)).toEqual(['A', 'A']);

    const vcIds = (schemerService.codingScheme?.variableCodings || []).map(v => v.id);
    expect(vcIds).toEqual(['A', 'X']);

    const derivedSources = (schemerService.codingScheme?.variableCodings || [])[1].deriveSources;
    expect(derivedSources).toEqual(['A']);
  });
});
