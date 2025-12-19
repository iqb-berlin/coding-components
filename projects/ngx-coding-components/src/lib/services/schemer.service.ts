import { Injectable } from '@angular/core';
import { CodingToTextMode } from '@iqb/responses';
import {
  CodeData,
  CodeType,
  VariableCodingData,
  RuleSet
} from '@iqbspecs/coding-scheme/coding-scheme.interface';
import {
  CodingScheme,
  DeriveConcatDelimiter,
  RuleMethodParameterCount
} from '@iqbspecs/coding-scheme';
import {
  VariableInfo,
  VariableValue
} from '@iqbspecs/variable-info/variable-info.interface';

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
  copiedCode: CodeData | null = null;
  private static readonly residualTypes: CodeType[] = [
    'RESIDUAL',
    'RESIDUAL_AUTO',
    'INTENDED_INCOMPLETE'
  ];

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
        return this.varList.find(
          v => v.id === (varCoding.deriveSources || [])[0]
        );
      }
    } else if (varCoding.sourceType === 'CONCAT_CODE') {
      if (varCoding.deriveSources && varCoding.deriveSources.length > 0) {
        const codes: (number | 'INVALID' | 'INTENDED_INCOMPLETE')[][] = [];
        let totalCodesCount = 0;
        varCoding.deriveSources.forEach((s: string) => {
          if (this.codingScheme) {
            const coding = this.codingScheme.variableCodings.find(
              v => v.id === s
            );
            codes.push(coding ? (coding.codes || []).map(c => c.id) : []);
            totalCodesCount += coding ? (coding.codes || []).length : 0;
          }
        });
        let resultArray: string[] = [];
        if (totalCodesCount < 10) {
          codes.forEach((c: (number | 'INVALID' | 'INTENDED_INCOMPLETE')[]) => {
            if (resultArray.length > 0) {
              resultArray = resultArray.flatMap(oldEntry => c
                .filter(cEntry => cEntry !== null)
                .map(
                  cEntry => `${oldEntry}${DeriveConcatDelimiter}${cEntry}`
                )
              );
            } else {
              resultArray = c
                .filter(cEntry => cEntry !== null)
                .map(cEntry => cEntry.toString(10));
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
          values: resultArray.map(
            r => <VariableValue>{
              value: r,
              label: ''
            }
          ),
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
      return false; // Ein Alias wird benötigt, und eine Codierungsstruktur muss vorhanden sein.
    }

    const normalisedAlias = checkAlias.toUpperCase();
    const hasDuplicate = this.codingScheme.variableCodings.some(
      (variable: VariableCodingData) => variable.alias?.toUpperCase() === normalisedAlias &&
        variable.id !== checkId
    );

    return !hasDuplicate;
  }

  copySingleCode(code: CodeData): boolean {
    if (!code) return false;
    // deep clone to avoid mutating the source code when editing/pasting
    this.copiedCode = JSON.parse(JSON.stringify(code)) as CodeData;
    return true;
  }

  canPasteSingleCodeInto(codeList: CodeData[]): boolean {
    if (!this.copiedCode) return false;
    if (!['RW_MINIMAL', 'RW_MAXIMAL'].includes(this.userRole)) return false;
    if (!this.copiedCode) return false;
    const typeToPaste = this.copiedCode.type as CodeType | undefined;
    if (typeToPaste && SchemerService.residualTypes.includes(typeToPaste)) {
      const firstResidualOrIntendedIncomplete = codeList.find(
        c => c.type && SchemerService.residualTypes.includes(c.type)
      );
      if (firstResidualOrIntendedIncomplete) return false;
    }
    return true;
  }

  pasteSingleCode(codeList: CodeData[]): CodeData | string {
    if (!this.copiedCode) return 'code.error-message.nothing-to-paste';
    if (!['RW_MINIMAL', 'RW_MAXIMAL'].includes(this.userRole)) return 'code.error-message.no-access';
    if (!codeList) return 'code.error-message.fatal-error';

    const typeToPaste = this.copiedCode.type as CodeType | undefined;

    // For these types, the target may only contain one of {RESIDUAL, RESIDUAL_AUTO, INTENDED_INCOMPLETE}
    if (typeToPaste && SchemerService.residualTypes.includes(typeToPaste)) {
      const firstResidualOrIntendedIncomplete = codeList.find(
        c => c.type && SchemerService.residualTypes.includes(c.type as CodeType)
      );
      if (firstResidualOrIntendedIncomplete) return 'code.error-message.residual-exists';
    }

    const addResult = typeToPaste ?
      this.addCode(codeList, typeToPaste) :
      'code.error-message.fatal-error';
    if (typeof addResult === 'string') return addResult;

    const created = addResult as CodeData;
    const payload = JSON.parse(JSON.stringify(this.copiedCode)) as CodeData;

    // Keep generated id/type (must behave like newly created code of this type)
    const { id, type } = created;
    Object.assign(created, payload);
    created.id = id;
    created.type = type;

    return created;
  }

  addCode(codeList: CodeData[], codeType: CodeType): CodeData | string {
    if (['RW_MINIMAL', 'RW_MAXIMAL'].includes(this.userRole)) {
      const maxCode =
        codeList.length > 0 ?
          Math.max(
            ...codeList
              .filter(c => typeof c.id === 'number')
              .map(c => Number(c.id) || 0)
          ) :
          0;
      const hasNullCode =
        codeList.length > 0 ? !!codeList.find(c => c.id === 0) : false;
      if (['RESIDUAL', 'RESIDUAL_AUTO'].includes(codeType)) {
        const firstResidualOrIntendedIncomplete = codeList.find(
          c => c.type && SchemerService.residualTypes.includes(c.type as CodeType)
        );
        if (firstResidualOrIntendedIncomplete) return 'code.error-message.residual-exists';
        const newCode = {
          id: hasNullCode ? maxCode + 1 : 0,
          type: codeType,
          label: '',
          score: 0,
          ruleSetOperatorAnd: true,
          ruleSets: [],
          manualInstruction:
            codeType === 'RESIDUAL_AUTO' ?
              '' :
              '<p style="padding-left: 0; text-indent: 0; margin-bottom: 0; margin-top: 0">Alle anderen Antworten</p>'
        };
        codeList.push(newCode);
        return newCode;
      }
      if (codeType === 'INTENDED_INCOMPLETE') {
        const firstResidualOrIntendedIncomplete = codeList.find(
          c => c.type && SchemerService.residualTypes.includes(c.type as CodeType)
        );
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

      if (
        [
          'FULL_CREDIT',
          'PARTIAL_CREDIT',
          'NO_CREDIT',
          'UNSET',
          'TO_CHECK'
        ].includes(codeType)
      ) {
        let newCodeId = -1;
        codeList
          .filter(c => typeof c.id === 'number')
          .forEach(c => {
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
          ruleSets: [
            <RuleSet>{
              ruleOperatorAnd: false,
              rules: [
                {
                  method: 'MATCH',
                  parameters: ['']
                }
              ]
            }
          ],
          manualInstruction: ''
        };
        const firstFollowerCode =
          codeList.length > 0 ?
            codeList.findIndex(
              c => this.orderOfCodeTypes.indexOf(c.type as CodeType) >
                  this.orderOfCodeTypes.indexOf(codeType)
            ) :
            -1;
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

  duplicateCode(codeList: CodeData[], codeIndex: number): CodeData | string {
    if (!['RW_MINIMAL', 'RW_MAXIMAL'].includes(this.userRole)) return 'code.error-message.no-access';
    if (codeIndex < 0 || codeIndex >= codeList.length) return 'code.error-message.invalid-index';

    const sourceCode = codeList[codeIndex];
    if (
      ['RESIDUAL', 'RESIDUAL_AUTO', 'INTENDED_INCOMPLETE'].includes(
        sourceCode.type as CodeType
      )
    ) {
      return 'code.error-message.type-not-supported';
    }

    const maxCode =
      codeList.length > 0 ?
        Math.max(
          ...codeList
            .filter(c => typeof c.id === 'number')
            .map(c => Number(c.id) || 0)
        ) :
        0;

    const duplicated: CodeData = JSON.parse(JSON.stringify(sourceCode));
    duplicated.id = maxCode + 1;

    codeList.splice(codeIndex + 1, 0, duplicated);
    return duplicated;
  }

  sortCodes(codeList: CodeData[], normaliseCodeIds = false) {
    if (codeList.length > 1) {
      if (normaliseCodeIds) {
        this.orderOfCodeTypes.forEach((type, typeIndex) => {
          const allCodesOfType = codeList.filter(code => code.type === type);

          if (allCodesOfType.length > 1) {
            const startValueBase =
              (typeIndex + 1) * (allCodesOfType.length > 9 ? 100 : 10);
            const startValue = startValueBase + 1;

            allCodesOfType.forEach((code: CodeData, index: number) => {
              if (code.id !== null) {
                code.id = startValue + index;
              }
            });
          }
        });

        this.orderOfCodeTypes.forEach(t => {
          if (
            !['RESIDUAL', 'RESIDUAL_AUTO', 'INTENDED_INCOMPLETE'].includes(t)
          ) {
            const allCodesOfType = codeList.filter(c => c.type === t);
            if (allCodesOfType.length === 1) allCodesOfType[0].id = this.orderOfCodeTypes.indexOf(t) + 1;
          } else {
            const allResidualCodes = codeList.filter(c => ['RESIDUAL', 'RESIDUAL_AUTO'].includes(c.type as CodeType)
            );
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

        return (
          getTypeOrder(a.type as CodeType) - getTypeOrder(b.type as CodeType)
        );
      });
    }
  }

  getVariableAliasById(varId: string): string {
    if (!varId || !this.codingScheme || !this.codingScheme.variableCodings) return '?';
    const findVar = this.codingScheme.variableCodings.find(
      (v: VariableCodingData) => v.id === varId
    );
    if (findVar) return findVar.alias || findVar.id;
    return '?';
  }

  getVariableAliasByIdListString(varIds: string[], maxEntries: number): string {
    if (!this.codingScheme || !this.codingScheme.variableCodings) return '';
    const varIdsToTake =
      maxEntries > 0 && maxEntries <= varIds.length ?
        varIds.slice(0, maxEntries) :
        varIds;
    const returnValues: string[] = varIdsToTake.map(vId => this.getVariableAliasById(vId)
    );
    if (maxEntries > 0 && maxEntries < varIds.length) returnValues.push('...');
    return returnValues.join(', ');
  }

  getBaseVarsList() {
    if (this.codingScheme) {
      return this.codingScheme.variableCodings.filter(
        (c: VariableCodingData) => c.sourceType === 'BASE'
      );
    }
    return [];
  }
}
