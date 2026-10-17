import { ToTextFactory } from '@iqb/responses';
import { CodingScheme, CodeData, VariableCodingData } from '@iqbspecs/coding-scheme';
import type {
  BookVariable, CodeBookContentSetting, CodebookUnitDto, CodeInfo, Missing, UnitPropertiesForCodebook
} from '@iqb/ngx-coding-components/codebook-models';
import { CodebookGenerationError } from './codebook-generation-error';
import { hasCodebookManualInstruction } from './manual-instruction';

export class CodebookGenerator {
  static getCodebookData(units: UnitPropertiesForCodebook[], options: CodeBookContentSetting, missings: Missing[]): CodebookUnitDto[] {
    return [...units].sort((a, b) => (a.key < b.key ? -1 : Number(a.key > b.key))).map(unit => {
      let variables: VariableCodingData[] = [];
      if (unit.scheme) {
        try {
          const data = JSON.parse(unit.scheme);
          if (!Array.isArray(data.variableCodings) || data.variableCodings.some((variable: VariableCodingData) => !variable || typeof variable.id !== 'string' ||
            (variable.codes !== undefined && (!Array.isArray(variable.codes) || variable.codes.some(code => !code || typeof code !== 'object'))))) {
            throw new Error('Ungültige variableCodings');
          }
          variables = new CodingScheme(unit.scheme).variableCodings;
        } catch {
          throw new CodebookGenerationError(`Ungültiges Kodierschema für Aufgabe ${unit.key}.`);
        }
      }
      const bookVariables = variables.map(variable => this.getVariable(variable, options))
        .filter((variable): variable is BookVariable => variable !== null)
        .sort((a, b) => (a.id < b.id ? -1 : Number(a.id > b.id)));
      return {
        key: unit.key, name: unit.name, variables: bookVariables, missings, items: unit.metadata?.items || []
      };
    });
  }

  static async generateCodebook(units: UnitPropertiesForCodebook[], options: CodeBookContentSetting, missings: Missing[]): Promise<Blob> {
    const data = this.getCodebookData(units, options, missings);
    if (options.exportFormat === 'docx') {
      const { CodebookDocxGenerator } = await import('./codebook-docx-generator');
      return CodebookDocxGenerator.generateDocx(data, options);
    }
    return new Blob([JSON.stringify(data.map(({
      key, name, variables, missings: unitMissings
    }) => ({
      key, name, variables, missings: unitMissings
    })))], { type: 'application/json' });
  }

  private static isClosed(code: CodeData): boolean {
    return code.type === 'RESIDUAL_AUTO' || code.type === 'INTENDED_INCOMPLETE';
  }

  private static isManual(code: CodeData): boolean {
    return !this.isClosed(code) && hasCodebookManualInstruction(code.manualInstruction);
  }

  private static getVariable(variable: VariableCodingData, options: CodeBookContentSetting): BookVariable | null {
    const trainingRequired = variable.processing?.includes('CODER_TRAINING_REQUIRED') ?? false;
    if (options.trainingRequirement === 'required' && !trainingRequired) return null;
    if (options.trainingRequirement === 'not-required' && trainingRequired) return null;
    if (variable.sourceType === 'BASE_NO_VALUE' || (variable.sourceType !== 'BASE' && !options.hasDerivedVars)) return null;
    const codes = (variable.codes || []).filter(code => code.id !== undefined && code.id !== null);
    const manual = codes.some(code => this.isManual(code));
    const closed = codes.some(code => this.isClosed(code));
    if ((options.hasOnlyManualCoding || options.hasClosedVars) &&
      !((options.hasOnlyManualCoding && manual) || (options.hasClosedVars && closed))) return null;
    const exportedCodes = options.hasOnlyManualCoding && !options.hasClosedVars ? codes.filter(code => this.isManual(code)) : codes;
    if (options.hasOnlyVarsWithCodes && !exportedCodes.length) return null;
    return {
      id: variable.alias || variable.id,
      label: variable.label || '',
      sourceType: variable.sourceType,
      generalInstruction: options.hasGeneralInstructions ? variable.manualInstruction || '' : '',
      codes: exportedCodes.map(code => this.getCode(code, options))
    };
  }

  private static getCode(code: CodeData, options: CodeBookContentSetting): CodeInfo {
    const fallback: CodeInfo = { id: `${code.id}`, label: '', description: '<p>Kodierschema mit Schemer Version ab 1.5 erzeugen!</p>' };
    if (options.showScore) fallback.score = '';
    if (Object.prototype.hasOwnProperty.call(code, 'rules')) return fallback;
    try {
      const text = ToTextFactory.codeAsText(code, 'SIMPLE');
      const rules = options.hasOnlyManualCoding && !options.hasClosedVars ? '' :
        (text.ruleSetDescriptions || []).filter(rule => rule !== 'Keine Regeln definiert.' || !code.manualInstruction)
          .map(rule => `<p>${rule}</p>`).join('');
      const result: CodeInfo = { id: `${code.id}`, label: options.codeLabelToUpper ? text.label.toUpperCase() : text.label, description: `${rules}${code.manualInstruction || ''}` };
      if (options.showScore) result.score = `${text.score}`;
      return result;
    } catch {
      return fallback;
    }
  }
}
