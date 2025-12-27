import { SelectCodeRuleReferenceDialogComponent } from './select-code-rule-reference-dialog.component';

describe('SelectCodeRuleReferenceDialogComponent', () => {
  const createComponent = (data: unknown) => {
    const dialogRef = {
      close: jasmine.createSpy('close')
    } as unknown as { close: jasmine.Spy };

    const component = new SelectCodeRuleReferenceDialogComponent(data, dialogRef);
    return { component, dialogRef };
  };

  it('should initialize with specific selection when value is a number (and increment display value)', () => {
    const { component } = createComponent({ isFragmentMode: true, value: 3 });

    expect(component.newSelection).toEqual(['specific']);
    expect(component.newValue).toBe(4);
  });

  it('should initialize with non-specific selection when value is a keyword', () => {
    const { component } = createComponent({ isFragmentMode: false, value: 'SUM' });

    expect(component.newSelection).toEqual(['SUM']);
    expect(component.newValue).toBe(0);
  });

  it('should default selection to ANY when value is falsy/non-number', () => {
    const { component } = createComponent({ isFragmentMode: false, value: null });

    expect(component.newSelection).toEqual(['ANY']);
    expect(component.newValue).toBe(0);
  });

  it('okButtonClick should close with newValue - 1 when specific is selected', () => {
    const { component, dialogRef } = createComponent({ isFragmentMode: true, value: 1 });

    component.newSelection = ['specific'];
    component.newValue = 10;

    component.okButtonClick();

    expect(dialogRef.close).toHaveBeenCalledWith(9);
  });

  it('okButtonClick should close with selected keyword when not specific', () => {
    const { component, dialogRef } = createComponent({ isFragmentMode: true, value: 'ANY' });

    component.newSelection = ['ANY_OPEN'];
    component.newValue = 123;

    component.okButtonClick();

    expect(dialogRef.close).toHaveBeenCalledWith('ANY_OPEN');
  });
});
