import JSZip from 'jszip';

import {
  CodebookGenerator
} from '../../../codebook-generator/src/lib/codebook-generator/codebook-generator.class';
import {
  CodeBookContentSetting
} from '../../../codebook-models/src/lib/codebook.interfaces';

describe('CodebookGenerator', () => {
  const contentSetting: CodeBookContentSetting = {
    exportFormat: 'json',
    missingsProfile: '',
    hasOnlyManualCoding: false,
    hasGeneralInstructions: true,
    hasDerivedVars: true,
    hasOnlyVarsWithCodes: true,
    hasClosedVars: true,
    codeLabelToUpper: false,
    showScore: true,
    hideItemVarRelation: true
  };

  it('keeps numeric code id 0 in JSON exports', async () => {
    const scheme = JSON.stringify({
      version: '1.5',
      variableCodings: [
        {
          id: 'VAR1',
          sourceType: 'BASE',
          label: 'Variable 1',
          codes: [
            {
              id: 0,
              type: 'RESIDUAL_AUTO',
              label: 'Falsch',
              score: 0,
              ruleSetOperatorAnd: true,
              ruleSets: [],
              manualInstruction: ''
            }
          ]
        }
      ]
    });

    const blob = await CodebookGenerator.generateCodebook(
      [
        {
          id: 1,
          key: 'UNIT1',
          name: 'Unit 1',
          scheme
        }
      ],
      contentSetting,
      []
    );
    const codebook = JSON.parse(await blob.text());

    expect(blob).toEqual(jasmine.any(Blob));
    expect(codebook[0].variables[0].codes[0].id).toBe('0');
  });

  it('returns a JSON Blob for empty exports', async () => {
    const blob = await CodebookGenerator.generateCodebook([], contentSetting, []);

    expect(blob).toEqual(jasmine.any(Blob));
    expect(blob.type).toBe('application/json');
    expect(await blob.text()).toBe('[]');
  });

  it('keeps all codes of an included variable to match Studio exports', async () => {
    const scheme = JSON.stringify({
      version: '1.5',
      variableCodings: [
        {
          id: 'VAR1',
          sourceType: 'BASE',
          label: 'Variable 1',
          codes: [
            {
              id: 1,
              type: 'FULL_CREDIT',
              label: 'Manuell',
              score: 1,
              ruleSetOperatorAnd: true,
              ruleSets: [],
              manualInstruction: '<p>Manual instruction</p>'
            },
            {
              id: 0,
              type: 'RESIDUAL_AUTO',
              label: 'Automatisch',
              score: 0,
              ruleSetOperatorAnd: true,
              ruleSets: [],
              manualInstruction: ''
            }
          ]
        }
      ]
    });

    const blob = await CodebookGenerator.generateCodebook(
      [
        {
          id: 1,
          key: 'UNIT1',
          name: 'Unit 1',
          scheme
        }
      ],
      {
        ...contentSetting,
        hasClosedVars: false
      },
      []
    );
    const codebook = JSON.parse(await blob.text());

    expect(codebook[0].variables.length).toBe(1);
    expect(codebook[0].variables[0].codes.map((code: { id: string }) => code.id)).toEqual(['1', '0']);
  });

  describe('Studio-compatible variable filtering', () => {
    const makeCode = (id: number, type: string, manualInstruction: string) => ({
      id,
      label: `Code ${id}`,
      score: 1,
      type,
      manualInstruction,
      ruleSetOperatorAnd: true,
      ruleSets: []
    });

    const scheme = JSON.stringify({
      variableCodings: [
        {
          id: 'v_manual',
          sourceType: 'BASE',
          label: 'Manual var',
          manualInstruction: '',
          codes: [makeCode(1, 'INTENDED', 'do it')]
        },
        {
          id: 'v_manual_but_only_closed',
          sourceType: 'BASE',
          label: 'Manual but residual auto',
          manualInstruction: '',
          codes: [makeCode(11, 'RESIDUAL_AUTO', 'do it')]
        },
        {
          id: 'v_mixed',
          sourceType: 'BASE',
          label: 'Mixed var',
          manualInstruction: '',
          codes: [
            makeCode(21, 'INTENDED', 'do it'),
            makeCode(22, 'RESIDUAL_AUTO', '')
          ]
        },
        {
          id: 'v_closed',
          sourceType: 'BASE',
          label: 'Closed var',
          manualInstruction: '',
          codes: [makeCode(2, 'RESIDUAL_AUTO', '')]
        },
        {
          id: 'v_uncoded',
          sourceType: 'BASE',
          label: 'Uncoded var',
          manualInstruction: '',
          codes: [makeCode(3, 'INTENDED', '')]
        }
      ]
    });

    const baseSettings: CodeBookContentSetting = {
      exportFormat: 'json',
      missingsProfile: '',
      hasClosedVars: false,
      hasOnlyManualCoding: false,
      hasDerivedVars: false,
      hasGeneralInstructions: false,
      codeLabelToUpper: false,
      showScore: false,
      hideItemVarRelation: false,
      hasOnlyVarsWithCodes: false
    };

    const getVarIds = async (settings: CodeBookContentSetting): Promise<string[]> => {
      const blob = await CodebookGenerator.generateCodebook(
        [
          {
            id: 1,
            key: 'UNIT1',
            name: 'Unit 1',
            scheme
          }
        ],
        settings,
        []
      );
      const codebook = JSON.parse(await blob.text());
      return codebook[0].variables.map((variable: { id: string }) => variable.id);
    };

    it('includes all variables when no filter is active', async () => {
      const ids = await getVarIds({ ...baseSettings });

      expect(ids).toEqual([
        'v_closed',
        'v_manual',
        'v_manual_but_only_closed',
        'v_mixed',
        'v_uncoded'
      ]);
    });

    it('uses hasOnlyVarsWithCodes as a manual-or-closed variable filter', async () => {
      const ids = await getVarIds({ ...baseSettings, hasOnlyVarsWithCodes: true });

      expect(ids).toEqual([
        'v_closed',
        'v_manual',
        'v_manual_but_only_closed',
        'v_mixed'
      ]);
    });

    it('excludes variables that are both manual and closed when only manual coding is selected', async () => {
      const ids = await getVarIds({
        ...baseSettings,
        hasOnlyManualCoding: true
      });

      expect(ids).toEqual(['v_manual']);
    });

    it('includes closed and mixed variables when closed variables are selected', async () => {
      const ids = await getVarIds({
        ...baseSettings,
        hasClosedVars: true
      });

      expect(ids).toEqual([
        'v_closed',
        'v_manual_but_only_closed',
        'v_mixed'
      ]);
    });

    it('uses OR semantics when manual and closed filters are both selected', async () => {
      const ids = await getVarIds({
        ...baseSettings,
        hasOnlyManualCoding: true,
        hasClosedVars: true
      });

      expect(ids).toEqual([
        'v_closed',
        'v_manual',
        'v_manual_but_only_closed',
        'v_mixed'
      ]);
    });
  });

  it('writes ordered lists as numbering and normalizes HTML whitespace in DOCX exports', async () => {
    const scheme = JSON.stringify({
      version: '1.5',
      variableCodings: [
        {
          id: 'VAR1',
          sourceType: 'BASE',
          label: 'Variable 1',
          codes: [
            {
              id: 1,
              type: 'FULL_CREDIT',
              label: 'Manuell',
              score: 1,
              ruleSetOperatorAnd: true,
              ruleSets: [],
              manualInstruction: '<ol><li>Alpha   Beta</li><li>Gamma\nDelta</li></ol>'
            }
          ]
        }
      ]
    });

    const blob = await CodebookGenerator.generateCodebook(
      [
        {
          id: 1,
          key: 'UNIT1',
          name: 'Unit 1',
          scheme
        }
      ],
      {
        ...contentSetting,
        exportFormat: 'docx',
        hasClosedVars: false
      },
      []
    );
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const documentXml = await zip.file('word/document.xml')?.async('string');
    const numberingXml = await zip.file('word/numbering.xml')?.async('string');

    expect(blob).toEqual(jasmine.any(Blob));
    expect(documentXml).toContain('<w:numPr>');
    expect(documentXml).not.toContain('<w:numPr><w:ilvl w:val="0"/></w:numPr>');
    expect(documentXml).toContain('Alpha Beta');
    expect(documentXml).toContain('Gamma Delta');
    expect(numberingXml).toContain('<w:abstractNum');
    expect(numberingXml).toContain('<w:lvlText w:val="%1."/>');
  });
});
