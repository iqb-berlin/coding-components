import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { Response } from '@iqbspecs/response/response.interface';
import { VariableCodingData } from '@iqbspecs/coding-scheme/coding-scheme.interface';
import { ShowCodingResultsComponent } from './show-coding-results.component';

describe('ShowCodingResultsComponent', () => {
  let component: ShowCodingResultsComponent;

  const baseData = {
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
    component = new ShowCodingResultsComponent(baseData as unknown as never);
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
    } as unknown as never);
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
