import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';
import { VariableCodingData } from '@iqbspecs/coding-scheme/coding-scheme.interface';
import validationCases from './variable-validation-cases.json';
import {
  VariableValidationError,
  VariableValidationErrorCode
} from './variable-identifier-validation';
import {
  analyzeVariableIdentifiers,
  isInvalidVarListAlias,
  isInvalidVarListId,
  isInvalidVarListName,
  validateVariableCodingChange
} from './schemer-identifier-validation';

interface VariableValidationCases {
  identifierCases: {
    valid: string[];
    invalid: Array<{ value: string; code: VariableValidationErrorCode }>;
  };
  variableListCases: Array<{
    name: string;
    variables: Array<{ id: string; alias?: string }>;
    errors: VariableValidationError[];
  }>;
}

describe('schemer-identifier-validation', () => {
  const conformanceCases = validationCases as unknown as VariableValidationCases;

  it('should use the shared identifier rules for ids, aliases and names', () => {
    conformanceCases.identifierCases.valid.forEach(value => {
      expect(isInvalidVarListName(value)).withContext(value).toBeFalse();
      expect(isInvalidVarListId(value)).withContext(value).toBeFalse();
      expect(isInvalidVarListAlias(value)).withContext(value).toBeFalse();
    });
    conformanceCases.identifierCases.invalid.forEach(({ value }) => {
      expect(isInvalidVarListName(value)).withContext(value).toBeTrue();
      expect(isInvalidVarListId(value)).withContext(value).toBeTrue();
      expect(isInvalidVarListAlias(value)).withContext(value).toBeTrue();
    });
  });

  it('should not trim identifiers before validating them', () => {
    expect(isInvalidVarListId(' a')).toBeTrue();
    expect(isInvalidVarListAlias('a ')).toBeTrue();
  });

  conformanceCases.variableListCases.forEach(testCase => {
    it(`should pass the shared conformance case: ${testCase.name}`, () => {
      const analysis = analyzeVariableIdentifiers(
        testCase.variables as VariableInfo[]
      );

      expect(analysis.errors).toEqual(testCase.errors);
      expect(analysis.hasProblems).toBe(testCase.errors.length > 0);
    });
  });

  it('should expose case-insensitive duplicate ids and aliases', () => {
    const analysis = analyzeVariableIdentifiers([
      { id: 'AA', alias: 'Alias' },
      { id: 'aa', alias: 'alias' },
      { id: 'BB', alias: 'Other' }
    ] as VariableInfo[]);

    expect(analysis.hasDuplicateId).toBeTrue();
    expect(analysis.hasDuplicateAlias).toBeTrue();
    expect(analysis.duplicateIdValues).toEqual(['AA']);
    expect(analysis.duplicateAliasValues).toEqual(['ALIAS']);
  });

  it('should distinguish invalid ids from invalid aliases', () => {
    const analysis = analyzeVariableIdentifiers([
      { id: '01.Text', alias: 'valid' },
      { id: 'also-valid', alias: '' }
    ] as VariableInfo[]);

    expect(analysis.hasInvalid).toBeTrue();
    expect(analysis.invalidIdCount).toBe(1);
    expect(analysis.invalidAliasCount).toBe(1);
  });

  it('should classify missing and null identifiers as empty', () => {
    const analysis = analyzeVariableIdentifiers([
      {} as VariableInfo,
      { id: null } as unknown as VariableInfo
    ]);

    expect(analysis.errors).toEqual([
      {
        code: 'EMPTY_IDENTIFIER',
        variableIndex: 0,
        property: 'id',
        value: undefined
      },
      {
        code: 'EMPTY_IDENTIFIER',
        variableIndex: 1,
        property: 'id',
        value: null
      }
    ]);
  });

  it('should allow aliases matching technical ids that are not public', () => {
    const analysis = analyzeVariableIdentifiers([
      { id: '04', alias: '02' },
      { id: '02', alias: '05' }
    ] as VariableInfo[]);

    expect(analysis.hasProblems).toBeFalse();
  });

  it('should preserve exact values and omitted aliases in its signature', () => {
    const analysis = analyzeVariableIdentifiers([
      { id: ' aa ', alias: ' Alias ' },
      { id: 'BB' },
      { id: 'CC', alias: '' }
    ] as VariableInfo[]);

    expect(analysis.signature).toBe(JSON.stringify([
      {
        id: ' aa ',
        alias: ' Alias ',
        hasAlias: true,
        origin: 'VAR_LIST',
        sourceIndex: 0
      },
      {
        id: 'BB',
        hasAlias: false,
        origin: 'VAR_LIST',
        sourceIndex: 1
      },
      {
        id: 'CC',
        alias: '',
        hasAlias: true,
        origin: 'VAR_LIST',
        sourceIndex: 2
      }
    ]));
  });

  it('should add derived and unrepresented base coding identifiers', () => {
    const analysis = analyzeVariableIdentifiers(
      [
        { id: 'base', alias: 'Base' } as VariableInfo,
        { id: 'inactive', alias: 'Inactive' } as VariableInfo
      ],
      [
        { id: 'base', alias: 'Base', sourceType: 'BASE' },
        { id: 'inactive', alias: 'Inactive', sourceType: 'BASE_NO_VALUE' },
        { id: 'orphan', alias: 'Orphan', sourceType: 'BASE' },
        { id: 'orphan-no-value', sourceType: 'BASE_NO_VALUE' },
        { id: 'd_1', alias: 'Derived', sourceType: 'COPY_VALUE' }
      ] as never[]
    );

    expect(analysis.identifiers).toEqual([
      {
        id: 'base', alias: 'Base', origin: 'VAR_LIST', sourceIndex: 0
      },
      {
        id: 'inactive', alias: 'Inactive', origin: 'VAR_LIST', sourceIndex: 1
      },
      {
        id: 'orphan', alias: 'Orphan', origin: 'BASE_CODING', sourceIndex: 2
      },
      {
        id: 'orphan-no-value', origin: 'BASE_CODING', sourceIndex: 3
      },
      {
        id: 'd_1', alias: 'Derived', origin: 'DERIVED_CODING', sourceIndex: 4
      }
    ]);
  });

  ([
    { description: 'BASE and BASE', duplicateSourceType: 'BASE' },
    {
      description: 'BASE and BASE_NO_VALUE',
      duplicateSourceType: 'BASE_NO_VALUE'
    }
  ] as const).forEach(({ description, duplicateSourceType }) => {
    it(`should retain duplicate represented ${description} codings`, () => {
      const analysis = analyzeVariableIdentifiers(
        [{ id: 'base', alias: 'Public' } as VariableInfo],
        [
          { id: 'base', alias: 'Public', sourceType: 'BASE' },
          {
            id: 'base',
            alias: 'Duplicate',
            sourceType: duplicateSourceType
          }
        ] as never[]
      );

      expect(analysis.identifiers).toEqual([
        {
          id: 'base', alias: 'Public', origin: 'VAR_LIST', sourceIndex: 0
        },
        {
          id: 'base',
          alias: 'Duplicate',
          origin: 'BASE_CODING',
          sourceIndex: 1
        }
      ]);
      expect(analysis.errors).toContain(
        jasmine.objectContaining({
          code: 'DUPLICATE_ID',
          variableIndex: 1,
          property: 'id',
          value: 'base',
          conflictingVariableIndex: 0
        })
      );
    });
  });

  describe('validateVariableCodingChange', () => {
    const coding = (id: string, alias: string): VariableCodingData => ({
      id,
      alias,
      sourceType: 'COPY_VALUE'
    } as VariableCodingData);

    it('should validate additions against the complete prospective state', () => {
      const variableCodings = [coding('v1', 'Existing')];
      const validAnalysis = validateVariableCodingChange(
        [],
        variableCodings,
        { coding: coding('v2', 'a') }
      );

      expect(validateVariableCodingChange([], variableCodings, {
        coding: coding('v2', 'existing')
      }).hasProblems).toBeTrue();
      expect(validAnalysis.hasProblems).toBeFalse();
      expect(validAnalysis.identifiers[1]).toEqual({
        id: 'v2',
        alias: 'a',
        origin: 'DERIVED_CODING',
        sourceIndex: 1
      });
      expect(validateVariableCodingChange([], variableCodings, {
        coding: coding('v2', '01.Text')
      }).hasProblems).toBeTrue();
    });

    it('should replace the selected coding before validating a change', () => {
      const variableCodings = [
        coding('v1', 'ABC'),
        coding('v2', 'DEF')
      ];

      expect(validateVariableCodingChange([], variableCodings, {
        coding: coding('v1', 'abc'),
        replacedCodingId: 'v1'
      }).hasProblems).toBeFalse();
      expect(validateVariableCodingChange([], variableCodings, {
        coding: coding('v1', 'def'),
        replacedCodingId: 'v1'
      }).hasProblems).toBeTrue();
    });

    it('should include variable-list identifiers in change validation', () => {
      const analysis = validateVariableCodingChange(
        [{ id: 'inactive-public' } as VariableInfo],
        [coding('derived', 'Derived')],
        {
          coding: coding('derived', 'INACTIVE-PUBLIC'),
          replacedCodingId: 'derived'
        }
      );

      expect(analysis.hasProblems).toBeTrue();
      expect(analysis.identifiers[0].origin).toBe('VAR_LIST');
    });

    it('should not mutate the coding list or its entries', () => {
      const existing = coding('v1', 'Existing');
      const variableCodings = [existing];

      validateVariableCodingChange([], variableCodings, {
        coding: coding('v1', 'Changed'),
        replacedCodingId: 'v1'
      });

      expect(variableCodings).toEqual([existing]);
      expect(existing.alias).toBe('Existing');
    });
  });
});
