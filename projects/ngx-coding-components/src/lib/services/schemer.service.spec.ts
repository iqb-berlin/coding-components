import {
  CodeData,
  CodeType
} from '@iqbspecs/coding-scheme/coding-scheme.interface';
import { SchemerService } from './schemer.service';

describe('SchemerService', () => {
  let service: SchemerService;

  beforeEach(() => {
    service = new SchemerService();
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
  });

  describe('duplicateCode', () => {
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
});
