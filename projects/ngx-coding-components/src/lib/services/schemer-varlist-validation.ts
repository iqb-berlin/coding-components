import { VariableCodingData } from '@iqbspecs/coding-scheme/coding-scheme.interface';
import {
  isValidVariableIdentifier,
  validateVariableList,
  VariableIdentifiers,
  VariableValidationError
} from './variable-identifier-validation';

const copyVariableIdentifiers = (
  variable: VariableIdentifiers
): VariableIdentifiers => ({
  id: variable.id,
  ...(Object.prototype.hasOwnProperty.call(variable, 'alias') ?
    { alias: variable.alias } :
    {})
});

export const getVariableIdentifiersForValidation = (
  varList: VariableIdentifiers[] = [],
  variableCodings: VariableCodingData[] = []
): VariableIdentifiers[] => {
  const representedBaseIds = new Set(varList.map(variable => variable.id));
  const matchedBaseIds = new Set<string>();

  return [
    ...varList.map(copyVariableIdentifiers),
    ...variableCodings
      .filter(coding => {
        const isBaseCoding = coding.sourceType === 'BASE' ||
          coding.sourceType === 'BASE_NO_VALUE';
        if (!isBaseCoding || !representedBaseIds.has(coding.id)) return true;
        if (matchedBaseIds.has(coding.id)) return true;

        matchedBaseIds.add(coding.id);
        return false;
      })
      .map(copyVariableIdentifiers)
  ];
};

export type VarListConflictAnalysis = {
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

export const getVarListConflictAnalysis = (
  varList: VariableIdentifiers[] = []
): VarListConflictAnalysis => {
  const signature = JSON.stringify(varList.map(variable => ({
    id: variable.id,
    alias: variable.alias,
    hasAlias: Object.prototype.hasOwnProperty.call(variable, 'alias')
  })));
  const errors = validateVariableList(varList);
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
