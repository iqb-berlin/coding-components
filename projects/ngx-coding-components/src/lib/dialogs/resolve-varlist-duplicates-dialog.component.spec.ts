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
