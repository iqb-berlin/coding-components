import { VariableAliasPipe } from './variable-alias.pipe';
import { SchemerService } from '../services/schemer.service';

describe('VariableAliasPipe', () => {
  let pipe: VariableAliasPipe;
  let schemerService: jasmine.SpyObj<SchemerService>;

  beforeEach(() => {
    schemerService = jasmine.createSpyObj<SchemerService>('SchemerService', [
      'getVariableAliasById',
      'getVariableAliasByIdListString'
    ]);
    pipe = new VariableAliasPipe(schemerService);
  });

  it('should delegate string values to getVariableAliasById', () => {
    schemerService.getVariableAliasById.and.returnValue('ALIAS');

    expect(pipe.transform('v1')).toBe('ALIAS');
    expect(schemerService.getVariableAliasById).toHaveBeenCalledWith('v1');
  });

  it('should delegate array values to getVariableAliasByIdListString with maxEntries', () => {
    schemerService.getVariableAliasByIdListString.and.returnValue('A, B');

    expect(pipe.transform(['v1', 'v2'], 1)).toBe('A, B');
    expect(schemerService.getVariableAliasByIdListString)
      .toHaveBeenCalledWith(['v1', 'v2'], 1);
  });

  it('should use maxEntries=0 when not provided', () => {
    schemerService.getVariableAliasByIdListString.and.returnValue('A, B');

    pipe.transform(['v1', 'v2']);
    expect(schemerService.getVariableAliasByIdListString)
      .toHaveBeenCalledWith(['v1', 'v2'], 0);
  });
});
