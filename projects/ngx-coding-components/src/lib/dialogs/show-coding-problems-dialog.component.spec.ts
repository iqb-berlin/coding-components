import { CodingSchemeProblem } from '@iqb/responses';
import { ShowCodingProblemsDialogComponent } from './show-coding-problems-dialog.component';

describe('ShowCodingProblemsDialogComponent', () => {
  it('should group problems by variableId and sort variable ids', () => {
    const problems: CodingSchemeProblem[] = [
      {
        variableId: 'b', variableLabel: 'B', type: 'VACANT', breaking: false, code: '1'
      },
      {
        variableId: 'a', variableLabel: 'A', type: 'SOURCE_MISSING', breaking: true
      },
      {
        variableId: 'b', variableLabel: 'B', type: 'INVALID_SOURCE', breaking: true
      }
    ];

    const c = new ShowCodingProblemsDialogComponent(problems);

    expect(c.allVariables).toEqual(['a', 'b']);
    expect(c.codingProblemsGrouped['a'].length).toBe(1);
    expect(c.codingProblemsGrouped['b'].length).toBe(2);
    expect(c.codingProblemsGrouped['b'][0].type).toBe('VACANT');
  });

  it('should handle empty problems list', () => {
    const c = new ShowCodingProblemsDialogComponent([]);

    expect(c.allVariables).toEqual([]);
    expect(Object.keys(c.codingProblemsGrouped)).toEqual([]);
  });
});
