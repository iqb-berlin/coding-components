import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';

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

    service.vosStartCommand.subscribe(cmd => {
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
});
