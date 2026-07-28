import { VariableCodingData } from '@iqbspecs/coding-scheme/coding-scheme.interface';
import {
  isValidVariableIdentifier,
  validateVariableList,
  VariableIdentifiers,
  VariableValidationError
} from './variable-identifier-validation';

const copyVariableIdentifiers = (
  variable: VariableIdentifiers,
  origin: SchemerIdentifierOrigin,
  sourceIndex: number
): SchemerIdentifier => ({
  id: variable.id,
  ...(Object.prototype.hasOwnProperty.call(variable, 'alias') ?
    { alias: variable.alias } :
    {}),
  origin,
  sourceIndex
});

export const isEmptyVariableCoding = (
  coding: VariableCodingData
): boolean => {
  if (coding.label && coding.label !== coding.id) return false;
  if (
    (coding.processing && coding.processing.length > 0) ||
    coding.fragmenting ||
    (coding.codes && coding.codes.length > 0)
  ) return false;
  return !(
    (coding.manualInstruction && coding.manualInstruction.length > 0) ||
    coding.codeModel !== 'MANUAL_AND_RULES'
  );
};

export type SchemerIdentifierOrigin =
  'VAR_LIST' |
  'BASE_CODING' |
  'DERIVED_CODING';

export interface SchemerIdentifier extends VariableIdentifiers {
  origin: SchemerIdentifierOrigin;
  sourceIndex: number;
}

const getSchemerIdentifiersForValidation = (
  varList: ReadonlyArray<VariableIdentifiers> = [],
  variableCodings: ReadonlyArray<VariableCodingData> = []
): SchemerIdentifier[] => {
  const representedBaseIds = new Set(varList.map(variable => variable.id));
  const matchedBaseIds = new Set<string>();
  const canRemoveOrphanBaseCodings = varList.length > 0;

  return [
    ...varList.map((variable, sourceIndex) => copyVariableIdentifiers(
      variable,
      'VAR_LIST',
      sourceIndex
    )),
    ...variableCodings
      .map((coding, sourceIndex) => ({ coding, sourceIndex }))
      .filter(({ coding }) => {
        const isBaseCoding = coding.sourceType === 'BASE' ||
          coding.sourceType === 'BASE_NO_VALUE';
        if (
          canRemoveOrphanBaseCodings &&
          coding.sourceType === 'BASE' &&
          !representedBaseIds.has(coding.id) &&
          isEmptyVariableCoding(coding)
        ) return false;
        if (!isBaseCoding || !representedBaseIds.has(coding.id)) return true;
        if (matchedBaseIds.has(coding.id)) return true;

        matchedBaseIds.add(coding.id);
        return false;
      })
      .map(({ coding, sourceIndex }) => copyVariableIdentifiers(
        coding,
        coding.sourceType === 'BASE' || coding.sourceType === 'BASE_NO_VALUE' ?
          'BASE_CODING' :
          'DERIVED_CODING',
        sourceIndex
      ))
  ];
};

export type SchemerIdentifierAnalysis = {
  identifiers: SchemerIdentifier[];
  signature: string;
  errors: VariableValidationError[];
  duplicateIds: Set<string>;
  duplicateAliases: Set<string>;
  duplicateIdValues: string[];
  duplicateAliasValues: string[];
  invalidIdCount: number;
  invalidAliasCount: number;
  hasDuplicateId: boolean;
  hasDuplicateAlias: boolean;
  hasInvalid: boolean;
  hasProblems: boolean;
};

export const isInvalidVarListName = (
  value: string | null | undefined
): boolean => !isValidVariableIdentifier(value);

export const isInvalidVarListId = (
  value: string | null | undefined
): boolean => !isValidVariableIdentifier(value);

export const isInvalidVarListAlias = isInvalidVarListId;

const isInvalidIdentifierError = (error: VariableValidationError): boolean => (
  error.code === 'EMPTY_IDENTIFIER' || error.code === 'INVALID_CHARACTERS'
);

export const analyzeVariableIdentifiers = (
  varList: ReadonlyArray<VariableIdentifiers> = [],
  variableCodings: ReadonlyArray<VariableCodingData> = []
): SchemerIdentifierAnalysis => {
  const identifiers = getSchemerIdentifiersForValidation(
    varList,
    variableCodings
  );
  const signature = JSON.stringify(identifiers.map(variable => ({
    id: variable.id,
    alias: variable.alias,
    hasAlias: Object.prototype.hasOwnProperty.call(variable, 'alias'),
    origin: variable.origin,
    sourceIndex: variable.sourceIndex
  })));
  const errors = validateVariableList(identifiers);
  const duplicateIds = new Set(errors
    .filter(error => error.code === 'DUPLICATE_ID')
    .map(error => String(error.value).toUpperCase()));
  const duplicateAliases = new Set(errors
    .filter(error => error.code === 'DUPLICATE_ALIAS')
    .map(error => String(error.value).toUpperCase()));
  const invalidIdCount = errors.filter(error => (
    error.property === 'id' && isInvalidIdentifierError(error)
  )).length;
  const invalidAliasCount = errors.filter(error => (
    error.property === 'alias' && isInvalidIdentifierError(error)
  )).length;

  const hasDuplicateId = duplicateIds.size > 0;
  const hasDuplicateAlias = duplicateAliases.size > 0;
  const hasInvalid = errors.some(isInvalidIdentifierError);

  return {
    identifiers,
    signature,
    errors,
    duplicateIds,
    duplicateAliases,
    duplicateIdValues: Array.from(duplicateIds.values()).sort(),
    duplicateAliasValues: Array.from(duplicateAliases.values()).sort(),
    invalidIdCount,
    invalidAliasCount,
    hasDuplicateId,
    hasDuplicateAlias,
    hasInvalid,
    hasProblems: errors.length > 0
  };
};

export interface VariableCodingChange {
  coding: VariableCodingData;
  replacedCodingId?: string;
}

export const validateVariableCodingChange = (
  varList: ReadonlyArray<VariableIdentifiers>,
  variableCodings: ReadonlyArray<VariableCodingData>,
  change: VariableCodingChange
): SchemerIdentifierAnalysis => {
  const replacedIndex = change.replacedCodingId === undefined ?
    -1 :
    variableCodings.findIndex(coding => coding.id === change.replacedCodingId);
  const changedVariableCodings = replacedIndex < 0 ?
    [...variableCodings, change.coding] :
    variableCodings.map((coding, index) => (
      index === replacedIndex ? change.coding : coding
    ));

  return analyzeVariableIdentifiers(varList, changedVariableCodings);
};
