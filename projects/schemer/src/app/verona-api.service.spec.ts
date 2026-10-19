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
      source: window.parent,
      data: {
        type: 'vosStartCommand',
        sessionId: 's1',
        variables: [],
        schemerConfig: { directDownloadUrl: '', role: 'super' }
      }
    }));
  });

  ['missing', 'self', 'child'].forEach(sender => {
    it(`should ignore a start command from ${sender} instead of the host`, () => {
      const service = TestBed.inject(VeronaAPIService);
      const start = jasmine.createSpy('start');
      service.sessionID = 'active-session';
      service.vosStartCommand.subscribe(start);
      const child = document.createElement('iframe');
      document.body.appendChild(child);
      try {
        const sources: Record<string, MessageEventSource | null> = {
          missing: null,
          self: window,
          child: child.contentWindow
        };
        window.dispatchEvent(new MessageEvent('message', {
          source: sources[sender],
          origin: window.location.origin,
          data: {
            type: 'vosStartCommand',
            sessionId: 'active-session',
            variables: [],
            schemerConfig: { role: 'super' }
          }
        }));

        expect(start).not.toHaveBeenCalled();
        expect(service.sessionID).toBe('active-session');
      } finally {
        child.remove();
      }
    });
  });

  ['https://studio.example.test', 'null'].forEach(origin => {
    it(`should accept the host with origin ${origin}`, () => {
      const service = TestBed.inject(VeronaAPIService);
      const start = jasmine.createSpy('start');
      service.vosStartCommand.subscribe(start);
      window.dispatchEvent(new MessageEvent('message', {
        source: window.parent,
        origin,
        data: { type: 'vosStartCommand', sessionId: 'host-session' }
      }));

      expect(start).toHaveBeenCalledTimes(1);
      expect(service.sessionID).toBe('host-session');
    });
  });

  it('sendVosReadyNotification should log in standalone mode', () => {
    const service = TestBed.inject(VeronaAPIService);
    const logSpy = spyOn(console, 'log');

    (service as unknown as { isStandalone: () => boolean }).isStandalone = () => true;

    service.sendVosReadyNotification({ a: '1' });

    expect(logSpy).toHaveBeenCalled();
    const payload = logSpy.calls.mostRecent().args[1] as Record<string, unknown>;
    expect(payload['type']).toBe('vosReadyNotification');
    expect(JSON.parse(payload['metadata'] as string)).toEqual({ a: '1' });
  });

  it('should send nested JSON-LD metadata in embedded mode', () => {
    const service = TestBed.inject(VeronaAPIService);
    const postSpy = spyOn(window.parent, 'postMessage');
    (service as unknown as { isStandalone: () => boolean }).isStandalone = () => false;
    const metadata = {
      '@type': 'schemer',
      apiVersion: '3.2.0',
      name: { de: 'IQB-Schemer', en: 'IQB Schemer' }
    };

    service.sendVosReadyNotification(metadata);

    const payload = postSpy.calls.mostRecent().args[0] as Record<string, unknown>;
    expect(payload['type']).toBe('vosReadyNotification');
    expect(JSON.parse(payload['metadata'] as string)).toEqual(metadata);
  });

  [undefined, null, '', '   ', 123].forEach(sessionId => {
    it(`should ignore a start command with invalid sessionId ${JSON.stringify(sessionId)}`, () => {
      const service = TestBed.inject(VeronaAPIService);
      service.sessionID = 'active-session';
      const start = jasmine.createSpy('start');
      service.vosStartCommand.subscribe(start);

      window.dispatchEvent(new MessageEvent('message', {
        source: window.parent,
        data: { type: 'vosStartCommand', sessionId, variables: [] }
      }));

      expect(start).not.toHaveBeenCalled();
      expect(service.sessionID).toBe('active-session');
    });
  });

  it('should ignore webpackOk and webpackClose messages without warning', () => {
    const service = TestBed.inject(VeronaAPIService);
    const warnSpy = spyOn(console, 'warn');

    window.dispatchEvent(new MessageEvent('message', { source: window.parent, data: { type: 'webpackOk' } }));
    window.dispatchEvent(new MessageEvent('message', { source: window.parent, data: { type: 'webpackClose' } }));

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

    window.dispatchEvent(new MessageEvent('message', { source: window.parent, data: { type: 'somethingElse' } }));

    expect(warnSpy).toHaveBeenCalled();
    expect(service.sessionID).toBe('');
  });

  it('sendVosSchemeChangedNotification should postMessage in embedded mode and include sessionId', () => {
    const service = TestBed.inject(VeronaAPIService);
    const postSpy = spyOn(window.parent, 'postMessage');

    (service as unknown as { isStandalone: () => boolean }).isStandalone = () => false;

    // establish sessionId via start command
    window.dispatchEvent(new MessageEvent('message', {
      source: window.parent,
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
    const timestamp = payload['timeStamp'] as string;
    expect(new Date(timestamp).toISOString()).toBe(timestamp);
    expect(JSON.parse(payload['codingScheme'] as string).version).toBe('3.5');
    expect(payload['codingSchemeType']).toBe('iqb@3.5');
  });

  it('should not send scheme changes without a host session', () => {
    const service = TestBed.inject(VeronaAPIService);
    const postSpy = spyOn(window.parent, 'postMessage');
    (service as unknown as { isStandalone: () => boolean }).isStandalone = () => false;

    service.sendVosSchemeChangedNotification(null);

    expect(postSpy).not.toHaveBeenCalled();
  });
});
