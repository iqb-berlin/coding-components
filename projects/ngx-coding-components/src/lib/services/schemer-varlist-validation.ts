import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';
import { VARIABLE_NAME_CHECK_PATTERN } from './schemer.service';

const VARIABLE_ID_CHECK_PATTERN = /^[a-zA-Z0-9_-]{2,}$/;

export type VarListConflictAnalysis = {
  signature: string;
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

const normaliseName = (value: string | null | undefined): string => (value || '').trim();

const normaliseKey = (value: string | null | undefined): string => normaliseName(value).toUpperCase();

const getCounts = (values: string[]): Map<string, number> => {
  const counts = new Map<string, number>();
  values
    .map(normaliseName)
    .filter(v => !!v)
    .forEach(v => {
      const key = v.toUpperCase();
      counts.set(key, (counts.get(key) || 0) + 1);
    });
  return counts;
};

export const isInvalidVarListName = (
  value: string | null | undefined
): boolean => {
  const name = normaliseName(value);
  return !name || !VARIABLE_NAME_CHECK_PATTERN.test(name);
};

export const isInvalidVarListId = (
  value: string | null | undefined
): boolean => {
  const name = normaliseName(value);
  return !name || !VARIABLE_ID_CHECK_PATTERN.test(name);
};

export const isInvalidVarListAlias = isInvalidVarListId;

export const getVarListConflictAnalysis = (
  varList: VariableInfo[] = []
): VarListConflictAnalysis => {
  const signature = varList
    .map(v => `${normaliseKey(v.id)}|${normaliseKey(v.alias || v.id)}`)
    .join(';;');

  const idCounts = getCounts(varList.map(v => normaliseName(v.id)));
  const aliasCounts = getCounts(
    varList.map(v => normaliseName(v.alias || v.id))
  );

  const duplicateIds = new Set(
    Array.from(idCounts.entries())
      .filter(([, c]) => c > 1)
      .map(([k]) => k)
  );
  const duplicateAliases = new Set(
    Array.from(aliasCounts.entries())
      .filter(([, c]) => c > 1)
      .map(([k]) => k)
  );

  const invalidIdCount = varList.filter(v => isInvalidVarListId(v.id))
    .length;
  const invalidAliasCount = varList.filter(v => (
    isInvalidVarListAlias(v.alias || v.id)
  )).length;

  const hasDuplicateId = duplicateIds.size > 0;
  const hasDuplicateAlias = duplicateAliases.size > 0;
  const hasInvalid = invalidIdCount > 0 || invalidAliasCount > 0;

  return {
    signature,
    duplicateIds,
    duplicateAliases,
    duplicateIdValues: Array.from(duplicateIds.values()).sort(),
    duplicateAliasValues: Array.from(duplicateAliases.values()).sort(),
    invalidIdCount,
    invalidAliasCount,
    hasDuplicateId,
    hasDuplicateAlias,
    hasInvalid,
    hasProblems: hasDuplicateId || hasDuplicateAlias || hasInvalid
  };
};
