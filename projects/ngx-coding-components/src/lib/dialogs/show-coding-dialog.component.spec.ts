import { ToTextFactory } from '@iqb/responses';
import { VariableCodingData } from '@iqbspecs/coding-scheme/coding-scheme.interface';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { ShowCodingDialogComponent } from './show-coding-dialog.component';

describe('ShowCodingDialogComponent', () => {
  beforeEach(() => {
    spyOn(ToTextFactory, 'sourceAsText').and.returnValue('SRC');
    spyOn(ToTextFactory, 'processingAsText').and.returnValue('PROC');
    spyOn(ToTextFactory, 'codeAsText').and.callFake((code: unknown, mode: unknown) => ({
      id: (code as { id: number }).id,
      score: (code as { score: number }).score,
      label: (code as { label: string }).label,
      ruleSetDescriptions: [`mode:${mode}`],
      ruleSetOperatorAnd: true,
      hasManualInstruction: false
    }));
  });

  it('constructor should set isSimpleMode based on incoming mode and build varCodingText', () => {
    const c = new ShowCodingDialogComponent({
      varCoding: {
        id: 'v1',
        alias: 'A1',
        label: 'L',
        sourceType: 'BASE',
        deriveSources: ['x'],
        processing: ['SORT_ARRAY'],
        fragmenting: 'f',
        manualInstruction: 'mi',
        codes: [{ id: 1, score: 1, label: 'c1' }]
      } as VariableCodingData,
      mode: 'SIMPLE'
    });

    expect(c.isSimpleMode).toBeTrue();
    expect(c.mode).toBe('SIMPLE');

    expect(ToTextFactory.sourceAsText).toHaveBeenCalledWith('A1', 'BASE', ['x']);
    expect(ToTextFactory.processingAsText).toHaveBeenCalledWith(['SORT_ARRAY'], 'f');
    expect(ToTextFactory.codeAsText).toHaveBeenCalledWith(jasmine.objectContaining({ id: 1 }), 'SIMPLE');

    expect(c.varCodingText?.id).toBe('A1');
    expect(c.varCodingText?.label).toBe('L');
    expect(c.varCodingText?.hasManualInstruction).toBeTrue();
    expect(c.varCodingText?.codes?.[0].ruleSetDescriptions[0]).toBe('mode:SIMPLE');
  });

  it('updateText should accept MatSlideToggleChange and switch mode to EXTENDED', () => {
    const c = new ShowCodingDialogComponent({
      varCoding: {
        id: 'v1',
        alias: '',
        label: '',
        sourceType: 'BASE',
        deriveSources: [],
        processing: [],
        fragmenting: '',
        manualInstruction: '',
        codes: [{ id: 1, score: 1, label: 'c1' }]
      } as VariableCodingData,
      mode: 'SIMPLE'
    });

    (ToTextFactory.codeAsText as jasmine.Spy).calls.reset();

    c.updateText({ checked: false } as MatSlideToggleChange);

    expect(c.mode).toBe('EXTENDED');
    expect(ToTextFactory.codeAsText).toHaveBeenCalledWith(jasmine.objectContaining({ id: 1 }), 'EXTENDED');
  });

  it('updateText should accept boolean and switch mode to SIMPLE', () => {
    const c = new ShowCodingDialogComponent({
      varCoding: {
        id: 'v1',
        alias: undefined,
        label: '',
        sourceType: 'BASE',
        deriveSources: [],
        processing: [],
        fragmenting: '',
        manualInstruction: '',
        codes: []
      } as VariableCodingData,
      mode: 'EXTENDED'
    });

    c.updateText(true);

    expect(c.mode).toBe('SIMPLE');
    expect(c.varCodingText?.id).toBe('v1');
  });
});
