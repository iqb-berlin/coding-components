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
      if (codeType === 'UNSET') {
        const newCode = {
          id: maxCode + 1,
          type: codeType,
          label: '',
          score: 0,
          ruleSetOperatorAnd: false,
          ruleSets: [],
          manualInstruction: ''
        };
        const firstResidualCode = codeList.findIndex(c => ['RESIDUAL_AUTO', 'RESIDUAL'].includes(c.type));
        if (firstResidualCode < 0) {
          codeList.push(newCode);
        } else {
          codeList.splice(firstResidualCode, 0, newCode);
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
