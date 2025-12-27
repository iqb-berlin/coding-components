import { parseVarListInput } from './schemer-varlist-utils';

describe('schemer-varlist-utils', () => {
  describe('parseVarListInput', () => {
    it('should return [] for nullish/empty input', () => {
      expect(parseVarListInput(null)).toEqual([]);
      expect(parseVarListInput(undefined)).toEqual([]);
      expect(parseVarListInput('')).toEqual([]);
    });

    it('should parse JSON string input', () => {
      const json = JSON.stringify([
        {
          id: 'v1',
          alias: 'A',
          type: 'string',
          format: '',
          multiple: false,
          nullable: false,
          values: [],
          valuePositionLabels: [],
          valuesComplete: true,
          page: ''
        }
      ]);

      const result = parseVarListInput(json);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('v1');
      expect(result[0].alias).toBe('A');
    });

    it('should return [] for invalid JSON', () => {
      expect(parseVarListInput('[invalid')).toEqual([]);
    });

    it('should return arrays/objects unchanged (cast)', () => {
      const arr = [{ id: 'x' }];
      const arrUnknown = arr as unknown;
      expect(parseVarListInput(arrUnknown)).toBe(arrUnknown);

      const obj = { foo: 'bar' };
      const objUnknown = obj as unknown;
      expect(parseVarListInput(objUnknown)).toBe(objUnknown);
    });
  });
});
