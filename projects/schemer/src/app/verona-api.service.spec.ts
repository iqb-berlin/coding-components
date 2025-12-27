import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { take } from 'rxjs';

import { VeronaAPIService } from './verona-api.service';

describe('VeronaAPIService', () => {
  const createDocumentWithMetadata = (metadata: unknown): Document => {
    const doc = document.implementation.createHTMLDocument('test');
    const metaEl = doc.createElement('div');
    metaEl.id = 'meta_data';
    metaEl.textContent = JSON.stringify(metadata);
    doc.body.appendChild(metaEl);
    return doc;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DOCUMENT,
          useValue: createDocumentWithMetadata({ foo: 'bar' })
        }
      ]
    });
  });

  it('should parse metadata from #meta_data', () => {
    const service = TestBed.inject(VeronaAPIService);
    expect(service.metadata).toEqual({ foo: 'bar' });
  });

  it('should emit vosStartCommand on window message event', done => {
    const service = TestBed.inject(VeronaAPIService);

    service.vosStartCommand.pipe(take(1)).subscribe(cmd => {
      expect(cmd.type).toBe('vosStartCommand');
      expect(cmd.sessionId).toBe('s1');
      done();
    });

    window.dispatchEvent(new MessageEvent('message', {
      data: {
        type: 'vosStartCommand',
        sessionId: 's1',
        variables: [],
        schemerConfig: { directDownloadUrl: '', role: 'super' }
      }
    }));
  });

  it('sendVosReadyNotification should log in standalone mode', () => {
    const service = TestBed.inject(VeronaAPIService);
    const logSpy = spyOn(console, 'log');

    (service as unknown as { isStandalone: () => boolean }).isStandalone = () => true;

    service.sendVosReadyNotification({ a: '1' });

    expect(logSpy).toHaveBeenCalled();
    const payload = logSpy.calls.mostRecent().args[1] as Record<string, unknown>;
    expect(payload['type']).toBe('vosReadyNotification');
    expect(payload['a']).toBe('1');
  });

  it('should ignore webpackOk and webpackClose messages without warning', () => {
    const service = TestBed.inject(VeronaAPIService);
    const warnSpy = spyOn(console, 'warn');

    window.dispatchEvent(new MessageEvent('message', { data: { type: 'webpackOk' } }));
    window.dispatchEvent(new MessageEvent('message', { data: { type: 'webpackClose' } }));

    expect(warnSpy).not.toHaveBeenCalled();
    expect(service.sessionID).toBe('');
  });

  it('should warn on unknown message type', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DOCUMENT,
          useValue: createDocumentWithMetadata({ foo: 'bar' })
        }
      ]
    });

    const service = TestBed.inject(VeronaAPIService);
    const warnSpy = spyOn(console, 'warn');

    window.dispatchEvent(new MessageEvent('message', { data: { type: 'somethingElse' } }));

    expect(warnSpy).toHaveBeenCalled();
    expect(service.sessionID).toBe('');
  });

  it('sendVosSchemeChangedNotification should postMessage in embedded mode and include sessionId', () => {
    const service = TestBed.inject(VeronaAPIService);
    const postSpy = spyOn(window.parent, 'postMessage');

    (service as unknown as { isStandalone: () => boolean }).isStandalone = () => false;

    // establish sessionId via start command
    window.dispatchEvent(new MessageEvent('message', {
      data: {
        type: 'vosStartCommand',
        sessionId: 's1',
        variables: [],
        schemerConfig: { directDownloadUrl: '', role: 'super' }
      }
    }));

    service.sendVosSchemeChangedNotification(null);

    expect(postSpy).toHaveBeenCalled();
    const payload = postSpy.calls.mostRecent().args[0] as Record<string, unknown>;
    expect(payload['type']).toBe('vosSchemeChangedNotification');
    expect(payload['sessionId']).toBe('s1');
    expect(payload['codingScheme']).toBeDefined();
  });
});
