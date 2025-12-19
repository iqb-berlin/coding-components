import { ComboButtonComponent } from './combo-button.component';

describe('ComboButtonComponent', () => {
  it('selectValue should emit selectionChanged and close list', () => {
    const component = new ComboButtonComponent();
    component.isOpen = true;
    const emitSpy = spyOn(component.selectionChanged, 'emit');

    component.selectValue('x');

    expect(emitSpy).toHaveBeenCalledWith('x');
    expect(component.isOpen).toBeFalse();
  });
});
