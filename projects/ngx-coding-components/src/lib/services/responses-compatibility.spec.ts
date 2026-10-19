import { ToTextFactory } from '@iqb/responses';
import { CodingScheme, VariableCodingData } from '@iqbspecs/coding-scheme';
import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';
import { validateCodingScheme } from './coding-scheme-validation';
import { SchemerService } from './schemer.service';

// Player payloads may use VariableInfo 2.x spelling while the public TS
// interface still describes 1.x. Keep this real serialization boundary.
const playerVariable = (type: string, format = ''): VariableInfo => JSON.parse(JSON.stringify({
  id: 'V', type, format, multiple: false, nullable: false, values: [], valuePositionLabels: []
}));
const noValueCoding: VariableCodingData = { id: 'V', sourceType: 'BASE_NO_VALUE', codes: [] };

describe('Responses compatibility through real Schemer and validation imports', () => {
  ['no-value', 'NO_VALUE'].forEach(type => {
    it(`accepts ${type} for BASE_NO_VALUE without a false blocking source error`, () => {
      expect(validateCodingScheme([playerVariable(type)], [noValueCoding])).toEqual([]);
    });

    it(`keeps ${type} unprotected when activated as a BASE coding`, () => {
      const service = new SchemerService();
      const variables = [playerVariable(type)];
      service.setVarList(variables);
      expect(service.isProtectedBaseVariable({ ...noValueCoding, sourceType: 'BASE' })).toBeFalse();
      expect(service.varList).toBe(variables);
      expect(service.varList[0].type as string).toBe(type);
    });
  });

  ['string', 'STRING', 'integer', 'INTEGER', 'CUSTOM'].forEach(type => {
    it(`continues to protect a BASE coding supplied by the host as ${type}`, () => {
      const service = new SchemerService();
      service.setVarList([playerVariable(type)]);
      expect(service.isProtectedBaseVariable({ id: 'V', sourceType: 'BASE' })).toBeTrue();
    });
  });

  [
    ['string', 'STRING'], ['integer', 'INTEGER'], ['number', 'NUMBER'], ['boolean', 'BOOLEAN'],
    ['attachment', 'ATTACHMENT'], ['json', 'JSON'], ['no-value', 'NO_VALUE']
  ].forEach(([legacy, current]) => {
    it(`keeps the same recognized type description for ${legacy} and ${current}`, () => {
      const actual = ToTextFactory.varInfoAsText(playerVariable(current));
      expect(actual).toEqual(ToTextFactory.varInfoAsText(playerVariable(legacy)));
      expect(actual.join(' ')).not.toContain('unbekannt');
    });
  });

  [
    ['text-selection', 'TEXT_SELECTION'], ['image', 'IMAGE'], ['capture-image', 'CAPTURE_IMAGE'],
    ['audio', 'AUDIO'], ['ggb-file', 'GGB_FILE'], ['ggb-variable', 'GGB_VARIABLE'],
    ['non-negative', 'NON_NEGATIVE'], ['latex', 'LATEX'], ['math-ml', 'MATH_ML'],
    ['math-table', 'MATH_TABLE'], ['math-text-mix', 'MATH_TEXT_MIX']
  ].forEach(([legacy, current]) => {
    it(`keeps the same recognized format description for ${legacy} and ${current}`, () => {
      const actual = ToTextFactory.varInfoAsText(playerVariable('STRING', current));
      expect(actual).toEqual(ToTextFactory.varInfoAsText(playerVariable('string', legacy)));
      expect(actual.join(' ')).not.toContain('unbekannt');
    });
  });

  [
    ['STRING', 'CHEM_ELEMENT_SYMBOLS', 'Chemische Elementsymbole'],
    ['JSON', 'CHEM_MOLECULE', 'Molekül mit Bild'],
    ['string', 'chem-element-symbols', 'Chemische Elementsymbole'],
    ['json', 'chem-molecule', 'Molekül mit Bild']
  ].forEach(([type, format, text]) => {
    it(`recognizes the new chemistry format ${format}`, () => {
      expect(ToTextFactory.varInfoAsText(playerVariable(type, format)).join(' ')).toContain(text);
    });
  });

  it('still reports an actual incompatible source instead of ignoring source validation', () => {
    expect(validateCodingScheme([playerVariable('STRING')], [noValueCoding]))
      .toContain(jasmine.objectContaining({ type: 'INVALID_SOURCE', breaking: true, variableId: 'V' }));
  });

  it('uses current VariableInfo spelling in the real SchemerService without mocking the Responses factory', () => {
    const service = new SchemerService();
    service.setVarList([playerVariable('NO_VALUE')]);
    service.setCodingScheme(new CodingScheme(JSON.stringify({ version: '3.4', variableCodings: [noValueCoding] })));
    expect(service.getCodingProblemsForVarCoding(noValueCoding)).toEqual([]);
  });
});
