import { MatDialogRef } from '@angular/material/dialog';
import { SelectVariableDialogComponent, SelectVariableDialogData } from './select-variable-dialog.component';

describe('SelectVariableDialogComponent', () => {
  const createComponent = (overrides?: Partial<SelectVariableDialogData>) => {
    const dialogRef = jasmine.createSpyObj<MatDialogRef<SelectVariableDialogComponent>>('MatDialogRef', ['close']);

    const selectData: SelectVariableDialogData = {
      title: '',
      prompt: '',
      variables: [],
      selectedVariable: null,
      codingStatus: {},
      okButtonLabel: '',
      ...overrides
    };

    const component = new SelectVariableDialogComponent(selectData, dialogRef);

    return { component, dialogRef, selectData };
  };

  it('ngOnInit should set default title and okButtonLabel when missing/empty and sort variables by alias/id', () => {
    const { component, selectData } = createComponent({
      title: '',
      okButtonLabel: '',
      variables: [
        { id: 'b', alias: 'B', sourceType: 'BASE' },
        { id: 'a', alias: '', sourceType: 'BASE' },
        { id: 'c', alias: 'A', sourceType: 'BASE' }
      ]
    });

    spyOn(window, 'setTimeout').and.callFake(((fn: () => void) => {
      fn();
      return 0;
    }) as unknown as typeof window.setTimeout);

    component.ngOnInit();

    expect(selectData.title).toBe('Variable wählen');
    expect(selectData.okButtonLabel).toBe('OK');
    expect(selectData.variables.map(v => v.alias || v.id)).toEqual(['a', 'A', 'B']);
  });

  it('getSelected should return selected option values or [] when no selection list', () => {
    const { component } = createComponent();

    expect(component.getSelected()).toEqual([]);

    (component as unknown as { variablesElement: unknown }).variablesElement = {
      selectedOptions: {
        selected: [{ value: 'x' }, { value: 'y' }]
      }
    };

    expect(component.getSelected()).toEqual(['x', 'y']);
  });

  it('okButtonClick should close dialog with selected values (or undefined if none)', () => {
    const { component, dialogRef } = createComponent();

    (component as unknown as { variablesElement: unknown }).variablesElement = {
      selectedOptions: {
        selected: [{ value: 'v1' }, { value: 'v2' }]
      }
    };

    component.okButtonClick();

    expect(dialogRef.close).toHaveBeenCalledWith(['v1', 'v2']);

    (dialogRef.close as jasmine.Spy).calls.reset();
    component.variablesElement = undefined;
    component.okButtonClick();
    expect(dialogRef.close).toHaveBeenCalledWith(undefined);
  });

  it('ngOnInit should preselect the selectedVariable alias after timeout', () => {
    const { component } = createComponent({
      selectedVariable: { id: 'x', alias: 'AliasX', sourceType: 'BASE' },
      variables: [{ id: 'x', alias: 'AliasX', sourceType: 'BASE' }]
    });

    const option1 = { value: 'AliasX', selected: false };
    const option2 = { value: 'Other', selected: false };

    (component as unknown as { variablesElement: unknown }).variablesElement = {
      options: [option1, option2]
    };

    spyOn(window, 'setTimeout').and.callFake(((fn: () => void) => {
      fn();
      return 0;
    }) as unknown as typeof window.setTimeout);

    component.ngOnInit();

    expect(option1.selected).toBeTrue();
    expect(option2.selected).toBeFalse();
  });

  it('ngOnInit should not throw and should not select anything when selectedVariable is null or has no alias', () => {
    const { component } = createComponent({
      selectedVariable: null,
      variables: [{ id: 'x', alias: 'AliasX', sourceType: 'BASE' }]
    });

    const option1 = { value: 'AliasX', selected: true };

    (component as unknown as { variablesElement: unknown }).variablesElement = {
      options: [option1]
    };

    spyOn(window, 'setTimeout').and.callFake(((fn: () => void) => {
      fn();
      return 0;
    }) as unknown as typeof window.setTimeout);

    component.ngOnInit();

    expect(option1.selected).toBeTrue();
  });
});
