import { SelectVariableDialogComponent } from './select-variable-dialog.component';

describe('SelectVariableDialogComponent', () => {
  type VariableStub = { id: string; alias?: string | null };
  type SelectDataStub = {
    title: string;
    prompt: string;
    variables: VariableStub[];
    selectedVariable: VariableStub | null;
    codingStatus: Record<string, unknown>;
    okButtonLabel: string;
  };
  type VariablesElementStub = {
    selectedOptions?: { selected: Array<{ value: string }> };
    options?: Array<{ value: string; selected: boolean }>;
  };

  const createComponent = (overrides?: Partial<SelectDataStub>) => {
    const dialogRef = {
      close: jasmine.createSpy('close')
    } as unknown as { close: jasmine.Spy };

    const selectData = {
      title: '',
      prompt: '',
      variables: [],
      selectedVariable: null,
      codingStatus: {},
      okButtonLabel: '',
      ...overrides
    } as SelectDataStub;

    const component = new SelectVariableDialogComponent(selectData as unknown, dialogRef);

    return { component, dialogRef, selectData };
  };

  it('ngOnInit should set default title and okButtonLabel when missing/empty and sort variables by alias/id', () => {
    const { component, selectData } = createComponent({
      title: '',
      okButtonLabel: '',
      variables: [
        { id: 'b', alias: 'B' },
        { id: 'a', alias: '' },
        { id: 'c', alias: 'A' }
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

    component.variablesElement = {
      selectedOptions: {
        selected: [{ value: 'x' }, { value: 'y' }]
      }
    } as unknown as VariablesElementStub;

    expect(component.getSelected()).toEqual(['x', 'y']);
  });

  it('okButtonClick should close dialog with selected values (or undefined if none)', () => {
    const { component, dialogRef } = createComponent();

    component.variablesElement = {
      selectedOptions: {
        selected: [{ value: 'v1' }, { value: 'v2' }]
      }
    } as unknown as VariablesElementStub;

    component.okButtonClick();

    expect(dialogRef.close).toHaveBeenCalledWith(['v1', 'v2']);

    (dialogRef.close as jasmine.Spy).calls.reset();
    component.variablesElement = undefined;
    component.okButtonClick();
    expect(dialogRef.close).toHaveBeenCalledWith(undefined);
  });

  it('ngOnInit should preselect the selectedVariable alias after timeout', () => {
    const { component } = createComponent({
      selectedVariable: { id: 'x', alias: 'AliasX' },
      variables: [{ id: 'x', alias: 'AliasX' }]
    });

    const option1 = { value: 'AliasX', selected: false };
    const option2 = { value: 'Other', selected: false };

    component.variablesElement = {
      options: [option1, option2]
    } as unknown as VariablesElementStub;

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
      variables: [{ id: 'x', alias: 'AliasX' }]
    });

    const option1 = { value: 'AliasX', selected: true };

    component.variablesElement = {
      options: [option1]
    } as unknown as VariablesElementStub;

    spyOn(window, 'setTimeout').and.callFake(((fn: () => void) => {
      fn();
      return 0;
    }) as unknown as typeof window.setTimeout);

    component.ngOnInit();

    expect(option1.selected).toBeTrue();
  });
});
