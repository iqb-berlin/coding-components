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

  it('filters closed codes without dropping variables that still have included codes', async () => {
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
    expect(codebook[0].variables[0].codes.map((code: { id: string }) => code.id)).toEqual(['1']);
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
        exportFormat: 'docx'
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
