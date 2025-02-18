import { Injectable } from '@angular/core';
import {
  CodeData,
  CodeType,
  CodingScheme, CodingToTextMode,
  DeriveConcatDelimiter,
  RuleMethodParameterCount, RuleSet,
  VariableCodingData,
  VariableInfo,
  VariableValue
} from '@iqb/responses';

export type UserRoleType = 'RO' | 'RW_MINIMAL' | 'RW_MAXIMAL';
export const VARIABLE_NAME_CHECK_PATTERN = /^[a-zA-Z0-9_]{2,}$/;

@Injectable({
  providedIn: 'root'
})
export class SchemerService {
  codingScheme: CodingScheme | null = null;
  varList: VariableInfo[] = [];
  allVariableIds: string[] = [];
  ruleMethodParameterCount = RuleMethodParameterCount;
  userRole: UserRoleType = 'RW_MAXIMAL';
  orderOfCodeTypes: CodeType[] = [
    'FULL_CREDIT',
    'PARTIAL_CREDIT',
    'TO_CHECK',
    'NO_CREDIT',
    'UNSET',
    'INTENDED_INCOMPLETE',
    'RESIDUAL',
    'RESIDUAL_AUTO'
  ];

  codingToTextMode: CodingToTextMode = 'EXTENDED';

  getVarInfoByCoding(varCoding: VariableCodingData): VariableInfo | undefined {
    if (varCoding.sourceType === 'BASE') {
      return this.varList.find(v => v.id === varCoding.id);
    }
    if (varCoding.sourceType === 'COPY_VALUE') {
      if (varCoding.deriveSources && varCoding.deriveSources.length > 0) {
        return this.varList.find(v => v.id === varCoding.deriveSources[0]);
      }
    } else if (varCoding.sourceType === 'CONCAT_CODE') {
      if (varCoding.deriveSources && varCoding.deriveSources.length > 0) {
        const codes: (number | 'INVALID' | 'INTENDED_INCOMPLETE')[][] = [];
        let totalCodesCount = 0;
        varCoding.deriveSources.forEach(s => {
          if (this.codingScheme) {
            const coding = this.codingScheme.variableCodings.find(v => v.id === s);
            codes.push(coding ? coding.codes.map(c => c.id) : []);
            totalCodesCount += coding ? coding.codes.length : 0;
          }
        });
        let resultArray: string[] = [];
        if (totalCodesCount < 10) {
          codes.forEach(c => {
            if (resultArray.length > 0) {
              const newArray: string[] = [];
              resultArray.forEach(oldEntry => {
                c.forEach(cEntry => {
                  if (cEntry !== null) newArray.push(`${oldEntry}${DeriveConcatDelimiter}${cEntry}`);
                });
              });
              resultArray = newArray;
            } else {
              c.forEach(cEntry => {
                if (cEntry !== null) resultArray.push(cEntry.toString(10));
              });
            }
          });
        }
        return <VariableInfo>{
          id: varCoding.id,
          alias: varCoding.alias,
          type: 'string',
          format: '',
          multiple: false,
          nullable: false,
          values: resultArray.map(r => <VariableValue>{
            value: r, label: ''
          }),
          valuePositionLabels: [],
          valuesComplete: true,
          page: ''
        };
      }
    } else if (varCoding.deriveSources && varCoding.deriveSources.length > 0) {
      return <VariableInfo>{
        id: varCoding.id,
        alias: varCoding.alias,
        type: 'integer',
        format: '',
        multiple: false,
        nullable: false,
        values: [],
        valuePositionLabels: [],
        valuesComplete: false,
        page: ''
      };
    }
    return undefined;
  }

  changeNewVarIdIfExists(checkId: string): string {
    let idToCheck = checkId;
    let modifier = 0;
    let idFound = true;
    while (idFound) {
      if (modifier > 0) idToCheck = `${checkId}_${modifier}`;
      // eslint-disable-next-line @typescript-eslint/no-loop-func
      idFound = !!this.allVariableIds.find(v => v.toUpperCase() === idToCheck.toUpperCase());
      modifier += 1;
    }
    return idToCheck;
  }

  checkRenamedVarAliasOk(checkAlias: string, checkId?: string): boolean {
    if (this.codingScheme && this.codingScheme.variableCodings && checkAlias) {
      const normalisedAlias = checkAlias?.toUpperCase();
      const doubleFound = this.codingScheme.variableCodings
        .find(v => v.alias?.toUpperCase() === normalisedAlias && v.id !== checkId);
      return !doubleFound;
    }
    return !checkAlias;
  }

  addCode(codeList: CodeData[], codeType: CodeType): CodeData | string {
    if (['RW_MINIMAL', 'RW_MAXIMAL'].includes(this.userRole)) {
      const maxCode = codeList.length > 0 ? Math.max(...codeList
        .filter(c => typeof c.id === 'number').map(c => Number(c.id) || 0)) : 0;
      const hasNullCode = codeList.length > 0 ? !!codeList.find(c => c.id === 0) : false;
      if (['RESIDUAL', 'RESIDUAL_AUTO'].includes(codeType)) {
        const firstResidualOrIntendedIncomplete = codeList
          .find(c => ['RESIDUAL', 'RESIDUAL_AUTO', 'INTENDED_INCOMPLETE'].includes(c.type));
        if (firstResidualOrIntendedIncomplete) return 'code.error-message.residual-exists';
        const newCode = {
          id: hasNullCode ? maxCode + 1 : 0,
          type: codeType,
          label: '',
          score: 0,
          ruleSetOperatorAnd: true,
          ruleSets: [],
          manualInstruction: codeType === 'RESIDUAL_AUTO' ? '' :
            '<p style="padding-left: 0; text-indent: 0; margin-bottom: 0; margin-top: 0">Alle anderen Antworten</p>'
        };
        codeList.push(newCode);
        return newCode;
      }
      if (codeType === 'INTENDED_INCOMPLETE') {
        const firstResidualOrIntendedIncomplete = codeList
          .find(c => ['RESIDUAL', 'RESIDUAL_AUTO', 'INTENDED_INCOMPLETE'].includes(c.type));
        if (firstResidualOrIntendedIncomplete) return 'code.error-message.residual-exists';
        const newCode = {
          id: 'INTENDED_INCOMPLETE' as const,
          type: codeType,
          label: '',
          score: 0,
          ruleSetOperatorAnd: true,
          ruleSets: [],
          manualInstruction: ''
        };
        codeList.push(newCode);
        return newCode;
      }

      if (['FULL_CREDIT', 'PARTIAL_CREDIT', 'NO_CREDIT', 'UNSET', 'TO_CHECK'].includes(codeType)) {
        let newCodeId = -1;
        codeList.filter(c => typeof c.id === 'number').forEach(c => {
          if (c.type === codeType && c.id && Number(c.id) > newCodeId) newCodeId = Number(c.id);
        });
        if (newCodeId < 0) {
          newCodeId = this.orderOfCodeTypes.indexOf(codeType) + 1;
          const alreadyUsed = codeList.find(c => c.id === newCodeId);
          if (alreadyUsed) newCodeId = maxCode + 1;
        } else {
          const newCodeFound = codeList.find(c => c.id === newCodeId + 1);
          newCodeId = newCodeFound ? maxCode + 1 : newCodeId + 1;
        }
        const newCode = {
          id: newCodeId,
          type: codeType,
          label: '',
          score: codeType === 'FULL_CREDIT' ? 1 : 0,
          ruleSetOperatorAnd: true,
          ruleSets: [<RuleSet>{
            ruleOperatorAnd: false,
            rules: [
              {
                method: 'MATCH',
                parameters: [
                  ''
                ]
              }
            ]
          }],
          manualInstruction: ''
        };
        const firstFollowerCode = codeList.length > 0 ? codeList.findIndex(
          c => this.orderOfCodeTypes.indexOf(c.type) > this.orderOfCodeTypes.indexOf(codeType)) : -1;
        if (firstFollowerCode < 0) {
          codeList.push(newCode);
        } else {
          codeList.splice(firstFollowerCode, 0, newCode);
        }
        return newCode;
      }
      return 'code.error-message.type-not-supported';
    }
    return 'code.error-message.no-access';
  }

  deleteCode(codeList: CodeData[], codeIndex: number): boolean {
    if (['RW_MINIMAL', 'RW_MAXIMAL'].includes(this.userRole)) {
      if (codeIndex < codeList.length) {
        codeList.splice(codeIndex, 1);
        return true;
      }
    }
    return false;
  }

  sortCodes(codeList: CodeData[], normaliseCodeIds = false) {
    if (codeList.length > 1) {
      if (normaliseCodeIds) {
        this.orderOfCodeTypes.forEach(t => {
          const allCodesOfType = codeList.filter(c => c.type === t);
          if (allCodesOfType.length > 1) {
            const startValue = allCodesOfType.length > 9 ?
              (this.orderOfCodeTypes.indexOf(t) + 1) * 100 + 1 : (this.orderOfCodeTypes.indexOf(t) + 1) * 10 + 1;
            allCodesOfType.forEach((c: CodeData, index: number) => {
              if (c.id !== null) c.id = startValue + index;
            });
          }
        });
        this.orderOfCodeTypes.forEach(t => {
          if (!(['RESIDUAL', 'RESIDUAL_AUTO', 'INTENDED_INCOMPLETE'].includes(t))) {
            const allCodesOfType = codeList.filter(c => c.type === t);
            if (allCodesOfType.length === 1) allCodesOfType[0].id = this.orderOfCodeTypes.indexOf(t) + 1;
          } else {
            const allResidualCodes = codeList.filter(c => ['RESIDUAL', 'RESIDUAL_AUTO'].includes(c.type));
            if (allResidualCodes.length === 1) allResidualCodes[0].id = 0;
          }
        });
      }
      codeList.sort((a: CodeData, b: CodeData) => {
        if (a.type === b.type) {
          if (a.id === null) return b.id === null ? 0 : -1;
          if (b.id === null) return 1;
          if (a.id === b.id) return 0;
          return a.id < b.id ? -1 : 1;
        }
        return this.orderOfCodeTypes.indexOf(a.type) < this.orderOfCodeTypes.indexOf(b.type) ? -1 : 1;
      });
    }
  }

  getVariableAliasById(varId: string): string {
    if (!varId || !this.codingScheme || !this.codingScheme.variableCodings) return '?';
    const findVar = this.codingScheme.variableCodings
      .find(v => v.id === varId);
    if (findVar) return findVar.alias || findVar.id;
    return '?';
  }

  getVariableAliasByIdListString(varIds: string[], maxEntries: number): string {
    if (!this.codingScheme || !this.codingScheme.variableCodings) return '';
    const varIdsToTake = maxEntries > 0 && maxEntries <= varIds.length ? varIds.slice(0, maxEntries) : varIds;
    const returnValues: string[] = varIdsToTake.map(vId => this.getVariableAliasById(vId));
    if (maxEntries > 0 && maxEntries < varIds.length) returnValues.push('...');
    return returnValues.join(', ');
  }

  getBaseVarsList() {
    if (this.codingScheme) {
      return this.codingScheme.variableCodings.filter(c => c.sourceType === 'BASE');
    }
    return [];
  }
}
