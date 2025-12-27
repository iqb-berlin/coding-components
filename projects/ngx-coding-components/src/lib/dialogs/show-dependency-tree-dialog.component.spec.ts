import { CodingSchemeFactory, VariableGraphNode } from '@iqb/responses';
import { CodingScheme } from '@iqbspecs/coding-scheme';
import { ShowDependencyTreeDialogComponent } from './show-dependency-tree-dialog.component';

describe('ShowDependencyTreeDialogComponent', () => {
  it('should set errorMessage when CodingSchemeFactory.getVariableDependencyTree throws', () => {
    spyOn(CodingSchemeFactory, 'getVariableDependencyTree').and.throwError('boom');

    const c = new ShowDependencyTreeDialogComponent({
      variableCodings: []
    } as unknown as CodingScheme);

    expect(c.errorMessage).toBe('varList.derived-tree.error');
    expect(Array.from(c.varNodeRows.keys())).toEqual([]);
  });

  it('should compute varNodeRows for nodes with level > 0 in descending order', () => {
    spyOn(CodingSchemeFactory, 'getVariableDependencyTree').and.returnValue([
      {
        id: 'A', level: 0, sources: [], page: ''
      },
      {
        id: 'B', level: 1, sources: ['A'], page: ''
      },
      {
        id: 'C', level: 2, sources: ['A', 'B'], page: ''
      }
    ] as VariableGraphNode[]);

    const c = new ShowDependencyTreeDialogComponent({
      variableCodings: []
    } as unknown as CodingScheme);

    expect(c.errorMessage).toBe('');

    // Only levels > 0 are included
    expect(Array.from(c.varNodeRows.keys())).toEqual(['C', 'B']);

    expect(c.varNodeRows.get('B')).toEqual(['A']);
    expect(c.varNodeRows.get('C')).toEqual(['A', 'B']);
  });

  it('should set empty sources list when sources do not resolve to nodes', () => {
    spyOn(CodingSchemeFactory, 'getVariableDependencyTree').and.returnValue([
      {
        id: 'B', level: 1, sources: ['X'], page: ''
      }
    ] as VariableGraphNode[]);

    const c = new ShowDependencyTreeDialogComponent({
      variableCodings: []
    } as unknown as CodingScheme);

    expect(c.varNodeRows.get('B')).toEqual([]);
  });
});
