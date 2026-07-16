import { MatDialogRef } from '@angular/material/dialog';
import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';
import {
  ResolveVarListDuplicatesDialogComponent,
  ResolveVarListDuplicatesDialogData
} from './resolve-varlist-duplicates-dialog.component';

describe('ResolveVarListDuplicatesDialogComponent', () => {
  type VarListEntry = VariableInfo;

  const createComponent = (options: {
    varList: Partial<VarListEntry>[];
  }) => {
    const dialogRef = {
      close: jasmine.createSpy('close')
    } as unknown as MatDialogRef<ResolveVarListDuplicatesDialogComponent>;

    const data: ResolveVarListDuplicatesDialogData = {
      varList: options.varList as VariableInfo[]
    };

    return {
      component: new ResolveVarListDuplicatesDialogComponent(dialogRef, data),
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

  it('should allow generated ids and aliases with hyphens', () => {
    const { component } = createComponent({
      varList: [
        { id: 'likert-row_4', alias: 'Item-01' },
        { id: 'likert-row_5', alias: 'Item-02' }
      ]
    });

    expect(component.hasProblems).toBeFalse();
    expect(component.invalidIdCount).toBe(0);
    expect(component.invalidAliasCount).toBe(0);
  });

  it('should allow unique aliases matching other ids', () => {
    const { component } = createComponent({
      varList: [
        { id: '04', alias: '02' },
        { id: '02', alias: '05' }
      ]
    });

    expect(component.hasProblems).toBeFalse();
    expect(component.statusText).toBe('Keine Konflikte mehr.');
  });

  it('should not mutate the input varList', () => {
    const original = [
      { id: 'AA', alias: 'AA' },
      { id: 'AA', alias: 'BB' }
    ];
    const { component } = createComponent({
      varList: original
    });

    component.varList[0].id = 'CHANGED';

    expect(original.map(v => v.id)).toEqual(['AA', 'AA']);
  });

  it('close should close the dialog without a result payload', () => {
    const { component, dialogRef } = createComponent({
      varList: [
        { id: 'AA', alias: 'AA' },
        { id: 'BB', alias: 'BB' }
      ]
    });

    component.close();

    expect(dialogRef.close).toHaveBeenCalled();
    expect((dialogRef.close as jasmine.Spy).calls.mostRecent().args.length).toBe(0);
  });
});
