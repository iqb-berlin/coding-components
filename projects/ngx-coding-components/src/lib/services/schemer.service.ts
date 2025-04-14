import { Injectable } from '@angular/core';
import { CodingToTextMode } from '@iqb/responses';
import {
  CodeData, CodeType, CodingScheme, DeriveConcatDelimiter, RuleMethodParameterCount, VariableCodingData, RuleSet
} from '@iqbspecs/coding-scheme/coding-scheme.interface';
import { VariableInfo, VariableValue } from '@iqbspecs/variable-info/variable-info.interface';

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

  findDuplicateVariables(): { id: string, alias: string, count: number }[] {
    const variableMap = new Map<string, { count: number, alias: string }>();

    this.varList.forEach(variable => {
      const key = variable.id; // Oder `variable.alias`, falls nach Aliases gesucht wird
      if (!variableMap.has(key)) {
        variableMap.set(key, { count: 1, alias: variable.alias ?? '' });
      } else {
        const entry = variableMap.get(key)!;
        variableMap.set(key, { ...entry, count: entry.count + 1 });
      }
    });

    return Array.from(variableMap)
      .filter(([_, value]) => value.count > 1)
      .map(([id, value]) => ({ id, alias: value.alias, count: value.count }));
  }

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
          const coding = this.codingScheme?.variableCodings
            .find(v => v.id === s);
          if (coding?.codes) {
            codes.push(coding.codes.map(c => c.id));
            totalCodesCount += coding.codes.length;
          } else {
            codes.push([]);
          }
        });
        let resultArray: string[] = [];
        if (totalCodesCount < 10) {
          codes.forEach(currentCodeSet => {
            const filteredCodes = currentCodeSet
              .filter(code => code !== null);

            if (resultArray.length > 0) {
              resultArray = resultArray.flatMap(existingEntry => filteredCodes
                .map(code => `${existingEntry}${DeriveConcatDelimiter}${code}`)
              );
            } else {
              resultArray = filteredCodes.map(code => code.toString(10));
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

  checkRenamedVarAliasOk(checkAlias: string, checkId?: string): boolean {
    if (!checkAlias || !this.codingScheme?.variableCodings) {
      return false;
    }

    const normalisedAlias = checkAlias.toUpperCase();
    const hasDuplicate = this.codingScheme.variableCodings.some(
      variable => variable.alias?.toUpperCase() === normalisedAlias && variable.id !== checkId
    );

    return !hasDuplicate;
  }

  addCode(codeList: CodeData[], codeType: CodeType): CodeData | string {
    if (['RW_MINIMAL', 'RW_MAXIMAL'].includes(this.userRole)) {
      const maxCode = codeList.length > 0 ? Math.max(...codeList
        .filter(c => typeof c.id === 'number')
        .map(c => Number(c.id) || 0)) : 0;
      const hasNullCode = codeList.length > 0 ? !!codeList
        .find(c => c.id === 0) : false;
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
          id: 0,
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
        this.orderOfCodeTypes.forEach((type, typeIndex) => {
          const allCodesOfType = codeList.filter(code => code.type === type);

          if (allCodesOfType.length > 1) {
            const startValueBase = (typeIndex + 1) * (allCodesOfType.length > 9 ? 100 : 10);
            const startValue = startValueBase + 1;

            allCodesOfType.forEach((code: CodeData, index: number) => {
              if (code.id !== null) {
                code.id = startValue + index;
              }
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
        const getTypeOrder = (type: CodeType): number => this.orderOfCodeTypes.indexOf(type);

        if (a.type === b.type) {
          if (a.id === b.id) return 0; // Both IDs are the same
          if (a.id === null) return -1; // `null` ID comes first
          if (b.id === null) return 1; // `null` ID comes last
          return a.id < b.id ? -1 : 1; // Sort IDs in ascending order
        }

        return getTypeOrder(a.type) - getTypeOrder(b.type);
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
