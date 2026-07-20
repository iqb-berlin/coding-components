import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';
import {
  getVarListConflictAnalysis,
  isInvalidVarListAlias,
  isInvalidVarListId,
  isInvalidVarListName
} from './schemer-varlist-validation';

describe('schemer-varlist-validation', () => {
  it('isInvalidVarListName should require at least two valid characters', () => {
    expect(isInvalidVarListName('AA')).toBeFalse();
    expect(isInvalidVarListName('A')).toBeTrue();
    expect(isInvalidVarListName('A B')).toBeTrue();
    expect(isInvalidVarListName('')).toBeTrue();
  });

  it('isInvalidVarListId should allow generated ids with hyphens', () => {
    expect(isInvalidVarListId('likert-row_4')).toBeFalse();
    expect(isInvalidVarListId('A B')).toBeTrue();
    expect(isInvalidVarListId('A')).toBeTrue();
  });

  it('isInvalidVarListAlias should allow generated aliases with hyphens', () => {
    expect(isInvalidVarListAlias('Alias_1')).toBeFalse();
    expect(isInvalidVarListAlias('Alias-1')).toBeFalse();
    expect(isInvalidVarListAlias('A B')).toBeTrue();
  });

  it('getVarListConflictAnalysis should detect duplicate ids and aliases', () => {
    const analysis = getVarListConflictAnalysis([
      { id: 'AA', alias: 'Alias' },
      { id: 'aa', alias: 'alias' },
      { id: 'BB', alias: 'Other' }
    ] as VariableInfo[]);

    expect(analysis.hasProblems).toBeTrue();
    expect(analysis.hasDuplicateId).toBeTrue();
    expect(analysis.hasDuplicateAlias).toBeTrue();
    expect(analysis.duplicateIdValues).toEqual(['AA']);
    expect(analysis.duplicateAliasValues).toEqual(['ALIAS']);
  });

  it('getVarListConflictAnalysis should detect invalid ids and aliases', () => {
    const analysis = getVarListConflictAnalysis([
      { id: 'A', alias: 'AA' },
      { id: 'BB', alias: 'x' }
    ] as VariableInfo[]);

    expect(analysis.hasProblems).toBeTrue();
    expect(analysis.hasInvalid).toBeTrue();
    expect(analysis.invalidIdCount).toBe(1);
    expect(analysis.invalidAliasCount).toBe(1);
  });

  it('getVarListConflictAnalysis should allow unique aliases matching other ids', () => {
    const analysis = getVarListConflictAnalysis([
      { id: '04', alias: '02' },
      { id: '02', alias: '05' }
    ] as VariableInfo[]);

    expect(analysis.hasProblems).toBeFalse();
    expect(analysis.hasDuplicateId).toBeFalse();
    expect(analysis.hasDuplicateAlias).toBeFalse();
    expect(analysis.invalidIdCount).toBe(0);
    expect(analysis.invalidAliasCount).toBe(0);
  });

  it('getVarListConflictAnalysis should provide a stable normalized signature', () => {
    const analysis = getVarListConflictAnalysis([
      { id: ' aa ', alias: ' Alias ' },
      { id: 'BB' }
    ] as VariableInfo[]);

    expect(analysis.signature).toBe('AA|ALIAS;;BB|BB');
  });

  it('getVarListConflictAnalysis should report no problems for valid unique variables', () => {
    const analysis = getVarListConflictAnalysis([
      { id: 'likert-row_4', alias: 'Alias-AA' },
      { id: 'BB', alias: 'AliasBB' }
    ] as VariableInfo[]);

    expect(analysis.hasProblems).toBeFalse();
  });
});
