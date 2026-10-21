import { MatDialogRef } from '@angular/material/dialog';
import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';
import { CodingFactory } from '@iqb/responses/coding-factory';
import {
  ResolveIdentifierConflictsDialogComponent,
  ResolveIdentifierConflictsDialogData
} from './resolve-identifier-conflicts-dialog.component';
import { analyzeVariableIdentifiers } from '../services/schemer-identifier-validation';

describe('ResolveIdentifierConflictsDialogComponent', () => {
  const createComponent = (varList: Partial<VariableInfo>[]) => {
    const dialogRef = {
      close: jasmine.createSpy('close')
    } as unknown as MatDialogRef<ResolveIdentifierConflictsDialogComponent>;
    const data: ResolveIdentifierConflictsDialogData = {
      analysis: analyzeVariableIdentifiers(varList as VariableInfo[])
    };

    return {
      component: new ResolveIdentifierConflictsDialogComponent(dialogRef, data),
      dialogRef
    };
  };

  it('should accept one-character ids and aliases', () => {
    const { component } = createComponent([
      { id: 'a', alias: 'a' },
      { id: 'b', alias: 'b' },
      { id: 'c', alias: 'c' }
    ]);

    expect(component.errorGroups).toEqual([]);
  });

  it('should group every shared validation reason', () => {
    const { component } = createComponent([
      { id: '', alias: 'first' },
      { id: '01.Text', alias: 'second' },
      { id: 'duplicate', alias: 'public-a' },
      { id: 'DUPLICATE', alias: 'public-b' },
      { id: 'alias-a', alias: 'same-alias' },
      { id: 'alias-b', alias: 'SAME-ALIAS' },
      { id: 'public-id' },
      { id: 'other', alias: 'PUBLIC-ID' }
    ]);

    expect(component.errorGroups.map(group => group.code)).toEqual([
      'INVALID_CHARACTERS',
      'EMPTY_IDENTIFIER',
      'DUPLICATE_ID',
      'DUPLICATE_ALIAS',
      'PUBLIC_IDENTIFIER_COLLISION'
    ]);
  });

  it('should show the id and alias of a conflict partner', () => {
    const { component } = createComponent([
      { id: 'first-id', alias: 'Public' },
      { id: 'public' }
    ]);
    const collision = component.errorGroups.find(
      group => group.code === 'PUBLIC_IDENTIFIER_COLLISION'
    )?.errors[0];

    expect(collision?.conflictingVariableIndex).toBe(0);
    expect(component.displayConflictPartner(0)).toBe(
      'Eintrag 1 (Variablenliste, Eintrag 1, ID: first-id, Alias: Public)'
    );
  });

  it('should distinguish variable-list, base-coding and derived sources', () => {
    const dialogRef = {
      close: jasmine.createSpy('close')
    } as unknown as MatDialogRef<ResolveIdentifierConflictsDialogComponent>;
    const analysis = analyzeVariableIdentifiers(
      [{ id: 'base' } as VariableInfo],
      [
        { id: 'base', sourceType: 'BASE' },
        { id: 'orphan', sourceType: 'BASE_NO_VALUE' },
        { id: 'derived', alias: 'invalid.alias', sourceType: 'COPY_VALUE' }
      ] as never[]
    );
    const component = new ResolveIdentifierConflictsDialogComponent(
      dialogRef,
      { analysis }
    );

    expect(component.sourceLabel(0)).toBe('Variablenliste, Eintrag 1');
    expect(component.sourceLabel(1)).toBe(
      'Coding-Scheme (Basisvariable), Eintrag 2'
    );
    expect(component.sourceLabel(2)).toBe(
      'Coding-Scheme (Derived-Variable), Eintrag 3'
    );
  });

  it('should distinguish an omitted alias from an empty alias', () => {
    const { component } = createComponent([
      { id: 'first' },
      { id: 'second', alias: '' }
    ]);

    expect(component.displayAlias(0)).toBe('(nicht gesetzt)');
    expect(component.displayAlias(1)).toBe('(leer)');
  });

  it('should allow aliases matching technical ids that are not public', () => {
    const { component } = createComponent([
      { id: '04', alias: '02' },
      { id: '02', alias: '05' }
    ]);

    expect(component.errorGroups).toEqual([]);
  });

  it('should not mutate the input varList', () => {
    const original = [
      { id: 'AA', alias: 'AA' },
      { id: 'AA', alias: 'BB' }
    ];
    const { component } = createComponent(original);

    component.identifiers[0].id = 'CHANGED';

    expect(original.map(variable => variable.id)).toEqual(['AA', 'AA']);
  });

  it('should close without a result payload', () => {
    const { component, dialogRef } = createComponent([
      { id: 'AA', alias: 'AA' },
      { id: 'AA', alias: 'BB' }
    ]);

    component.close();

    expect(dialogRef.close).toHaveBeenCalled();
    expect((dialogRef.close as jasmine.Spy).calls.mostRecent().args.length)
      .toBe(0);
  });

  const prepareDerived = () => {
    const variables = [{ id: 'new_mc', alias: '01' }] as VariableInfo[];
    const variableCodings = [{
      ...CodingFactory.createCodingVariable('derived'),
      alias: '01',
      sourceType: 'SUM_SCORE' as const,
      deriveSources: ['old_row'],
      codes: [{ id: 1, type: 'FULL_CREDIT' as const, score: 3 }]
    }];
    const dialogRef = { close: jasmine.createSpy('close') } as unknown as
      MatDialogRef<ResolveIdentifierConflictsDialogComponent>;
    const data: ResolveIdentifierConflictsDialogData = {
      analysis: analyzeVariableIdentifiers(variables, variableCodings), variables, variableCodings, canEdit: () => true
    };
    const component = new ResolveIdentifierConflictsDialogComponent(dialogRef, data);
    return { component, data, dialogRef };
  };

  it('stages a rename without mutation and returns only the confirmed request, once', () => {
    const { component, data, dialogRef } = prepareDerived();
    const before = JSON.stringify(data);
    component.rename(component.derivedEdits[0], 'old_01');
    expect(component.canApply).toBeTrue();
    expect(JSON.stringify(data)).toBe(before);
    expect(dialogRef.close).not.toHaveBeenCalled();
    component.apply();
    component.apply();
    expect(dialogRef.close).toHaveBeenCalledOnceWith({
      derivedChanges: [{ id: 'derived', action: 'RENAME', alias: 'old_01' }], confirmDeletion: false
    });
  });

  it('rejects invalid and duplicate aliases in the dialog', () => {
    const { component, dialogRef } = prepareDerived();
    ['', 'bad.alias', '01'].forEach(alias => {
      component.rename(component.derivedEdits[0], alias);
      expect(component.canApply).toBeFalse();
      component.apply();
    });
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('requires explicit deletion confirmation and resets it whenever the deletion selection changes', () => {
    const { component, dialogRef } = prepareDerived();
    component.markDeleted(component.derivedEdits[0], true);
    expect(component.canApply).toBeFalse();
    component.confirmDeletes(true);
    expect(component.canApply).toBeTrue();
    component.markDeleted(component.derivedEdits[0], false);
    expect(component.confirmDeletion).toBeFalse();
    component.markDeleted(component.derivedEdits[0], true);
    expect(component.canApply).toBeFalse();
    component.confirmDeletes(true);
    component.apply();
    expect(dialogRef.close).toHaveBeenCalledOnceWith({
      derivedChanges: [{ id: 'derived', action: 'DELETE' }], confirmDeletion: true
    });
  });

  it('cancels staged deletion without returning changes or mutating the scheme', () => {
    const { component, data, dialogRef } = prepareDerived();
    const before = JSON.stringify(data);
    component.markDeleted(component.derivedEdits[0], true);
    component.confirmDeletes(true);
    component.close();
    component.apply();
    expect(dialogRef.close).toHaveBeenCalledOnceWith();
    expect(JSON.stringify(data)).toBe(before);
  });

  it('rejects pending edits when write access is revoked', () => {
    const { component, data, dialogRef } = prepareDerived();
    component.rename(component.derivedEdits[0], 'old_01');
    data.canEdit = () => false;
    component.apply();
    expect(component.canApply).toBeFalse();
    expect(dialogRef.close).not.toHaveBeenCalled();
    component.markDeleted(component.derivedEdits[0], true);
    expect(component.hasDeletions).toBeFalse();
  });
});
