import { Injectable, signal } from '@angular/core';
import { CodingToTextMode } from '@iqb/responses';
import {
  CodeData,
  CodeType,
  VariableCodingData
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
import {
  addCode as addCodeOp,
  canPasteSingleCodeInto as canPasteSingleCodeIntoOp,
  copySingleCode as copySingleCodeOp,
  deleteCode as deleteCodeOp,
  duplicateCode as duplicateCodeOp,
  pasteSingleCode as pasteSingleCodeOp,
  sortCodes as sortCodesOp
} from './schemer-code-ops';

export type UserRoleType = 'RO' | 'RW_MINIMAL' | 'RW_MAXIMAL';
export const VARIABLE_NAME_CHECK_PATTERN = /^[a-zA-Z0-9_]{2,}$/;

@Injectable({
  providedIn: 'root'
})
export class SchemerService {
  private readonly _codingScheme = signal<CodingScheme | null>(null);
  private readonly _varList = signal<VariableInfo[]>([]);
  allVariableIds: string[] = [];
  ruleMethodParameterCount = RuleMethodParameterCount;
  private readonly _userRole = signal<UserRoleType>('RW_MAXIMAL');
  private readonly _copiedCode = signal<CodeData | null>(null);
  private readonly _codingToTextMode = signal<CodingToTextMode>('EXTENDED');

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

  get codingScheme(): CodingScheme | null {
    return this._codingScheme();
  }

  setCodingScheme(value: CodingScheme | null): void {
    this._codingScheme.set(value);
  }

  get varList(): VariableInfo[] {
    return this._varList();
  }

  setVarList(value: VariableInfo[]): void {
    this._varList.set(value || []);
  }

  get userRole(): UserRoleType {
    return this._userRole();
  }

  setUserRole(value: UserRoleType): void {
    this._userRole.set(value);
  }

  get copiedCode(): CodeData | null {
    return this._copiedCode();
  }

  setCopiedCode(value: CodeData | null): void {
    this._copiedCode.set(value);
  }

  get codingToTextMode(): CodingToTextMode {
    return this._codingToTextMode();
  }

  setCodingToTextMode(value: CodingToTextMode): void {
    this._codingToTextMode.set(value);
  }

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
    const copied = copySingleCodeOp(code);
    if (!copied) return false;
    this.setCopiedCode(copied);
    return true;
  }

  canPasteSingleCodeInto(codeList: CodeData[]): boolean {
    return canPasteSingleCodeIntoOp(this.copiedCode, codeList, this.userRole);
  }

  pasteSingleCode(codeList: CodeData[]): CodeData | string {
    return pasteSingleCodeOp(
      this.copiedCode,
      codeList,
      this.userRole,
      this.orderOfCodeTypes
    );
  }

  addCode(codeList: CodeData[], codeType: CodeType): CodeData | string {
    return addCodeOp(codeList, codeType, this.userRole, this.orderOfCodeTypes);
  }

  deleteCode(codeList: CodeData[], codeIndex: number): boolean {
    return deleteCodeOp(codeList, codeIndex, this.userRole);
  }

  duplicateCode(codeList: CodeData[], codeIndex: number): CodeData | string {
    return duplicateCodeOp(codeList, codeIndex, this.userRole);
  }

  sortCodes(codeList: CodeData[], normaliseCodeIds = false) {
    sortCodesOp(codeList, this.orderOfCodeTypes, normaliseCodeIds);
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
