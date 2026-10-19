import { Subject } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';
import { CodingFactory, CodingSchemeFactory } from '@iqb/responses';
import { resolveOrphanCodings } from '@ngx-coding-components/services/orphan-coding-resolution';
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

  ['no-value', 'NO_VALUE'].forEach(type => {
    it(`classifies ${type} and minimal input identically without rewriting host variables`, () => {
      const payload = [
        {
          id: 'state', type, page: 'old-page', visualAnchor: 'old-anchor', extension: { keep: true }
        },
        { id: 'answer', type: 'INTEGER' }
      ];
      const variables: VariableInfo[] = JSON.parse(JSON.stringify(payload));
      starts.next({ type: 'vosStartCommand', sessionId: 'spelling', variables });
      expect(component.codings()?.variableCodings.map(variable => ({
        id: variable.id, sourceType: variable.sourceType
      }))).toEqual([
        { id: 'state', sourceType: 'BASE_NO_VALUE' },
        { id: 'answer', sourceType: 'BASE' }
      ]);
      expect(component.varList()).toBe(variables);
      expect(variables).toEqual(JSON.parse(JSON.stringify(payload)));
    });
  });

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

  (['TRANSFER', 'START_EMPTY'] as const).forEach(decision => {
    it(`preserves the original source namespace through a Verona orphan recovery with ${decision}`, () => {
      const source = { ...CodingFactory.createCodingVariable('response'), alias: 'Other' };
      const orphan = {
        ...CodingFactory.createCodingVariable('old'), alias: 'Response', codes: [{ id: 1, score: 2 }]
      };
      const calculation = {
        ...CodingFactory.createCodingVariable('derived'),
        alias: 'Result',
        sourceType: 'SOLVER' as const,
        deriveSources: ['old', 'response'],
        sourceParameters: {
          processing: [],
          // eslint-disable-next-line no-template-curly-in-string
          solverExpression: '${Response} + 10 * ${response}'
        }
      };
      const unrelated = {
        ...calculation,
        id: 'unrelated',
        alias: 'Unrelated',
        deriveSources: ['response'],
        // eslint-disable-next-line no-template-curly-in-string
        sourceParameters: { processing: [], solverExpression: '${response} + 1' }
      };
      const original = [orphan, source, calculation, unrelated];
      starts.next({
        type: 'vosStartCommand',
        sessionId: 'orphan-with-shadowed-source',
        variables: [
          { ...createVariable('current', 'number'), alias: 'response' },
          { ...createVariable('response', 'number'), alias: 'Other' },
          { ...createVariable('caption', 'no-value'), alias: 'Caption' }
        ],
        codingScheme: JSON.stringify({ version: '3.5', variableCodings: original })
      });

      const loaded = component.codings()!.variableCodings;
      expect(loaded).toEqual(original);
      const resolved = resolveOrphanCodings(component.varList(), loaded, [decision])!;
      expect(resolved.find(coding => coding.id === 'caption')?.sourceType).toBe('BASE_NO_VALUE');
      const unaffected = resolved.find(coding => coding.id === 'unrelated')!;
      expect(CodingSchemeFactory.deriveValue(resolved, unaffected, [
        { id: 'response', value: 5, status: 'VALUE_CHANGED' }
      ])).toEqual(jasmine.objectContaining({ value: 6, status: 'VALUE_CHANGED' }));
      if (decision === 'TRANSFER') {
        expect(CodingSchemeFactory.deriveValue(resolved, resolved.find(coding => coding.id === 'derived')!, [
          { id: 'current', value: 2, status: 'VALUE_CHANGED' },
          { id: 'response', value: 5, status: 'VALUE_CHANGED' }
        ])).toEqual(jasmine.objectContaining({ value: 52, status: 'VALUE_CHANGED' }));
      } else {
        expect(resolved.find(coding => coding.id === 'derived')?.deriveSources).toEqual(['old', 'response']);
      }
      expect(loaded).toEqual(original);
    });
  });
});
