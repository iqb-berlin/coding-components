import { Subject } from 'rxjs';
import { DialogContext } from './dialog-context';

describe('DialogContext', () => {
  let task: object;
  let role: string;
  let context: DialogContext;
  let result: Subject<string>;
  let close: jasmine.Spy;

  beforeEach(() => {
    task = {};
    role = 'RW_MAXIMAL';
    context = new DialogContext(() => [task, role]);
    result = new Subject<string>();
    close = jasmine.createSpy('close');
  });

  it('delivers a result while its task and permissions remain current', () => {
    const received = jasmine.createSpy('received');
    context.afterClosed({ afterClosed: () => result, close }).subscribe(received);
    result.next('current');
    expect(received).toHaveBeenCalledOnceWith('current');
  });

  it('ignores a delayed result after the task changes', () => {
    const received = jasmine.createSpy('received');
    context.afterClosed({ afterClosed: () => result, close }).subscribe(received);
    task = {};
    result.next('old task');
    expect(received).not.toHaveBeenCalled();
  });

  it('ignores a delayed result after write access changes', () => {
    const received = jasmine.createSpy('received');
    context.afterClosed({ afterClosed: () => result, close }).subscribe(received);
    role = 'RO';
    result.next('old permission');
    expect(received).not.toHaveBeenCalled();
  });

  it('closes owned dialogs and unsubscribes before closing can emit a result', () => {
    const received = jasmine.createSpy('received');
    close.and.callFake(() => result.next('late confirmation'));
    context.afterClosed({ afterClosed: () => result, close }).subscribe(received);
    context.invalidate();
    expect(close).toHaveBeenCalledOnceWith();
    expect(received).not.toHaveBeenCalled();
  });

  it('invalidates pending file operations even when the same task is opened again', () => {
    const isCurrent = context.capture();
    context.invalidate();
    expect(isCurrent()).toBeFalse();
  });

  it('closes dialogs and rejects asynchronous results after its editor is destroyed', () => {
    const isCurrent = context.capture();
    const received = jasmine.createSpy('received');
    context.afterClosed({ afterClosed: () => result, close }).subscribe(received);
    context.destroy();
    result.next('late');
    expect(close).toHaveBeenCalledOnceWith();
    expect(received).not.toHaveBeenCalled();
    expect(isCurrent()).toBeFalse();
  });

  it('does not close an already finished dialog when its result changes the selection', () => {
    context.afterClosed({ afterClosed: () => result, close }).subscribe(() => context.invalidate());
    result.next('new selection');
    expect(close).not.toHaveBeenCalled();
  });
});
