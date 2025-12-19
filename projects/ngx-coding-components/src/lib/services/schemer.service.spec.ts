import {
  CodeData,
  CodeType,
  VariableCodingData
} from '@iqbspecs/coding-scheme/coding-scheme.interface';
import { SchemerService } from './schemer.service';

describe('SchemerService', () => {
  let service: SchemerService;

  beforeEach(() => {
    service = new SchemerService();
  });

  describe('checkRenamedVarAliasOk', () => {
    it('should return false when alias or codingScheme is missing', () => {
      service.codingScheme = null;
      expect(service.checkRenamedVarAliasOk('A')).toBeFalse();
      service.codingScheme = { variableCodings: [] } as unknown as never;
      expect(service.checkRenamedVarAliasOk('')).toBeFalse();
    });

    it('should detect duplicates case-insensitively and allow same variable id', () => {
      service.codingScheme = {
        variableCodings: [
          { id: 'v1', alias: 'ABC', sourceType: 'BASE' } as unknown as VariableCodingData,
          { id: 'v2', alias: 'DEF', sourceType: 'BASE' } as unknown as VariableCodingData
        ]
      } as unknown as never;

      expect(service.checkRenamedVarAliasOk('abc')).toBeFalse();
      expect(service.checkRenamedVarAliasOk('abc', 'v1')).toBeTrue();
      expect(service.checkRenamedVarAliasOk('xyz')).toBeTrue();
    });
  });

  describe('addCode', () => {
    it('should block adding a residual type if a residual or intended incomplete already exists', () => {
      service.userRole = 'RW_MAXIMAL';
      const codeList: CodeData[] = [
        {
          id: 0,
          type: 'RESIDUAL',
          label: '',
          score: 0
        }
      ] as unknown as CodeData[];

      const result = service.addCode(codeList, 'RESIDUAL_AUTO');
      expect(typeof result).toBe('string');
      expect(result).toBe('code.error-message.residual-exists');
    });

    it('should assign id 0 to the first residual code if no 0 code exists', () => {
      service.userRole = 'RW_MAXIMAL';
      const codeList: CodeData[] = [];

      const created = service.addCode(codeList, 'RESIDUAL') as CodeData;
      expect(typeof created).not.toBe('string');
      expect(created.id).toBe(0);
      expect(created.type).toBe('RESIDUAL');
      expect(codeList.length).toBe(1);
    });

    it('should return no-access if role is read-only', () => {
      service.userRole = 'RO';
      const codeList: CodeData[] = [];

      const result = service.addCode(codeList, 'FULL_CREDIT');
      expect(result).toBe('code.error-message.no-access');
    });
  });

  describe('copy/paste', () => {
    it('copySingleCode should return false for empty input and deep-clone payload', () => {
      expect(service.copySingleCode(null as unknown as never)).toBeFalse();

      const src = {
        id: 1,
        type: 'FULL_CREDIT',
        label: 'a',
        score: 1,
        ruleSets: []
      } as unknown as CodeData;
      expect(service.copySingleCode(src)).toBeTrue();

      (src as unknown as { label: string }).label = 'mutated';
      expect(service.copiedCode?.label).toBe('a');
    });

    it('canPasteSingleCodeInto should block when nothing copied or user is RO', () => {
      service.userRole = 'RW_MAXIMAL';
      expect(service.canPasteSingleCodeInto([])).toBeFalse();

      service.copySingleCode({
        id: 123,
        type: 'FULL_CREDIT',
        label: 'x',
        score: 1
      } as unknown as CodeData);
      service.userRole = 'RO';
      expect(service.canPasteSingleCodeInto([])).toBeFalse();
    });

    it('canPasteSingleCodeInto should block pasting residual if target already contains a residual type', () => {
      service.userRole = 'RW_MAXIMAL';
      const existing: CodeData[] = [
        {
          id: 0,
          type: 'RESIDUAL',
          label: '',
          score: 0
        }
      ] as unknown as CodeData[];

      service.copySingleCode({
        id: 123,
        type: 'RESIDUAL_AUTO',
        label: 'x',
        score: 0
      } as unknown as CodeData);
      expect(service.canPasteSingleCodeInto(existing)).toBeFalse();
    });

    it('pasteSingleCode should return localized error strings for common error paths', () => {
      service.userRole = 'RW_MAXIMAL';
      expect(service.pasteSingleCode([])).toBe('code.error-message.nothing-to-paste');

      service.copySingleCode({
        id: 1,
        type: 'FULL_CREDIT',
        label: 'x',
        score: 1
      } as unknown as CodeData);
      service.userRole = 'RO';
      expect(service.pasteSingleCode([])).toBe('code.error-message.no-access');

      service.userRole = 'RW_MAXIMAL';
      expect(service.pasteSingleCode(null as unknown as never)).toBe('code.error-message.fatal-error');
    });

    it('pasteSingleCode should keep generated id/type and copy payload', () => {
      service.userRole = 'RW_MAXIMAL';
      const codeList: CodeData[] = [];

      service.copySingleCode({
        id: 99,
        type: 'FULL_CREDIT',
        label: 'copied',
        score: 1
      } as unknown as CodeData);

      const created = service.pasteSingleCode(codeList) as CodeData;
      expect(typeof created).not.toBe('string');

      expect(created.type as CodeType).toBe('FULL_CREDIT');
      expect(created.label).toBe('copied');
      expect(created.score).toBe(1);

      expect(created.id).not.toBe(99);
      expect(codeList.length).toBe(1);
    });

    it('pasteSingleCode should reject residual payloads when list already contains residual type', () => {
      service.userRole = 'RW_MAXIMAL';
      const codeList: CodeData[] = [
        {
          id: 0,
          type: 'RESIDUAL',
          label: '',
          score: 0
        } as unknown as CodeData
      ];

      service.copySingleCode({
        id: 77,
        type: 'RESIDUAL_AUTO',
        label: 'existing',
        score: 0
      } as unknown as CodeData);

      const result = service.pasteSingleCode(codeList);

      expect(result).toBe('code.error-message.residual-exists');
      expect(codeList.length).toBe(1);
    });
  });

  describe('duplicateCode', () => {
    it('should return no-access and invalid-index errors', () => {
      service.userRole = 'RO';
      expect(service.duplicateCode([], 0)).toBe('code.error-message.no-access');

      service.userRole = 'RW_MAXIMAL';
      expect(service.duplicateCode([], 0)).toBe('code.error-message.invalid-index');
      expect(service.duplicateCode([{
        id: 1,
        type: 'FULL_CREDIT',
        label: 'a',
        score: 1
      } as unknown as CodeData], -1)).toBe('code.error-message.invalid-index');
    });

    it('should reject duplicating residual types', () => {
      service.userRole = 'RW_MAXIMAL';
      const codeList: CodeData[] = [
        {
          id: 0,
          type: 'RESIDUAL',
          label: '',
          score: 0
        }
      ] as unknown as CodeData[];

      const result = service.duplicateCode(codeList, 0);
      expect(result).toBe('code.error-message.type-not-supported');
    });

    it('should duplicate a normal code and assign maxId + 1', () => {
      service.userRole = 'RW_MAXIMAL';
      const codeList: CodeData[] = [
        {
          id: 1,
          type: 'FULL_CREDIT',
          label: 'a',
          score: 1
        },
        {
          id: 3,
          type: 'NO_CREDIT',
          label: 'b',
          score: 0
        }
      ] as unknown as CodeData[];

      const duplicated = service.duplicateCode(codeList, 0) as CodeData;
      expect(typeof duplicated).not.toBe('string');
      expect(duplicated.id).toBe(4);
      expect(codeList.length).toBe(3);
      expect(codeList[1].id).toBe(4);
    });
  });

  describe('getVariableAliasById / getVariableAliasByIdListString', () => {
    beforeEach(() => {
      service.codingScheme = {
        variableCodings: [
          { id: 'v1', alias: 'A', sourceType: 'BASE' } as unknown as VariableCodingData,
          { id: 'v2', alias: '', sourceType: 'BASE' } as unknown as VariableCodingData
        ]
      } as unknown as never;
    });

    it('getVariableAliasById should return alias, id, or "?" for missing', () => {
      expect(service.getVariableAliasById('v1')).toBe('A');
      expect(service.getVariableAliasById('v2')).toBe('v2');
      expect(service.getVariableAliasById('missing')).toBe('?');
      expect(service.getVariableAliasById('')).toBe('?');
    });

    it('getVariableAliasByIdListString should join aliases and append ellipsis if maxEntries < length', () => {
      expect(service.getVariableAliasByIdListString(['v1', 'v2'], 0)).toBe('A, v2');
      expect(service.getVariableAliasByIdListString(['v1', 'v2'], 1)).toBe('A, ...');
      service.codingScheme = null;
      expect(service.getVariableAliasByIdListString(['v1'], 1)).toBe('');
    });
  });

  describe('getBaseVarsList', () => {
    it('should return empty list when no scheme and filter BASE types otherwise', () => {
      service.codingScheme = null;
      expect(service.getBaseVarsList()).toEqual([]);

      service.codingScheme = {
        variableCodings: [
          { id: 'v1', alias: 'A', sourceType: 'BASE' } as unknown as VariableCodingData,
          { id: 'v2', alias: 'B', sourceType: 'DERIVE' } as unknown as VariableCodingData
        ]
      } as unknown as never;

      const base = service.getBaseVarsList();
      expect(base.length).toBe(1);
      expect(base[0].id).toBe('v1');
    });
  });

  describe('getVarInfoByCoding', () => {
    beforeEach(() => {
      service.varList = [
        {
          id: 'base1',
          alias: 'B1',
          type: 'integer',
          format: '',
          multiple: false,
          nullable: false,
          values: [],
          valuePositionLabels: [],
          valuesComplete: true,
          page: ''
        } as unknown as never
      ];
      service.codingScheme = {
        variableCodings: [
          {
            id: 'src1',
            alias: 'S1',
            sourceType: 'BASE',
            codes: [
              {
                id: 1, type: 'FULL_CREDIT', label: '', score: 1
              },
              {
                id: 2, type: 'NO_CREDIT', label: '', score: 0
              }
            ]
          } as unknown as VariableCodingData,
          {
            id: 'src2',
            alias: 'S2',
            sourceType: 'BASE',
            codes: [{
              id: 3, type: 'FULL_CREDIT', label: '', score: 1
            }]
          } as unknown as VariableCodingData
        ]
      } as unknown as never;
    });

    it('should return variable info from varList for BASE source type', () => {
      const info = service.getVarInfoByCoding(
        { id: 'base1', alias: 'x', sourceType: 'BASE' } as unknown as VariableCodingData
      );
      expect(info?.id).toBe('base1');
    });

    it('should resolve COPY_VALUE from first derive source', () => {
      const info = service.getVarInfoByCoding({
        id: 'cv',
        alias: 'cv',
        sourceType: 'COPY_VALUE',
        deriveSources: ['base1']
      } as unknown as VariableCodingData);
      expect(info?.id).toBe('base1');
    });

    it('should build synthetic VariableInfo for CONCAT_CODE (codes count < 10)', () => {
      const info = service.getVarInfoByCoding({
        id: 'cc',
        alias: 'CC',
        sourceType: 'CONCAT_CODE',
        deriveSources: ['src1', 'src2']
      } as unknown as VariableCodingData);

      expect(info).toBeTruthy();
      expect(info?.id).toBe('cc');
      expect(info?.type).toBe('string');
      const values = (info as unknown as { values: { value: string }[] }).values.map(v => v.value);
      // combinations: 1-3 and 2-3 (delimiter from @iqbspecs), so at least two entries
      expect(values.length).toBeGreaterThanOrEqual(2);
    });

    it('should return CONCAT_CODE info with empty values list when combinations exceed limit', () => {
      const manyCodes = Array.from({ length: 10 }).map((_, idx) => ({
        id: idx + 1,
        type: 'FULL_CREDIT',
        label: '',
        score: 1
      })) as unknown as CodeData[];
      service.codingScheme = {
        variableCodings: [
          {
            id: 'srcMany',
            alias: 'SM',
            sourceType: 'BASE',
            codes: manyCodes
          } as unknown as VariableCodingData
        ]
      } as unknown as never;

      const info = service.getVarInfoByCoding({
        id: 'cc2',
        alias: 'CC2',
        sourceType: 'CONCAT_CODE',
        deriveSources: ['srcMany']
      } as unknown as VariableCodingData);

      expect(info?.id).toBe('cc2');
      expect(info?.type).toBe('string');
      expect((info as unknown as { values: unknown[] }).values.length).toBe(0);
    });

    it(
      'should return integer synthetic VariableInfo for derive sources (non CONCAT_CODE) and undefined otherwise',
      () => {
        const info = service.getVarInfoByCoding({
          id: 'd',
          alias: 'D',
          sourceType: 'DERIVE',
          deriveSources: ['src1']
        } as unknown as VariableCodingData);
        expect(info?.type).toBe('integer');

        const undef = service.getVarInfoByCoding(
          { id: 'x', alias: 'X', sourceType: 'DERIVE' } as unknown as VariableCodingData
        );
        expect(undef).toBeUndefined();
      }
    );
  });

  describe('deleteCode', () => {
    it('should enforce access and bounds', () => {
      const codeList: CodeData[] = [
        {
          id: 1, type: 'FULL_CREDIT', label: '', score: 1
        } as unknown as CodeData
      ];

      service.userRole = 'RO';
      expect(service.deleteCode(codeList, 0)).toBeFalse();
      expect(codeList.length).toBe(1);

      service.userRole = 'RW_MAXIMAL';
      expect(service.deleteCode(codeList, 99)).toBeFalse();
      expect(service.deleteCode(codeList, 0)).toBeTrue();
      expect(codeList.length).toBe(0);
    });
  });

  describe('addCode - additional branches', () => {
    it('should allocate new id based on type order and keep list sorted by type', () => {
      service.userRole = 'RW_MAXIMAL';
      const codeList: CodeData[] = [
        {
          id: 4, type: 'NO_CREDIT', label: 'b', score: 0
        } as unknown as CodeData
      ];

      const created = service.addCode(codeList, 'FULL_CREDIT') as CodeData;
      expect(typeof created).not.toBe('string');
      expect(created.id).toBe(1);
      expect(codeList[0].type as CodeType).toBe('FULL_CREDIT');
    });

    it('should pick maxCode+1 if suggested id is already used', () => {
      service.userRole = 'RW_MAXIMAL';
      const codeList: CodeData[] = [
        {
          id: 1, type: 'FULL_CREDIT', label: 'a', score: 1
        } as unknown as CodeData,
        {
          id: 2, type: 'PARTIAL_CREDIT', label: 'p', score: 0
        } as unknown as CodeData
      ];

      const created = service.addCode(codeList, 'FULL_CREDIT') as CodeData;
      expect(typeof created).not.toBe('string');
      expect(created.id).toBe(3);
    });

    it('should return type-not-supported for unknown code types', () => {
      service.userRole = 'RW_MAXIMAL';
      expect(service.addCode([], 'INVALID' as unknown as CodeType)).toBe('code.error-message.type-not-supported');
    });

    it('should create intended incomplete code with id 0 and empty manualInstruction', () => {
      service.userRole = 'RW_MAXIMAL';
      const codeList: CodeData[] = [];

      const created = service.addCode(codeList, 'INTENDED_INCOMPLETE') as CodeData;

      expect(typeof created).not.toBe('string');
      expect(created.type).toBe('INTENDED_INCOMPLETE');
      expect(created.id).toBe(0);
      expect(created.manualInstruction).toBe('');
      expect(codeList.length).toBe(1);
    });
  });

  describe('sortCodes', () => {
    it('should sort by type order then id, and place null ids first within same type', () => {
      const codeList: CodeData[] = [
        {
          id: 3, type: 'NO_CREDIT', label: '', score: 0
        } as unknown as CodeData,
        {
          id: null, type: 'NO_CREDIT', label: '', score: 0
        } as unknown as CodeData,
        {
          id: 2, type: 'FULL_CREDIT', label: '', score: 1
        } as unknown as CodeData,
        {
          id: 1, type: 'FULL_CREDIT', label: '', score: 1
        } as unknown as CodeData
      ];

      service.sortCodes(codeList);

      expect(codeList.map(c => `${c.type}:${c.id}`)).toEqual([
        'FULL_CREDIT:1',
        'FULL_CREDIT:2',
        'NO_CREDIT:null',
        'NO_CREDIT:3'
      ]);
    });

    it('should normalise code ids when requested', () => {
      const codeList: CodeData[] = [
        {
          id: 5, type: 'FULL_CREDIT', label: '', score: 1
        } as unknown as CodeData,
        {
          id: 9, type: 'FULL_CREDIT', label: '', score: 1
        } as unknown as CodeData,
        {
          id: 22, type: 'NO_CREDIT', label: '', score: 0
        } as unknown as CodeData,
        {
          id: 0, type: 'RESIDUAL', label: '', score: 0
        } as unknown as CodeData
      ];

      service.sortCodes(codeList, true);

      // FULL_CREDIT is typeIndex 0 => start at 11
      const full = codeList.filter(c => c.type === 'FULL_CREDIT').map(c => c.id);
      expect(full).toEqual([11, 12]);
      // Residual should remain 0 when it's the only residual
      expect(codeList.find(c => c.type === 'RESIDUAL')?.id).toBe(0);
    });
  });
});
