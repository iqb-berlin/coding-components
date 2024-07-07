import { Injectable } from '@angular/core';
import {
  CodeData,
  CodeType,
  CodingScheme,
  DeriveConcatDelimiter,
  RuleMethodParameterCount,
  VariableCodingData,
  VariableInfo,
  VariableValue
} from '@iqb/responses';

export type UserRoleType = 'RO' | 'RW_MINIMAL' | 'RW_MAXIMAL';

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
    'FULL_CREDIT', 'PARTIAL_CREDIT', 'NO_CREDIT', 'UNSET', 'RESIDUAL', 'RESIDUAL_AUTO'
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
        console.log(resultArray);
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
      const maxCode = Math.max(...codeList.map(c => c.id || 0));
      const hasNullCode = !!codeList.find(c => c.id === 0);
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
          manualInstruction: ''
        };
        codeList.push(newCode);
        return newCode;
      }
      if (['FULL_CREDIT', 'PARTIAL_CREDIT', 'NO_CREDIT', 'UNSET'].includes(codeType)) {
        let newCodeId = -1;
        codeList.forEach(c => {
          if (c.type === codeType && c.id && c.id > newCodeId) newCodeId = c.id;
        });
        if (newCodeId < 0) {
          newCodeId = maxCode + 1;
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
          ruleSets: [],
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

  deleteCode(codeList?: CodeData[], codeIndex?: number): boolean {
    if (codeList && codeIndex && ['RW_MINIMAL', 'RW_MAXIMAL'].includes(this.userRole)) {
      if (codeIndex < codeList.length) {
        codeList.splice(codeIndex, 1);
        return true;
      }
    }
    return false;
  }
}
