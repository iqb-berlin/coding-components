import {
  ToTextFactory, CodeAsText
} from '@iqb/responses';
import { VariableCodingData, CodeData, CodingScheme } from '@iqbspecs/coding-scheme';

import type {
  BookVariable,
  CodeBookContentSetting,
  CodebookUnitDto,
  CodeInfo,
  Missing,
  UnitPropertiesForCodebook
} from '@iqb/ngx-coding-components/codebook-models';

/**
 * Class for generating codebooks
 */
export class CodebookGenerator {
  static async generateCodebook(
    units: UnitPropertiesForCodebook[],
    contentSetting: CodeBookContentSetting,
    missings: Missing[]
  ): Promise<Blob> {
    const codebook: CodebookUnitDto[] = units.map(
      (unit: UnitPropertiesForCodebook) => this.getCodeBookDataForUnit(unit, contentSetting, missings)
    );

    if (contentSetting.exportFormat === 'docx') {
      const { CodebookDocxGenerator } = await import('./codebook-docx-generator.class');
      return CodebookDocxGenerator.generateDocx(codebook, contentSetting);
    }

    const noItemsCodebook = codebook.map((unit: CodebookUnitDto) => ({
      key: unit.key,
      name: unit.name,
      variables: unit.variables,
      missings: unit.missings
    }));
    const data = JSON.stringify(noItemsCodebook);
    return new Blob([data], { type: 'application/json' });
  }

  private static getCodeBookDataForUnit(
    unit: UnitPropertiesForCodebook,
    contentSetting: CodeBookContentSetting,
    missings: Missing[]
  ): CodebookUnitDto {
    const parsedScheme = unit.scheme ? new CodingScheme(unit.scheme) : null;
    const variableCodings = parsedScheme?.variableCodings || [];
    const bookVariables = this.getBookVariables(variableCodings, contentSetting);
    return {
      key: unit.key,
      name: unit.name,
      variables: this.getSortedBookVariables(bookVariables.filter(v => v.sourceType !== 'BASE_NO_VALUE')),
      missings: missings,
      items: unit.metadata?.items
    };
  }

  private static getBookVariables(
    variableCodings: VariableCodingData[],
    contentSetting: CodeBookContentSetting
  ): BookVariable[] {
    return variableCodings.reduce((bookVariables: BookVariable[], variableCoding) => {
      const bookVariable = this.getBaseOrDerivedBookVariable(variableCoding, contentSetting);
      if (bookVariable) bookVariables.push(bookVariable);
      return bookVariables;
    }, []);
  }

  private static getSortedBookVariables(bookVariables: BookVariable[]): BookVariable[] {
    return bookVariables.sort((a, b) => {
      if (a.id < b.id) return -1;
      if (a.id > b.id) return 1;
      return 0;
    });
  }

  private static getBaseOrDerivedBookVariable(
    variableCoding: VariableCodingData,
    contentSetting: CodeBookContentSetting
  ): BookVariable | null {
    const rawCodes = variableCoding.codes ?? [];
    const codes: CodeInfo[] = this.getCodes(rawCodes, contentSetting);
    const isDerived: boolean = (
      variableCoding.sourceType !== 'BASE' && variableCoding.sourceType !== 'BASE_NO_VALUE'
    );
    if (!isDerived || contentSetting.hasDerivedVars) {
      return this.getManualOrClosedCodedBookVariable(contentSetting, codes, variableCoding);
    }
    return null;
  }

  private static getManualOrClosedCodedBookVariable(
    contentSetting: CodeBookContentSetting,
    codes: CodeInfo[],
    variableCoding: VariableCodingData
  ): BookVariable | null {
    const isClosed = this.isClosed(variableCoding);
    const isManual = this.isManual(variableCoding);

    const filterManual = contentSetting.hasOnlyManualCoding;
    const filterClosed = contentSetting.hasClosedVars;

    let manualMatches = isManual;
    const closedMatches = isClosed;

    if (filterManual && !filterClosed) {
      manualMatches = isManual && !isClosed;
    }

    if (filterManual || filterClosed) {
      const matches = (filterManual && manualMatches) || (filterClosed && closedMatches);
      if (!matches) return null;
    } else if (contentSetting.hasOnlyVarsWithCodes) {
      if (!isManual && !isClosed) return null;
    }

    return {
      id: variableCoding.alias || variableCoding.id,
      label: variableCoding.label ?? '',
      sourceType: variableCoding.sourceType,
      generalInstruction: contentSetting.hasGeneralInstructions ?
        (variableCoding.manualInstruction ?? '') :
        '',
      codes: codes
    };
  }

  private static isClosed(variableCodingData: VariableCodingData): boolean {
    return (variableCodingData.codes ?? []).some(
      codeData => codeData.type === 'RESIDUAL_AUTO' || codeData.type === 'INTENDED_INCOMPLETE'
    );
  }

  private static isManual(variableCodingData: VariableCodingData): boolean {
    return (variableCodingData.codes ?? []).some(codeData => !!codeData.manualInstruction);
  }

  private static getCodes(codes: CodeData[], contentSetting: CodeBookContentSetting): CodeInfo[] {
    return codes.reduce((codeInfos: CodeInfo[], code) => {
      if (code.id !== undefined && code.id !== null) {
        try {
          const codeInfo = this.getCodeInfoFromCodeAsText(code, contentSetting);
          codeInfos.push(codeInfo);
        } catch (error) {
          const codeInfo = this.getCodeInfo(code, contentSetting);
          codeInfos.push(codeInfo);
        }
      }
      return codeInfos;
    }, []);
  }

  private static getCodeInfo(code: CodeData, contentSetting: CodeBookContentSetting): CodeInfo {
    const codeInfo: CodeInfo = {
      id: `${code.id}`,
      label: '',
      description:
        '<p>Kodierschema mit Schemer Version ab 1.5 erzeugen!</p>'
    };
    if (contentSetting.showScore) codeInfo.score = '';
    return codeInfo;
  }

  private static getCodeInfoFromCodeAsText(code: CodeData, contentSetting: CodeBookContentSetting): CodeInfo {
    const codeAsText = ToTextFactory.codeAsText(code, 'SIMPLE');
    const rulesDescription = contentSetting.hasOnlyManualCoding && !contentSetting.hasClosedVars ? '' :
      this.getRulesDescription(codeAsText, code);
    const codeInfo: CodeInfo = {
      id: `${code.id}`,
      label: contentSetting.codeLabelToUpper ? codeAsText.label.toUpperCase() : codeAsText.label,
      description: `${rulesDescription}${code.manualInstruction ?? ''}`
    };
    if (contentSetting.showScore) codeInfo.score = codeAsText.score.toString();
    return codeInfo;
  }

  private static getRulesDescription(codeAsText: CodeAsText, code: CodeData): string {
    let rulesDescription = '';
    codeAsText.ruleSetDescriptions.forEach(
      (ruleSetDescription: string) => {
        if (ruleSetDescription !== 'Keine Regeln definiert.') {
          rulesDescription += `<p>${ruleSetDescription}</p>`;
        } else if ((code.manualInstruction ?? '') === '') rulesDescription += `<p>${ruleSetDescription}</p>`;
      }
    );
    return rulesDescription;
  }
}
