import {Inject, Injectable} from '@angular/core';
import { fromEvent, Observable, Subject } from 'rxjs';
import {CodingScheme, VariableInfo, VariableInfoShort} from "@iqb/responses";
import {DOCUMENT} from "@angular/common";

@Injectable({
  providedIn: 'root'
})
export class VeronaAPIService {
  sessionID: string = '';
  metadata: Record<string, string> = {};
  private _vosStartCommand = new Subject<VosStartCommand>();

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
      console.warn('schemer: got message of unknown type', messageData);
    }
  }

  private send(message: Record<string, string> | VosSchemeChangedData): void {
    // prevent posts in local (dev) mode
    if (!this.isStandalone()) {
      window.parent.postMessage(message, '*');
    } else {
      console.log('schemer: send ', message);
    }
  }

  sendVosReadyNotification(metaData: Record<string, string>): void {
    this.send({
      type: 'vosReadyNotification',
      ...metaData
    });
  }

  sendVosSchemeChangedNotification(scheme: CodingScheme | null): void {
    this.send(<VosSchemeChangedData>{
      type: 'vosSchemeChangedNotification',
      sessionId: this.sessionID,
      timeStamp: String(Date.now()),
      codingScheme: JSON.stringify(scheme),
      codingSchemeType: 'iqb@2.0',
      variables: scheme ? scheme.variableCodings.map(c => <VariableInfoShort>{
        id: c.id,
        label: c.label,
        page: c.page || ''
      }) : []
    });
  }

  get vosStartCommand(): Observable<VosStartCommand> {
    return this._vosStartCommand.asObservable();
  }
}

export interface VosStartCommand {
  type: 'vosStartCommand'
  sessionId: string,
  codingScheme?: string,
  codingSchemeType?: string,
  variables: VariableInfo[]
}

export interface VosSchemeChangedData {
  type: 'vosSchemeChangedNotification'
  sessionId: string,
  timeStamp: string,
  codingScheme: string,
  codingSchemeType: 'iqb@2.0',
  variables: VariableInfoShort[]
}
