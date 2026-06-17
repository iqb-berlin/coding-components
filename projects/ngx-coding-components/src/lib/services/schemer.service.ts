import { Injectable, signal } from '@angular/core';
import {
  CodingSchemeFactory,
  CodingSchemeProblem,
  CodingToTextMode
} from '@iqb/responses';
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
  getPasteSingleCodeWarningKeys as getPasteSingleCodeWarningKeysOp,
  pasteSingleCode as pasteSingleCodeOp,
  sortCodes as sortCodesOp
} from './schemer-code-ops';

export type UserRoleType = 'RO' | 'RW_MINIMAL' | 'RW_MAXIMAL';
export const VARIABLE_NAME_CHECK_PATTERN = /^[a-zA-Z0-9_]{2,}$/;
const COPIED_CODE_STORAGE_KEY = 'iqb-schemer-copied-code';
const COPIED_CODE_STORAGE_TYPE = 'iqb-schemer-code-clipboard';
const COPIED_CODE_STORAGE_VERSION = 1;

interface StoredCopiedCode {
  type: typeof COPIED_CODE_STORAGE_TYPE;
  version: typeof COPIED_CODE_STORAGE_VERSION;
  code: CodeData;
}

const getSessionStorage = (): Storage | null => {
  try {
    if (typeof globalThis === 'undefined' || !globalThis.sessionStorage) {
      return null;
    }
    return globalThis.sessionStorage;
  } catch {
    return null;
  }
};

const readCopiedCodeFromStorage = (): CodeData | null => {
  const storage = getSessionStorage();
  if (!storage) return null;

  try {
    const serialized = storage.getItem(COPIED_CODE_STORAGE_KEY);
    if (!serialized) return null;
    const stored = JSON.parse(serialized) as StoredCopiedCode;
    if (
      stored?.type !== COPIED_CODE_STORAGE_TYPE ||
      stored?.version !== COPIED_CODE_STORAGE_VERSION ||
      !stored?.code
    ) {
      return null;
    }
    return stored.code;
  } catch {
    return null;
  }
};

const writeCopiedCodeToStorage = (code: CodeData | null): void => {
  const storage = getSessionStorage();
  if (!storage) return;

  try {
    if (!code) {
      storage.removeItem(COPIED_CODE_STORAGE_KEY);
      return;
    }
    storage.setItem(
      COPIED_CODE_STORAGE_KEY,
      JSON.stringify({
        type: COPIED_CODE_STORAGE_TYPE,
        version: COPIED_CODE_STORAGE_VERSION,
        code
      } satisfies StoredCopiedCode)
    );
  } catch {
    // Ignore quota and privacy-mode failures; the in-memory clipboard still works.
  }
};

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
    return this.getCopiedCode();
  }

  setCopiedCode(value: CodeData | null): void {
    this._copiedCode.set(value);
    writeCopiedCodeToStorage(value);
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
    return canPasteSingleCodeIntoOp(this.getCopiedCode(), codeList, this.userRole);
  }

  getPasteSingleCodeWarningKeys(
    targetCoding?: VariableCodingData | null,
    targetVarInfo?: VariableInfo
  ): string[] {
    return getPasteSingleCodeWarningKeysOp(
      this.getCopiedCode(),
      targetCoding,
      targetVarInfo
    );
  }

  pasteSingleCode(codeList: CodeData[]): CodeData | string {
    return pasteSingleCodeOp(
      this.getCopiedCode(),
      codeList,
      this.userRole,
      this.orderOfCodeTypes
    );
  }

  getCodingProblemsForVarCoding(varCoding: VariableCodingData | null | undefined): CodingSchemeProblem[] {
    if (!varCoding || !this.codingScheme?.variableCodings) return [];

    try {
      const targetNames = [varCoding.id, varCoding.alias].filter(Boolean);
      return CodingSchemeFactory.validate(
        this.varList,
        this.codingScheme.variableCodings
      ).filter(problem => targetNames.includes(problem.variableId));
    } catch {
      return [];
    }
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

  private getCopiedCode(): CodeData | null {
    const copiedCode = this._copiedCode();
    if (copiedCode) return copiedCode;

    const storedCode = readCopiedCodeFromStorage();
    if (storedCode) this._copiedCode.set(storedCode);
    return storedCode;
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
