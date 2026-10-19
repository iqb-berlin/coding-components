import { Inject, Injectable } from '@angular/core';
import { fromEvent, Observable, Subject } from 'rxjs';
import { DOCUMENT } from '@angular/common';
import {
  CodingScheme,
  CodingSchemeVersionMajor,
  CodingSchemeVersionMinor
} from '@iqbspecs/coding-scheme';
import { VariableCodingData } from '@iqbspecs/coding-scheme/coding-scheme.interface';
import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';

export interface VariableInfoShort {
  id: string,
  alias: string,
  label: string,
  page: string
}

@Injectable({
  providedIn: 'root'
})
export class VeronaAPIService {
  sessionID: string = '';
  metadata: Record<string, unknown> = {};
  private _vosStartCommand = new Subject<VosStartCommand>();

  // eslint-disable-next-line class-methods-use-this
  private isStandalone = (): boolean => window === window.parent;

  constructor(@Inject(DOCUMENT) private document: Document) {
    const metadata: string | null | undefined = document.getElementById('meta_data')?.textContent;
    if (metadata) {
      this.metadata = JSON.parse(metadata);
    }
    fromEvent<MessageEvent>(window, 'message')
      .subscribe((event): void => {
        // Window identity also works when the host or module has an opaque origin.
        if (event.source !== window.parent) return;
        this.handleMessage(event.data);
      });
  }

  private handleMessage(messageData: unknown): void {
    if (!messageData || typeof messageData !== 'object' || !('type' in messageData)) return;
    const message = messageData as VosStartCommand;
    if (message.type === 'vosStartCommand') {
      if (typeof message.sessionId !== 'string' || !message.sessionId.trim()) return;
      this.sessionID = message.sessionId;
      this._vosStartCommand.next(message);
    } else if (['webpackOk', 'webpackClose'].indexOf(message.type) < 0) {
      // eslint-disable-next-line no-console
      console.warn('Unknown message type:', message.type);
    }
  }

  private send(message: Record<string, string> | VosSchemeChangedData): void {
    // prevent posts in local (dev) mode
    if (!this.isStandalone()) {
      window.parent.postMessage(message, '*');
    } else {
      // eslint-disable-next-line no-console
      console.log('PostMessage to parent ignored (standalone mode):', message);
    }
  }

  sendVosReadyNotification(metaData: Record<string, unknown>): void {
    this.send({
      type: 'vosReadyNotification',
      metadata: JSON.stringify(metaData)
    });
  }

  sendVosSchemeChangedNotification(scheme: CodingScheme | null): void {
    if (!this.sessionID) return;
    const newScheme = {
      variableCodings: scheme ? scheme.variableCodings : [],
      version: `${CodingSchemeVersionMajor}.${CodingSchemeVersionMinor}`
    };
    this.send(<VosSchemeChangedData>{
      type: 'vosSchemeChangedNotification',
      sessionId: this.sessionID,
      timeStamp: new Date().toISOString(),
      codingScheme: JSON.stringify(newScheme),
      codingSchemeType: `iqb@${CodingSchemeVersionMajor}.${CodingSchemeVersionMinor}`,
      variables: scheme ? scheme.variableCodings.map((c: VariableCodingData) => <VariableInfoShort>{
        id: c.id,
        alias: c.alias || c.id,
        label: c.label || '',
        page: c.page || ''
      }) : []
    });
  }

  get vosStartCommand(): Observable<VosStartCommand> {
    return this._vosStartCommand.asObservable();
  }
}

export interface VosStartCommandConfig {
  directDownloadUrl?: string,
  role?: 'guest' | 'commenter' | 'developer' | 'maintainer' | 'super';
}

export interface VosStartCommand {
  type: 'vosStartCommand'
  sessionId: string,
  codingScheme?: string,
  codingSchemeType?: string,
  variables?: VariableInfo[],
  schemerConfig?: VosStartCommandConfig
}

export interface VosSchemeChangedData {
  type: 'vosSchemeChangedNotification'
  sessionId: string,
  timeStamp: string,
  codingScheme: string,
  codingSchemeType: string,
  variables: VariableInfoShort[]
}
