import { provideZonelessChangeDetection, signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ResolveOrphanCodingsDialogComponent } from './resolve-orphan-codings-dialog.component';
import { OrphanCodingConflict } from '../services/orphan-coding-resolution';

describe('ResolveOrphanCodingsDialogComponent', () => {
  let canEdit: WritableSignal<boolean>;
  const conflict = (): OrphanCodingConflict => ({
    current: { id: 'current', alias: 'response', type: 'string' } as never,
    previous: {
      id: 'previous',
      alias: 'response',
      sourceType: 'BASE',
      manualInstruction: '<p>Original instructions</p>',
      codes: [{ id: 1, score: 3 }]
    },
    dependents: [{
      id: 'derived', alias: 'sum', sourceType: 'SUM_SCORE', deriveSources: ['previous']
    }]
  });
  const create = (conflicts = [conflict()]) => {
    const close = jasmine.createSpy('close');
    TestBed.configureTestingModule({
      imports: [ResolveOrphanCodingsDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: MatDialogRef, useValue: { close } },
        { provide: MAT_DIALOG_DATA, useValue: { conflicts, canEdit: () => canEdit() } }
      ]
    });
    const fixture = TestBed.createComponent(ResolveOrphanCodingsDialogComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, close };
  };

  beforeEach(() => { canEdit = signal(true); });

  it('shows the full instructions and warns that dependent sources need repair after starting empty', () => {
    const { fixture } = create();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('Original instructions');
    expect(element.textContent).toContain('Score 3');
    expect(element.textContent).toContain('fehlenden Quellen müssen anschließend');
    expect(element.textContent).toContain('sum');
  });

  it('collects all choices before committing and cancels a partial selection without a payload', () => {
    const conflicts = [conflict(), conflict()];
    const before = JSON.stringify(conflicts);
    const { component, close } = create(conflicts);
    component.decide('TRANSFER');
    expect(component.index).toBe(1);
    expect(close).not.toHaveBeenCalled();
    component.cancel();
    expect(close).toHaveBeenCalledOnceWith();
    expect(JSON.stringify(conflicts)).toBe(before);
  });

  it('returns mixed choices after the last conflict', () => {
    const { component, close } = create([conflict(), conflict()]);
    component.decide('TRANSFER');
    component.decide('START_EMPTY');
    expect(close).toHaveBeenCalledOnceWith(['TRANSFER', 'START_EMPTY']);
  });

  it('does not change the committed payload when an action is clicked twice during closing', () => {
    const { component, close } = create();
    component.decide('TRANSFER');
    component.decide('START_EMPTY');
    component.cancel();
    expect(close).toHaveBeenCalledOnceWith(['TRANSFER']);
  });

  it('does not confirm a second conflict with the second click of a double click', () => {
    const { component, fixture, close } = create([conflict(), conflict()]);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[color="primary"]');
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    fixture.detectChanges();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 2 }));
    expect(component.index).toBe(1);
    expect(close).not.toHaveBeenCalled();
  });

  it('disables editing and rejects direct decisions when rights become read-only', () => {
    const { component, fixture, close } = create();
    canEdit.set(false);
    fixture.detectChanges();
    expect([...fixture.nativeElement.querySelectorAll('button')].filter(button => button.disabled).length).toBe(2);
    component.decide('TRANSFER');
    expect(close).not.toHaveBeenCalled();
  });

  it('sanitizes the preview without changing the original instructions', () => {
    const entry = conflict();
    entry.previous.manualInstruction = '<p onclick="window.unwanted=true">Original</p>';
    const { fixture } = create([entry]);
    expect(fixture.nativeElement.querySelector('.instruction [onclick]')).toBeNull();
    expect(entry.previous.manualInstruction).toContain('onclick');
  });
});
