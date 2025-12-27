import { CodeData, CodeType } from '@iqbspecs/coding-scheme/coding-scheme.interface';
import {
  addCode,
  canEdit,
  canPasteSingleCodeInto,
  copySingleCode,
  deleteCode,
  duplicateCode,
  pasteSingleCode,
  sortCodes
} from './schemer-code-ops';

describe('schemer-code-ops', () => {
  const orderOfCodeTypes: CodeType[] = [
    'FULL_CREDIT',
    'PARTIAL_CREDIT',
    'TO_CHECK',
    'NO_CREDIT',
    'UNSET',
    'INTENDED_INCOMPLETE',
    'RESIDUAL',
    'RESIDUAL_AUTO'
  ];

  describe('canEdit', () => {
    it('should allow RW_MINIMAL and RW_MAXIMAL only', () => {
      expect(canEdit('RO')).toBeFalse();
      expect(canEdit('RW_MINIMAL')).toBeTrue();
      expect(canEdit('RW_MAXIMAL')).toBeTrue();
    });
  });

  describe('copySingleCode', () => {
    it('should return null for null input and deep-clone otherwise', () => {
      expect(copySingleCode(null)).toBeNull();

      const src: CodeData = {
        id: 1,
        type: 'FULL_CREDIT',
        label: 'L',
        score: 1,
        ruleSetOperatorAnd: true,
        ruleSets: [],
        manualInstruction: ''
      } as unknown as CodeData;

      const copied = copySingleCode(src) as CodeData;
      expect(copied).not.toBe(src);
      expect(copied.label).toBe('L');

      (src as unknown as { label: string }).label = 'mutated';
      expect(copied.label).toBe('L');
    });
  });

  describe('canPasteSingleCodeInto', () => {
    it('should return false when nothing copied or RO', () => {
      expect(canPasteSingleCodeInto(null, [], 'RW_MAXIMAL')).toBeFalse();
      expect(
        canPasteSingleCodeInto(
          {
            id: 1, type: 'FULL_CREDIT', label: '', score: 1
          } as unknown as CodeData,
          [],
          'RO'
        )
      ).toBeFalse();
    });

    it('should block residual types if list already contains a residual/intended incomplete', () => {
      const copied: CodeData = {
        id: 99, type: 'RESIDUAL_AUTO', label: '', score: 0
      } as unknown as CodeData;
      const existing: CodeData[] = [
        {
          id: 0, type: 'RESIDUAL', label: '', score: 0
        } as unknown as CodeData
      ];

      expect(canPasteSingleCodeInto(copied, existing, 'RW_MAXIMAL')).toBeFalse();
    });

    it('should allow non-residual types', () => {
      const copied: CodeData = {
        id: 99, type: 'FULL_CREDIT', label: '', score: 1
      } as unknown as CodeData;
      expect(canPasteSingleCodeInto(copied, [], 'RW_MAXIMAL')).toBeTrue();
    });
  });

  describe('addCode', () => {
    it('should return no-access for RO', () => {
      expect(addCode([], 'FULL_CREDIT', 'RO', orderOfCodeTypes)).toBe('code.error-message.no-access');
    });

    it('should create FULL_CREDIT with score 1 and insert before follower types', () => {
      const list: CodeData[] = [
        {
          id: 4, type: 'NO_CREDIT', label: '', score: 0
        } as unknown as CodeData
      ];

      const created = addCode(list, 'FULL_CREDIT', 'RW_MAXIMAL', orderOfCodeTypes) as CodeData;
      expect(typeof created).not.toBe('string');
      expect(created.type).toBe('FULL_CREDIT');
      expect(created.score).toBe(1);
      expect(list[0].type).toBe('FULL_CREDIT');
    });

    it('should block adding RESIDUAL_AUTO if any residual/intended incomplete exists', () => {
      const list: CodeData[] = [
        {
          id: 0, type: 'INTENDED_INCOMPLETE', label: '', score: 0
        } as unknown as CodeData
      ];

      expect(addCode(list, 'RESIDUAL_AUTO', 'RW_MAXIMAL', orderOfCodeTypes)).toBe(
        'code.error-message.residual-exists'
      );
    });

    it('should set id 0 for first residual when no 0 id exists', () => {
      const list: CodeData[] = [];
      const created = addCode(list, 'RESIDUAL', 'RW_MAXIMAL', orderOfCodeTypes) as CodeData;
      expect(created.id).toBe(0);
      expect(list.length).toBe(1);
    });

    it('should create INTENDED_INCOMPLETE with id 0 and empty manualInstruction', () => {
      const list: CodeData[] = [];
      const created = addCode(list, 'INTENDED_INCOMPLETE', 'RW_MAXIMAL', orderOfCodeTypes) as CodeData;
      expect(created.id).toBe(0);
      expect(created.manualInstruction).toBe('');
    });

    it('should return type-not-supported for unknown type', () => {
      expect(addCode([], 'INVALID' as unknown as CodeType, 'RW_MAXIMAL', orderOfCodeTypes)).toBe(
        'code.error-message.type-not-supported'
      );
    });
  });

  describe('pasteSingleCode', () => {
    it('should return errors for common failure modes', () => {
      expect(pasteSingleCode(null, [], 'RW_MAXIMAL', orderOfCodeTypes)).toBe('code.error-message.nothing-to-paste');
      expect(
        pasteSingleCode(
          {
            id: 1, type: 'FULL_CREDIT', label: '', score: 1
          } as unknown as CodeData,
          [],
          'RO',
          orderOfCodeTypes
        )
      ).toBe('code.error-message.no-access');
      expect(
        pasteSingleCode(
          {
            id: 1, type: 'FULL_CREDIT', label: '', score: 1
          } as unknown as CodeData,
          null as unknown as CodeData[],
          'RW_MAXIMAL',
          orderOfCodeTypes
        )
      ).toBe('code.error-message.fatal-error');
    });

    it('should keep generated id/type and copy payload properties', () => {
      const list: CodeData[] = [];
      const copied: CodeData = {
        id: 99, type: 'FULL_CREDIT', label: 'copied', score: 1
      } as unknown as CodeData;

      const created = pasteSingleCode(copied, list, 'RW_MAXIMAL', orderOfCodeTypes) as CodeData;
      expect(typeof created).not.toBe('string');
      expect(created.label).toBe('copied');
      expect(created.type).toBe('FULL_CREDIT');
      expect(created.id).not.toBe(99);
      expect(list.length).toBe(1);
    });

    it('should reject residual payloads when list already contains residual type', () => {
      const list: CodeData[] = [
        {
          id: 0, type: 'RESIDUAL', label: '', score: 0
        } as unknown as CodeData
      ];
      const copied: CodeData = {
        id: 99, type: 'RESIDUAL_AUTO', label: 'x', score: 0
      } as unknown as CodeData;

      expect(pasteSingleCode(copied, list, 'RW_MAXIMAL', orderOfCodeTypes)).toBe('code.error-message.residual-exists');
      expect(list.length).toBe(1);
    });
  });

  describe('deleteCode', () => {
    it('should enforce role and bounds', () => {
      const list: CodeData[] = [
        {
          id: 1, type: 'FULL_CREDIT', label: '', score: 1
        } as unknown as CodeData
      ];

      expect(deleteCode(list, 0, 'RO')).toBeFalse();
      expect(list.length).toBe(1);

      expect(deleteCode(list, 99, 'RW_MAXIMAL')).toBeFalse();
      expect(deleteCode(list, 0, 'RW_MAXIMAL')).toBeTrue();
      expect(list.length).toBe(0);
    });
  });

  describe('duplicateCode', () => {
    it('should return errors on RO or invalid index', () => {
      expect(duplicateCode([], 0, 'RO')).toBe('code.error-message.no-access');
      expect(duplicateCode([], 0, 'RW_MAXIMAL')).toBe('code.error-message.invalid-index');
      expect(
        duplicateCode([
          {
            id: 1, type: 'FULL_CREDIT', label: '', score: 1
          } as unknown as CodeData
        ], -1, 'RW_MAXIMAL')
      ).toBe('code.error-message.invalid-index');
    });

    it('should reject residual types', () => {
      const list: CodeData[] = [
        {
          id: 0, type: 'RESIDUAL', label: '', score: 0
        } as unknown as CodeData
      ];
      expect(duplicateCode(list, 0, 'RW_MAXIMAL')).toBe('code.error-message.type-not-supported');
    });

    it('should duplicate non-residual and set id to max + 1', () => {
      const list: CodeData[] = [
        {
          id: 2, type: 'FULL_CREDIT', label: 'a', score: 1
        } as unknown as CodeData,
        {
          id: 7, type: 'NO_CREDIT', label: 'b', score: 0
        } as unknown as CodeData
      ];

      const duplicated = duplicateCode(list, 0, 'RW_MAXIMAL') as CodeData;
      expect(typeof duplicated).not.toBe('string');
      expect(duplicated.id).toBe(8);
      expect(list.length).toBe(3);
    });
  });

  describe('sortCodes', () => {
    it('should sort by type order then id (null ids first within same type)', () => {
      const list: CodeData[] = [
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

      sortCodes(list, orderOfCodeTypes);

      expect(list.map(c => `${c.type}:${c.id}`)).toEqual([
        'FULL_CREDIT:1',
        'FULL_CREDIT:2',
        'NO_CREDIT:null',
        'NO_CREDIT:3'
      ]);
    });

    it('should normalise ids when requested', () => {
      const list: CodeData[] = [
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

      sortCodes(list, orderOfCodeTypes, true);

      const full = list.filter(c => c.type === 'FULL_CREDIT').map(c => c.id);
      expect(full).toEqual([11, 12]);
      expect(list.find(c => c.type === 'RESIDUAL')?.id).toBe(0);
    });
  });
});
