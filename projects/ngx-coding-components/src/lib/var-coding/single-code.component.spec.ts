import { CodeData } from '@iqbspecs/coding-scheme/coding-scheme.interface';
import { DEFAULT_RESIDUAL_MANUAL_INSTRUCTION } from '../services/schemer-code-ops';
import { SchemerService } from '../services/schemer.service';
import { SingleCodeComponent } from './single-code.component';

describe('SingleCodeComponent', () => {
  let component: SingleCodeComponent;

  beforeEach(() => {
    component = new SingleCodeComponent({
      userRole: 'RW_MAXIMAL',
      copySingleCode: jasmine.createSpy('copySingleCode'),
      deleteCode: jasmine.createSpy('deleteCode')
    } as unknown as SchemerService);
  });

  it('setCodeType should add default manualInstruction for RESIDUAL_AUTO', () => {
    component.code = {
      id: 1,
      type: 'FULL_CREDIT',
      label: '',
      score: 1,
      manualInstruction: ''
    } as unknown as CodeData;
    const emitSpy = spyOn(component.codeDataChanged, 'emit');

    component.setCodeType('RESIDUAL_AUTO');

    expect(component.code.type).toBe('RESIDUAL_AUTO');
    expect(component.code.manualInstruction).toBe(DEFAULT_RESIDUAL_MANUAL_INSTRUCTION);
    expect(emitSpy).toHaveBeenCalledWith(component.code);
  });

  it('setCodeType should not overwrite existing manualInstruction', () => {
    component.code = {
      id: 1,
      type: 'FULL_CREDIT',
      label: '',
      score: 1,
      manualInstruction: '<p>custom</p>'
    } as unknown as CodeData;

    component.setCodeType('RESIDUAL_AUTO');

    expect(component.code.manualInstruction).toBe('<p>custom</p>');
  });

  it('should show RESIDUAL_AUTO manual instructions only for SOLVER codings', () => {
    component.code = {
      id: 0,
      type: 'RESIDUAL_AUTO',
      label: '',
      score: 0,
      manualInstruction: DEFAULT_RESIDUAL_MANUAL_INSTRUCTION
    } as unknown as CodeData;

    component.sourceType = 'BASE';
    expect(component.showManualOnlyInstruction()).toBeFalse();
    expect(component.showSideInstruction()).toBeFalse();
    expect(component.suppressResidualAutoWarning()).toBeFalse();

    component.sourceType = 'SOLVER';
    expect(component.showManualOnlyInstruction()).toBeTrue();
    expect(component.showSideInstruction()).toBeTrue();
    expect(component.suppressResidualAutoWarning()).toBeTrue();
  });
});
