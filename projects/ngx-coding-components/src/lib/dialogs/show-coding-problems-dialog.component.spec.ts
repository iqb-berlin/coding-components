import { ShowCodingProblemsDialogComponent } from './show-coding-problems-dialog.component';

describe('ShowCodingProblemsDialogComponent', () => {
  it('should group problems by variableId and sort variable ids', () => {
    const problems = [
      {
        variableId: 'b', type: 'X', breaking: false, code: '1'
      },
      { variableId: 'a', type: 'Y', breaking: true },
      { variableId: 'b', type: 'Z', breaking: true }
    ] as Array<{ variableId: string; type: string; breaking: boolean; code?: string }>;

    const c = new ShowCodingProblemsDialogComponent(problems);

    expect(c.allVariables).toEqual(['a', 'b']);
    expect(c.codingProblemsGrouped['a'].length).toBe(1);
    expect(c.codingProblemsGrouped['b'].length).toBe(2);
    expect(c.codingProblemsGrouped['b'][0].type).toBe('X');
  });

  it('should handle empty problems list', () => {
    const c = new ShowCodingProblemsDialogComponent([] as Array<{ variableId: string; type: string; breaking: boolean }>);

    expect(c.allVariables).toEqual([]);
    expect(Object.keys(c.codingProblemsGrouped)).toEqual([]);
  });
});
