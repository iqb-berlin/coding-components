import { provideZonelessChangeDetection, signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ResolveOrphanCodingsDialogComponent } from './resolve-orphan-codings-dialog.component';
import { OrphanCodingConflict } from '../services/orphan-coding-resolution';

describe('ResolveOrphanCodingsDialogComponent', () => {
  let canEdit: WritableSignal<boolean>;
  const conflict = (): OrphanCodingConflict => ({
    current: { id: 'current', alias: 'response', type: 'string' } as never,
    candidates: [{
      id: 'previous',
      alias: 'response',
      sourceType: 'BASE',
      manualInstruction: '<p>Original instructions</p>',
      codes: [{ id: 1, score: 3, manualInstruction: '<p>Code instruction</p>' }]
    }],
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
    expect(element.textContent).toContain('Quellen gelöschter Kodierungen müssen anschließend');
    expect(element.querySelector('details, pre, img')).toBeNull();
    expect(element.textContent).toContain('Code instruction');
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
    expect(close).toHaveBeenCalledOnceWith({ decisions: ['TRANSFER', 'START_EMPTY'], discardedIds: [] });
  });

  it('does not change the committed payload when an action is clicked twice during closing', () => {
    const { component, close } = create();
    component.decide('TRANSFER');
    component.decide('START_EMPTY');
    component.cancel();
    expect(close).toHaveBeenCalledOnceWith({ decisions: ['TRANSFER'], discardedIds: [] });
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
    entry.candidates[0].manualInstruction = '<p onclick="window.unwanted=true">Original</p>';
    const { fixture } = create([entry]);
    expect(fixture.nativeElement.querySelector('[onclick]')).toBeNull();
    expect(entry.candidates[0].manualInstruction).toContain('onclick');
  });

  it('requires explicit cleanup, allows undo, and never changes the candidate data', () => {
    const entry = conflict();
    entry.candidates.push({ ...entry.candidates[0], id: 'older', manualInstruction: 'Older instructions' });
    const before = JSON.stringify(entry);
    const { component, fixture, close } = create([entry]);
    const transfer: HTMLButtonElement = fixture.nativeElement.querySelector('button[color="primary"]');
    expect(transfer.disabled).toBeTrue();
    component.decide('TRANSFER');
    expect(close).not.toHaveBeenCalled();
    component.discard('older');
    component.discard('previous');
    expect(component.discardedIds).toEqual(['older']);
    component.restore('older');
    expect(component.candidates.length).toBe(2);
    component.discard('previous');
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    expect(transfer.disabled).toBeFalse();
    component.decide('TRANSFER');
    expect(close).toHaveBeenCalledOnceWith({ decisions: ['TRANSFER'], discardedIds: ['previous'] });
    expect(JSON.stringify(entry)).toBe(before);
  });

  it('discards staged deletions on cancel and blocks cleanup after write access is revoked', () => {
    const entry = conflict();
    entry.candidates.push({ ...entry.candidates[0], id: 'older' });
    const { component, close } = create([entry]);
    component.discard('older');
    canEdit.set(false);
    component.restore('older');
    expect(component.discardedIds).toEqual(['older']);
    component.decide('TRANSFER');
    expect(close).not.toHaveBeenCalled();
    component.cancel();
    expect(close).toHaveBeenCalledOnceWith();
    expect(entry.candidates.length).toBe(2);
  });
});
