import {
  EMPTY, filter, finalize, Observable, Subject, take, takeUntil, tap
} from 'rxjs';

interface ContextDialogRef<T> {
  afterClosed(): Observable<T>;
  close?(): void;
}

/** Keeps asynchronous editor results bound to the task, selection and permissions that opened them. */
export class DialogContext {
  private readonly invalidated = new Subject<void>();
  private readonly dialogs = new Set<ContextDialogRef<unknown>>();
  private generation = 0;
  private destroyed = false;

  constructor(private readonly readContext: () => readonly unknown[]) {}

  capture(): () => boolean {
    const generation = this.generation;
    const context = this.readContext();
    return () => {
      const current = this.readContext();
      return !this.destroyed && generation === this.generation &&
        context.length === current.length && context.every((value, index) => Object.is(value, current[index]));
    };
  }

  afterClosed<T>(dialog: ContextDialogRef<T>): Observable<T> {
    if (this.destroyed) {
      dialog.close?.();
      return EMPTY;
    }
    const isCurrent = this.capture();
    this.dialogs.add(dialog);
    return dialog.afterClosed().pipe(
      take(1),
      takeUntil(this.invalidated),
      tap(() => this.dialogs.delete(dialog)),
      filter(() => isCurrent()),
      finalize(() => this.dialogs.delete(dialog))
    );
  }

  invalidate(): void {
    this.generation += 1;
    const dialogs = [...this.dialogs];
    this.invalidated.next();
    this.dialogs.clear();
    dialogs.forEach(dialog => dialog.close?.());
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.invalidate();
    this.invalidated.complete();
  }
}
