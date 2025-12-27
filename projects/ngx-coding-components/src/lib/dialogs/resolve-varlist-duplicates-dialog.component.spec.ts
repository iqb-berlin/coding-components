import { MatDialogRef } from '@angular/material/dialog';
import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';
import { SchemerService } from '../services/schemer.service';
import {
  ResolveVarListDuplicatesDialogComponent,
  ResolveVarListDuplicatesDialogData
} from './resolve-varlist-duplicates-dialog.component';

describe('ResolveVarListDuplicatesDialogComponent', () => {
  type VarListEntry = VariableInfo;

  const createComponent = (options: {
    varList: Partial<VarListEntry>[];
    reservedIds?: string[];
  }) => {
    const dialogRef = {
      close: jasmine.createSpy('close')
    } as unknown as MatDialogRef<ResolveVarListDuplicatesDialogComponent>;

    const data: ResolveVarListDuplicatesDialogData = {
      varList: options.varList as VariableInfo[],
      reservedIds: options.reservedIds ?? []
    };

    const schemerService = jasmine.createSpyObj<SchemerService>('SchemerService', ['setVarList']);

    return {
      component: new ResolveVarListDuplicatesDialogComponent(dialogRef, data, schemerService),
      dialogRef
    };
  };

  it('should mark problems for duplicate ids', () => {
    const { component } = createComponent({
      varList: [
        { id: 'A', alias: 'A' },
        { id: 'A', alias: 'B' }
      ]
    });

    expect(component.hasProblems).toBeTrue();
    expect(component.duplicateIdValues).toEqual(['A']);
  });

  it('should mark problems for invalid ids/aliases', () => {
    const { component } = createComponent({
      varList: [
        { id: 'A', alias: 'A' }, // invalid because min length is 2
        { id: 'OK_1', alias: 'x' } // invalid alias (min length 2)
      ]
    });

    expect(component.hasProblems).toBeTrue();
    expect(component.invalidIdCount).toBeGreaterThan(0);
    expect(component.invalidAliasCount).toBeGreaterThan(0);
  });

  it('autoFix should generate unique ids/aliases and respect reserved ids', () => {
    const { component } = createComponent({
      varList: [
        { id: 'A', alias: 'A' },
        { id: 'A', alias: 'A' }
      ],
      reservedIds: ['VAR', 'A__']
    });

    component.autoFix();

    expect(component.hasProblems).toBeFalse();

    const ids = component.editedVarList.map(v => v.id);
    const aliases = component.editedVarList.map(v => v.alias);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(aliases).size).toBe(aliases.length);

    // none of the ids should collide with reserved set
    expect(ids.map(v => v.toUpperCase())).not.toContain('VAR');
    expect(ids.map(v => v.toUpperCase())).not.toContain('A__');
  });

  it('reset should restore original varList', () => {
    const { component } = createComponent({
      varList: [
        { id: 'AA', alias: 'AA' },
        { id: 'BB', alias: 'BB' }
      ]
    });

    component.editedVarList[0].id = 'CC';
    component.reset();

    expect(component.editedVarList.map(v => v.id)).toEqual(['AA', 'BB']);
  });

  it('apply should close dialog with a deep-copied varList and renameMap', () => {
    const { component, dialogRef } = createComponent({
      varList: [
        { id: 'AA', alias: 'AA' },
        { id: 'BB', alias: 'BB' }
      ]
    });

    component.editedVarList[0].id = 'AA_1';
    component.apply();

    expect(dialogRef.close).toHaveBeenCalled();
    const payload = (dialogRef.close as jasmine.Spy).calls.mostRecent().args[0] as {
      varList: VariableInfo[];
      idRenameMap: Record<string, string>;
    };

    expect(payload.idRenameMap['AA']).toBe('AA_1');
    expect(payload.varList.map(v => v.id)).toEqual(['AA_1', 'BB']);

    // deep copy
    expect(payload.varList[0]).not.toBe(component.editedVarList[0]);
  });

  it('sanitizeVarName should replace invalid chars and enforce min length', () => {
    const sanitize = (ResolveVarListDuplicatesDialogComponent as unknown as
      { sanitizeVarName: (raw: string) => string }).sanitizeVarName;

    expect(sanitize('a')).toBe('a_');
    expect(sanitize('')).toBe('VAR');
    expect(sanitize('a b')).toBe('a_b');
    expect(sanitize('ab')).toBe('ab');
  });
});
