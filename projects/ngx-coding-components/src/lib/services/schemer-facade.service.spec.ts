import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom, Subject } from 'rxjs';
import { take } from 'rxjs/operators';
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

  it('tryResolveVarListDuplicates should return false if already resolving', () => {
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
    expect(service.tryResolveVarListDuplicates()).toBeFalse();

    afterClosed$.complete();
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
      { id: 'A', alias: 'A' } as never,
      { id: 'B', alias: 'B' } as never
    ]);

    expect(service.tryResolveVarListDuplicates()).toBeFalse();
    expect(dialog.open).not.toHaveBeenCalled();
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

  it('tryResolveVarListDuplicates should remember dismissed signature and not reopen dialog for same list', () => {
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

    expect(service.tryResolveVarListDuplicates()).toBeFalse();
    expect(dialog.open).toHaveBeenCalledTimes(1);
  });

  it('tryResolveVarListDuplicates should apply rename map to codingScheme and emit result', async () => {
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

    const emitted = firstValueFrom(service.varListDuplicatesResolved$.pipe(take(1)));

    const afterClosed$ = new Subject<unknown>();
    (dialog.open as jasmine.Spy).and.returnValue({
      afterClosed: () => afterClosed$.asObservable()
    });

    expect(service.tryResolveVarListDuplicates()).toBeTrue();

    const dialogResult = {
      varList: [
        { id: 'A_1', alias: 'A_1' },
        { id: 'A_2', alias: 'B' }
      ],
      idRenameMap: {
        A: 'A_1'
      }
    };

    afterClosed$.next(dialogResult);
    afterClosed$.complete();

    const resolved = await emitted;
    expect(resolved.idRenameMap['A']).toBe('A_1');

    expect(schemerService.varList.map(v => v.id)).toEqual(['A_1', 'A_2']);

    const vcIds = (schemerService.codingScheme?.variableCodings || []).map(v => v.id);
    expect(vcIds).toEqual(['A_1', 'X']);

    const derivedSources = (schemerService.codingScheme?.variableCodings || [])[1].deriveSources;
    expect(derivedSources).toEqual(['A_1']);
  });
});
