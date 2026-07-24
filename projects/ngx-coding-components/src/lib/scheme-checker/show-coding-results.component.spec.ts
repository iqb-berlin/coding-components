import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { Response } from '@iqbspecs/response/response.interface';
import { VariableCodingData } from '@iqbspecs/coding-scheme/coding-scheme.interface';
import {
  ShowCodingResultsComponent,
  ShowCodingResultsData
} from './show-coding-results.component';

describe('ShowCodingResultsComponent', () => {
  let component: ShowCodingResultsComponent;

  const baseData: ShowCodingResultsData = {
    responses: [
      { id: 'v1', value: 'a', status: 'VALUE_CHANGED' } as Response,
      { id: 'v2', value: ['x', 'y'], status: 'DISPLAYED' } as Response
    ],
    varsWithCodes: ['v1'],
    variableCodings: [
      { id: 'v1', alias: 'A', sourceType: 'BASE' } as unknown as VariableCodingData,
      { id: 'v2', alias: 'B', sourceType: 'BASE' } as unknown as VariableCodingData
    ]
  };

  beforeEach(() => {
    component = new ShowCodingResultsComponent(baseData);
    component.ngOnInit();
  });

  it('should build table data and filter to coded variables by default', () => {
    expect(component.codedVariablesOnly).toBeTrue();
    expect((component.dataSource.data as unknown[]).length).toBe(1);
    expect((component.dataSource.data as unknown as { id: string }[])[0].id).toBe('v1');
  });

  it('should include subform column if any response has subform', () => {
    const c2 = new ShowCodingResultsComponent({
      ...baseData,
      responses: [
        {
          id: 'v1', value: 'a', status: 'VALUE_CHANGED', subform: 's1'
        } as unknown as Response
      ]
    });
    c2.ngOnInit();

    expect(c2.displayedColumns[0]).toBe('subform');
  });

  it('toggleChange should flip rawResponsesView without rebuilding data', () => {
    const rebuildSpy = spyOn(component as unknown as { rebuildTableData: () => void }, 'rebuildTableData');

    component.toggleChange({
      source: { name: 'rawResponsesView' }
    } as unknown as MatSlideToggleChange);

    expect(component.rawResponsesView).toBeTrue();
    expect(rebuildSpy).not.toHaveBeenCalled();
  });

  it('toggleChange should rebuild data when codedVariablesOnly is toggled', () => {
    const rebuildSpy = spyOn(component as unknown as
      { rebuildTableData: () => void }, 'rebuildTableData').and.callThrough();

    component.toggleChange({
      source: { name: 'codedVariablesOnly' }
    } as unknown as MatSlideToggleChange);

    expect(component.codedVariablesOnly).toBeFalse();
    expect(rebuildSpy).toHaveBeenCalled();
    expect((component.dataSource.data as unknown[]).length).toBe(2);
  });

  it('toggleChange should add transformed column and rebuild', () => {
    component.toggleChange({
      source: { name: 'transformedValueView' }
    } as unknown as MatSlideToggleChange);

    expect(component.transformedValueView).toBeTrue();
    expect(component.displayedColumns.includes('transformed')).toBeTrue();
  });

  it('should resolve coded response aliases and preserve fragment strings', () => {
    const aliasComponent = new ShowCodingResultsComponent({
      responses: [
        {
          id: 'visible-id',
          value: String.raw`\frac12`,
          status: 'VALUE_CHANGED'
        } as Response
      ],
      varsWithCodes: ['visible-id'],
      variableCodings: [
        {
          id: 'internal-id',
          alias: 'visible-id',
          sourceType: 'BASE',
          fragmenting: String.raw`^\\frac\{?(\d+)\}?\{?(\d+)\}?$`
        } as unknown as VariableCodingData
      ]
    });
    aliasComponent.ngOnInit();

    aliasComponent.toggleChange({
      source: { name: 'transformedValueView' }
    } as unknown as MatSlideToggleChange);

    const rows = aliasComponent.dataSource.data as { transformed: string }[];
    expect(rows[0].transformed).toBe('["1","2"]');
  });

  it('should fall back to the internal variable id', () => {
    const idComponent = new ShowCodingResultsComponent({
      responses: [
        {
          id: 'internal-id',
          value: 'ABC-007',
          status: 'VALUE_CHANGED'
        } as Response
      ],
      varsWithCodes: ['internal-id'],
      variableCodings: [
        {
          id: 'internal-id',
          alias: 'visible-id',
          sourceType: 'BASE',
          fragmenting: String.raw`^([A-Z]+)-(\d+)$`
        } as unknown as VariableCodingData
      ]
    });
    idComponent.ngOnInit();

    idComponent.toggleChange({
      source: { name: 'transformedValueView' }
    } as unknown as MatSlideToggleChange);

    const rows = idComponent.dataSource.data as { transformed: string }[];
    expect(rows[0].transformed).toBe('["ABC","007"]');
  });

  it('should transform sorted arrays and retain empty fragment matches', () => {
    const arrayComponent = new ShowCodingResultsComponent({
      responses: [
        {
          id: 'visible-id',
          value: ['B-02', 'no match', 'A-01'],
          status: 'VALUE_CHANGED'
        } as Response
      ],
      varsWithCodes: ['visible-id'],
      variableCodings: [
        {
          id: 'internal-id',
          alias: 'visible-id',
          sourceType: 'BASE',
          processing: ['SORT_ARRAY'],
          fragmenting: String.raw`^([A-Z])-(\d+)$`
        } as unknown as VariableCodingData
      ]
    });
    arrayComponent.ngOnInit();

    arrayComponent.toggleChange({
      source: { name: 'transformedValueView' }
    } as unknown as MatSlideToggleChange);

    const rows = arrayComponent.dataSource.data as { transformed: string }[];
    expect(rows[0].transformed).toBe('[["A","01"],["B","02"],[]]');
  });

  it('should disable transformed values when variable codings are missing', () => {
    const dataWithoutVariableCodings = {
      responses: baseData.responses,
      varsWithCodes: baseData.varsWithCodes
    } as unknown as ShowCodingResultsData;
    const unavailableComponent =
      new ShowCodingResultsComponent(dataWithoutVariableCodings);
    unavailableComponent.ngOnInit();

    unavailableComponent.toggleChange({
      source: { name: 'transformedValueView' }
    } as unknown as MatSlideToggleChange);

    expect(unavailableComponent.transformedValuesAvailable).toBeFalse();
    expect(unavailableComponent.transformedValueView).toBeFalse();
    expect(unavailableComponent.displayedColumns).not.toContain('transformed');
  });

  it('applyFilter should set the dataSource filter to trimmed lower-case', () => {
    component.applyFilter({
      target: { value: '  ABC  ' }
    } as unknown as Event);

    expect(component.dataSource.filter).toBe('abc');
  });

  it('should stringify values robustly (string, undefined, null, object)', () => {
    const stringify = (ShowCodingResultsComponent as unknown as
      { stringifyValue: (v: unknown) => string }).stringifyValue;

    expect(stringify('x')).toBe('x');
    expect(stringify(undefined)).toBe('');
    expect(stringify(null)).toBe('null');
    expect(stringify({ a: 1 })).toBe('{"a":1}');
  });

  it('should return transformed error object when CodingFactory.transformValue throws', () => {
    const transformSpy = spyOn(component as unknown as { transformValue: () => unknown }, 'transformValue')
      .and.throwError('boom');

    component.toggleChange({
      source: { name: 'transformedValueView' }
    } as unknown as MatSlideToggleChange);

    const rows = component.dataSource.data as unknown as { transformed: string }[];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].transformed).toContain('boom');

    expect(transformSpy).toHaveBeenCalled();
  });
});
