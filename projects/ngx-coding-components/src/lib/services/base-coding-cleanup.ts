import { VariableCodingData } from '@iqbspecs/coding-scheme/coding-scheme.interface';
import { VariableIdentifiers } from './variable-identifier-validation';

const defaultCodingKeys = new Set([
  'id', 'alias', 'label', 'page', 'sourceType', 'codeModel', 'codes',
  'processing', 'fragmenting', 'manualInstruction', 'deriveSources', 'sourceParameters'
]);
const normalizedId = (id: unknown): string | null => (typeof id === 'string' ? id.toUpperCase() : null);
const isEmptyText = (value: unknown): boolean => value === undefined || value === '';
const isEmptyArray = (value: unknown): boolean => value === undefined || (Array.isArray(value) && value.length === 0);

/** Only known factory defaults and the legacy empty model are safe to discard. */
export const isEmptyVariableCoding = (coding: VariableCodingData): boolean => (
  (isEmptyText(coding.label) || coding.label === coding.id) &&
  (coding.codeModel === 'RULES_ONLY' || coding.codeModel === 'MANUAL_AND_RULES') &&
  isEmptyArray(coding.codes) && isEmptyArray(coding.processing) && isEmptyText(coding.fragmenting) &&
  isEmptyText(coding.manualInstruction) && isEmptyArray(coding.deriveSources) &&
  (coding.sourceParameters === undefined || (
    coding.sourceParameters !== null && typeof coding.sourceParameters === 'object' &&
    !Array.isArray(coding.sourceParameters) &&
    isEmptyText(coding.sourceParameters.solverExpression) && isEmptyArray(coding.sourceParameters.processing)
  )) &&
  Object.keys(coding).every(key => defaultCodingKeys.has(key)) &&
  Object.keys(coding.sourceParameters || {}).every(key => key === 'solverExpression' || key === 'processing')
);

/** Include formula-only references and ambiguous aliases conservatively, even in legacy schemes. */
export const getCodingDependents = (
  source: VariableCodingData,
  codings: ReadonlyArray<VariableCodingData>
): VariableCodingData[] => codings.filter(coding => {
  if (Array.isArray(coding.deriveSources) && coding.deriveSources.some(reference => (
    reference === source.id || reference === source.alias
  ))) return true;
  const expression = coding.sourceParameters?.solverExpression;
  if (coding.sourceType !== 'SOLVER' || typeof expression !== 'string') return false;
  return Array.from(expression.matchAll(/\$\{\s*([0-9A-Za-z_,-]+)[^{}]*\}/g)).some(([, reference]) => (
    reference === source.id || reference === source.alias
  ));
});

/** Return original objects so validation and mutation use exactly the same cleanup decision. */
export const getRemovableOrphanBaseCodings = (
  variables: ReadonlyArray<VariableIdentifiers>,
  codings: ReadonlyArray<VariableCodingData>
): Set<VariableCodingData> => {
  if (!variables.length) return new Set();
  const activeIds = new Set(variables.map(variable => normalizedId(variable.id)));
  const idCounts = new Map<string | null, number>();
  codings.forEach(coding => {
    const id = normalizedId(coding.id);
    idCounts.set(id, (idCounts.get(id) || 0) + 1);
  });
  return new Set(codings.filter(coding => (
    (coding.sourceType === 'BASE' || coding.sourceType === 'BASE_NO_VALUE') &&
    normalizedId(coding.id) !== null && !activeIds.has(normalizedId(coding.id)) &&
    idCounts.get(normalizedId(coding.id)) === 1 &&
    isEmptyVariableCoding(coding) && !getCodingDependents(coding, codings).length
  )));
};
