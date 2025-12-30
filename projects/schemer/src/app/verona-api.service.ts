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
  metadata: Record<string, string> = {};
  private _vosStartCommand = new Subject<VosStartCommand>();

  // eslint-disable-next-line class-methods-use-this
  private isStandalone = (): boolean => window === window.parent;

  constructor(@Inject(DOCUMENT) private document: Document) {
    const metadata: string | null | undefined = document.getElementById('meta_data')?.textContent;
    if (metadata) {
      this.metadata = JSON.parse(metadata);
    }
    fromEvent(window, 'message')
      .subscribe((event: Event): void => {
        this.handleMessage((event as MessageEvent).data);
      });
  }

  private handleMessage(messageData: VosStartCommand): void {
    if (messageData.type === 'vosStartCommand') {
      this.sessionID = messageData.sessionId;
      this._vosStartCommand.next(messageData as VosStartCommand);
    } else if (['webpackOk', 'webpackClose'].indexOf(messageData.type) < 0) {
      // eslint-disable-next-line no-console
      console.warn('Unknown message type:', messageData.type);
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

  sendVosReadyNotification(metaData: Record<string, string>): void {
    this.send({
      type: 'vosReadyNotification',
      ...metaData
    });
  }

  sendVosSchemeChangedNotification(scheme: CodingScheme | null): void {
    const newScheme = {
      variableCodings: scheme ? scheme.variableCodings : [],
      version: `${CodingSchemeVersionMajor}.${CodingSchemeVersionMinor}`
    };
    this.send(<VosSchemeChangedData>{
      type: 'vosSchemeChangedNotification',
      sessionId: this.sessionID,
      timeStamp: String(Date.now()),
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
  directDownloadUrl: string,
  role: 'guest' | 'commenter' | 'developer' | 'maintainer' | 'super';
}

export interface VosStartCommand {
  type: 'vosStartCommand'
  sessionId: string,
  codingScheme?: string,
  codingSchemeType?: string,
  variables: VariableInfo[],
  schemerConfig: VosStartCommandConfig
}

export interface VosSchemeChangedData {
  type: 'vosSchemeChangedNotification'
  sessionId: string,
  timeStamp: string,
  codingScheme: string,
  codingSchemeType: string,
  variables: VariableInfoShort[]
}
