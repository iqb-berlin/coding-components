import { Injectable } from '@angular/core';
import {
  CodeData,
  CodeType,
  CodingScheme,
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
  userRole: UserRoleType = 'RO';
  orderOfCodeTypes: CodeType[] = [
    'FULL_CREDIT', 'PARTIAL_CREDIT', 'TO_CHECK', 'NO_CREDIT', 'UNSET', 'RESIDUAL', 'RESIDUAL_AUTO'
  ];

  getVarInfoByCoding(varCoding: VariableCodingData): VariableInfo | undefined {
    if (varCoding.sourceType === 'BASE') {
      return this.varList.find(v => v.id === varCoding.id);
    } if (varCoding.sourceType === 'COPY_VALUE') {
      if (varCoding.deriveSources && varCoding.deriveSources.length > 0) {
        return this.varList.find(v => v.id === varCoding.deriveSources[0]);
      }
    } else if (varCoding.sourceType === 'CONCAT_CODE') {
      if (varCoding.deriveSources && varCoding.deriveSources.length > 0) {
        const codes: (number | null)[][] = [];
        varCoding.deriveSources.forEach(s => {
          if (this.codingScheme) {
            const coding = this.codingScheme.variableCodings.find(v => v.id === s);
            codes.push(coding ? coding.codes.map(c => c.id) : []);
          }
        });
        let resultArray: string[] = [];
        codes.forEach(c => {
          if (resultArray.length > 0) {
            const newArray: string[] = [];
            resultArray.forEach(oldEntry => {
              c.forEach(cEntry => {
                if (cEntry) newArray.push(`${oldEntry}${DeriveConcatDelimiter}${cEntry}`);
              });
            });
            resultArray = newArray;
          } else {
            c.forEach(cEntry => {
              if (cEntry) resultArray.push(cEntry.toString(10));
            });
          }
        });
        return <VariableInfo>{
          id: varCoding.id,
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

  variableIdExists(checkId: string, oldId?: string): boolean {
    const modifiedVariableIds = this.allVariableIds.filter(v => !oldId || v !== oldId);
    const normalisedId = checkId.toUpperCase();
    return !!modifiedVariableIds.find(v => v.toUpperCase() === normalisedId);
  }

  addCode(codeList: CodeData[], codeType: CodeType): CodeData | string {
    if (['RW_MINIMAL', 'RW_MAXIMAL'].includes(this.userRole)) {
      const maxCode = codeList.length > 0 ? Math.max(...codeList.map(c => c.id || 0)) : 0;
      const hasNullCode = codeList.length > 0 ? !!codeList.find(c => c.id === 0) : false;
      if (['RESIDUAL', 'RESIDUAL_AUTO'].includes(codeType)) {
        const firstResidual = codeList.find(c => ['RESIDUAL', 'RESIDUAL_AUTO'].includes(c.type));
        if (firstResidual) return 'code.error-message.residual-exists';
        const newCode = {
          id: hasNullCode ? maxCode + 1 : 0,
          type: codeType,
          label: '',
          score: 0,
          ruleSetOperatorAnd: false,
          ruleSets: [],
          manualInstruction: `<p style="padding-left: 0; text-indent: 0; margin-bottom: 0; margin-top: 0">
                                Alle anderen Antworten ${codeType === 'RESIDUAL_AUTO' ? ' (automatisch)' : ''}
                              </p>`
        };
        codeList.push(newCode);
        return newCode;
      }
      if (['FULL_CREDIT', 'PARTIAL_CREDIT', 'NO_CREDIT', 'UNSET', 'TO_CHECK'].includes(codeType)) {
        let newCodeId = -1;
        codeList.forEach(c => {
          if (c.type === codeType && c.id && c.id > newCodeId) newCodeId = c.id;
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
          ruleSetOperatorAnd: false,
          ruleSets: [<RuleSet>{
            ruleOperatorAnd: true,
            rules: []
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
          if (!['RESIDUAL', 'RESIDUAL_AUTO'].includes(t)) {
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

  getVariableAliasById(varId?: string | string[]): string {
    if (!varId || !this.codingScheme || !this.codingScheme.variableCodings) return '';
    if (typeof varId === 'string') {
      const findVar = this.codingScheme.variableCodings
        .find(v => v.id === varId);
      if (findVar) return findVar.alias || findVar.id;
      return '';
    }
    if (Array.isArray(varId)) {
      const returnValues: string[] = this.codingScheme.variableCodings
        .filter(v => varId.includes(v.id)).map(v => v.alias || v.id);
      return returnValues.join(', ');
    }
    return '?';
  }
}
