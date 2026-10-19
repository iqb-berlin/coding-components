import { Subject } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';
import { AppComponent } from './app.component';
import { VeronaAPIService, VosStartCommand } from './verona-api.service';

describe('AppComponent Verona start commands', () => {
  const createVariable = (id: string, type: VariableInfo['type']): VariableInfo => ({
    id, type, format: '', multiple: false, nullable: false, values: [], valuePositionLabels: []
  });
  let starts: Subject<VosStartCommand>;
  let component: AppComponent;

  beforeEach(() => {
    starts = new Subject<VosStartCommand>();
    const api = {
      metadata: {},
      vosStartCommand: starts.asObservable(),
      sendVosReadyNotification: jasmine.createSpy('ready'),
      sendVosSchemeChangedNotification: jasmine.createSpy('changed')
    };
    component = new AppComponent(
      api as unknown as VeronaAPIService,
      jasmine.createSpyObj<MatDialog>('dialog', ['open']),
      jasmine.createSpyObj<TranslateService>('translate', ['instant'])
    );
    component.ngOnInit();
  });

  afterEach(() => component.ngOnDestroy());

  it('accepts a start command containing only the required session', () => {
    starts.next({ type: 'vosStartCommand', sessionId: 'minimal-session' });

    expect(component.varList()).toEqual([]);
    expect(component.codings()?.variableCodings).toEqual([]);
  });

  it('clears a previous variable list and preserves the supplied scheme when variables are omitted', () => {
    starts.next({
      type: 'vosStartCommand',
      sessionId: 'first-unit',
      variables: [createVariable('previous', 'string')]
    });
    expect(component.varList().map(variable => variable.id)).toEqual(['previous']);

    starts.next({
      type: 'vosStartCommand',
      sessionId: 'next-unit',
      codingScheme: JSON.stringify({
        version: '3.5',
        variableCodings: [{ id: 'saved', sourceType: 'BASE', label: 'Preserved coding' }]
      })
    });

    expect(component.varList()).toEqual([]);
    expect(component.codings()?.variableCodings.map(variable => variable.id)).toEqual(['saved']);
    expect(component.codings()?.variableCodings[0].label).toBe('Preserved coding');
  });

  it('retains Variable Info 1.x no-value semantics and accepts configuration without a role', () => {
    starts.next({
      type: 'vosStartCommand',
      sessionId: 'studio-unit',
      variables: [createVariable('caption', 'no-value'), createVariable('answer', 'integer')],
      schemerConfig: { directDownloadUrl: '/api/workspace/1/download/' }
    });

    expect(component.codings()?.variableCodings.map(variable => ({
      id: variable.id, sourceType: variable.sourceType
    }))).toEqual([
      { id: 'caption', sourceType: 'BASE_NO_VALUE' },
      { id: 'answer', sourceType: 'BASE' }
    ]);
    expect(component.userRole()).toBe('RW_MAXIMAL');
  });
});
