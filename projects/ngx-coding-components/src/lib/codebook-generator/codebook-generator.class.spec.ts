import JSZip from 'jszip';

import {
  CodebookGenerator
} from '../../../codebook-generator/src/lib/codebook-generator/codebook-generator.class';
import {
  CodebookDocxGenerator
} from '../../../codebook-generator/src/lib/codebook-generator/codebook-docx-generator.class';
import {
  CodeBookContentSetting,
  CodebookUnitDto
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

  it('returns a valid DOCX Blob for empty DOCX exports', async () => {
    const blob = await CodebookGenerator.generateCodebook(
      [],
      {
        ...contentSetting,
        exportFormat: 'docx'
      },
      []
    );
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const documentXml = await zip.file('word/document.xml')?.async('string');

    expect(blob).toEqual(jasmine.any(Blob));
    expect(blob.size).toBeGreaterThan(0);
    expect(documentXml).toContain('<w:document');
  });

  it('keeps numeric missing code 0 in DOCX exports', async () => {
    const unit: CodebookUnitDto = {
      key: 'UNIT1',
      name: 'Unit 1',
      variables: [],
      missings: [
        {
          code: 0,
          label: 'Nicht bearbeitet',
          description: 'Keine Eingabe'
        }
      ]
    };

    const blob = await CodebookDocxGenerator.generateDocx([unit], {
      ...contentSetting,
      exportFormat: 'docx'
    });
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const documentXml = await zip.file('word/document.xml')?.async('string');

    expect(documentXml).toContain('0 Nicht bearbeitet');
    expect(documentXml).toContain('Keine Eingabe');
    expect(documentXml).not.toContain('kein valides Missing');
  });

  it('keeps unique missings from all units in DOCX exports', async () => {
    const unitA: CodebookUnitDto = {
      key: 'UNIT1',
      name: 'Unit 1',
      variables: [],
      missings: [
        {
          code: 9,
          label: 'Missing A',
          description: 'Description A'
        }
      ]
    };
    const unitB: CodebookUnitDto = {
      key: 'UNIT2',
      name: 'Unit 2',
      variables: [],
      missings: [
        {
          code: 9,
          label: 'Missing A',
          description: 'Description A'
        },
        {
          code: 99,
          label: 'Missing B',
          description: 'Description B'
        }
      ]
    };

    const blob = await CodebookDocxGenerator.generateDocx([unitA, unitB], {
      ...contentSetting,
      exportFormat: 'docx'
    });
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const documentXml = await zip.file('word/document.xml')?.async('string') || '';

    expect(documentXml.match(/9 Missing A/g)?.length).toBe(1);
    expect(documentXml).toContain('Description A');
    expect(documentXml).toContain('99 Missing B');
    expect(documentXml).toContain('Description B');
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

  it('writes Studio-compatible DOCX headers, item relations and score column order', async () => {
    const unit: CodebookUnitDto = {
      key: 'UNIT1',
      name: 'Unit 1',
      missings: [],
      items: [
        {
          id: 'ITEM1',
          variableId: 'VAR1'
        },
        {
          id: 'ITEM2',
          VAR1: true
        },
        {
          id: 'ITEM3',
          variableId: 'OTHER'
        }
      ],
      variables: [
        {
          id: 'VAR1',
          label: 'Variable 1',
          sourceType: 'BASE',
          generalInstruction: '',
          codes: [
            {
              id: 'C1',
              label: 'Code 1',
              score: '77',
              description: '<p>Description text</p>'
            }
          ]
        }
      ]
    };

    const blob = await CodebookDocxGenerator.generateDocx(
      [unit],
      {
        ...contentSetting,
        exportFormat: 'docx',
        hideItemVarRelation: false
      }
    );
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const documentXml = await zip.file('word/document.xml')?.async('string');

    expect(documentXml).toContain('UNIT1  Unit 1');
    expect(documentXml).toContain('VAR1  Variable 1');
    expect(documentXml).toContain('Item(s): ITEM1   ITEM2');
    expect(documentXml).not.toContain('ITEM3');

    const scoreHeaderIndex = documentXml?.indexOf('Score') ?? -1;
    const descriptionHeaderIndex = documentXml?.indexOf('Beschreibung') ?? -1;
    const scoreValueIndex = documentXml?.indexOf('77') ?? -1;
    const descriptionValueIndex = documentXml?.indexOf('Description text') ?? -1;

    expect(scoreHeaderIndex).toBeGreaterThan(-1);
    expect(descriptionHeaderIndex).toBeGreaterThan(-1);
    expect(scoreHeaderIndex).toBeLessThan(descriptionHeaderIndex);
    expect(scoreValueIndex).toBeGreaterThan(-1);
    expect(descriptionValueIndex).toBeGreaterThan(-1);
    expect(scoreValueIndex).toBeLessThan(descriptionValueIndex);
  });
});
