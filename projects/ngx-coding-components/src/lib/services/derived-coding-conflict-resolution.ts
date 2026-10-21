import { VariableCodingData } from '@iqbspecs/coding-scheme/coding-scheme.interface';
import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';
import { getCodingDependents, getRemovableOrphanBaseCodings } from './base-coding-cleanup';
import { analyzeVariableIdentifiers } from './schemer-identifier-validation';
import { isValidVariableIdentifier } from './variable-identifier-validation';

export type DerivedCodingConflictChange =
  { id: string; action: 'RENAME'; alias: string } |
  { id: string; action: 'DELETE' };

export interface DerivedCodingConflictResolution {
  variableCodings: VariableCodingData[] | null;
  problems: string[];
}

/** Only offer the derived side of a reported conflict, identified by a unique technical ID. */
export const getConflictingDerivedCodings = (
  variables: VariableInfo[],
  codings: VariableCodingData[]
): VariableCodingData[] => {
  const analysis = analyzeVariableIdentifiers(variables, codings);
  const involved = new Set(analysis.errors.flatMap(error => [error.variableIndex, error.conflictingVariableIndex]));
  return analysis.identifiers
    .filter((identifier, index) => involved.has(index) && identifier.origin === 'DERIVED_CODING')
    .map(identifier => codings[identifier.sourceIndex])
    .filter(coding => isValidVariableIdentifier(coding.id) &&
      codings.filter(candidate => typeof candidate.id === 'string' &&
        candidate.id.toLowerCase() === coding.id.toLowerCase()).length === 1 &&
      !variables.some(variable => typeof variable.id === 'string' &&
        variable.id.toLowerCase() === coding.id.toLowerCase()));
};

// SOLVER resolves aliases first, then falls back to the technical ID.
const solverSourceId = (reference: string, codings: Pick<VariableCodingData, 'id' | 'alias'>[]): string => (
  codings.find(coding => coding.alias === reference)?.id || reference
);

/** Revalidate targeted edits on a copy, preserving host variables and all other existing coding work. */
export const resolveDerivedCodingConflicts = (
  variables: VariableInfo[],
  codings: VariableCodingData[],
  changes: DerivedCodingConflictChange[],
  confirmDeletion = false
): DerivedCodingConflictResolution => {
  const fail = (problem: string): DerivedCodingConflictResolution => ({ variableCodings: null, problems: [problem] });
  const targets = getConflictingDerivedCodings(variables, codings);
  if (!changes.length || new Set(changes.map(change => change?.id)).size !== changes.length ||
    changes.some(change => !change || !targets.some(coding => coding.id === change.id) ||
      (change.action !== 'RENAME' && change.action !== 'DELETE'))) {
    return fail('Bitte wähle eine eindeutig zugeordnete abgeleitete Konfliktvariable aus.');
  }
  const renamed = changes.filter(change => change.action === 'RENAME');
  if (renamed.some(change => !isValidVariableIdentifier(change.alias))) {
    return fail('Der neue Alias darf nur ASCII-Buchstaben, Ziffern, _ und - enthalten und nicht leer sein.');
  }
  const deleted = new Set(changes.filter(change => change.action === 'DELETE').map(change => change.id));
  if (deleted.size && confirmDeletion !== true) {
    return fail('Bitte bestätige das Löschen der vorgemerkten Ableitungen einschließlich ihrer Kodierung.');
  }
  const dependentNames = targets.filter(coding => deleted.has(coding.id))
    .flatMap(coding => getCodingDependents(coding, codings))
    .filter(coding => !deleted.has(coding.id))
    .map(coding => coding.alias || coding.id);
  if (dependentNames.length) {
    return fail(`Löschen ist nicht möglich: Weitere Kodierungen verwenden diese Ableitung: ${
      [...new Set(dependentNames)].join(', ')}. Bitte benenne sie um oder korrigiere zuerst die Abhängigkeiten.`);
  }

  // Decide existing automatic-empty cleanup against the original dependency graph.
  // A renamed formula must not make an abandoned default with the new alias shadow its real source.
  const removable = getRemovableOrphanBaseCodings(variables, codings);
  const result = structuredClone(codings.filter(coding => !deleted.has(coding.id) && !removable.has(coding)));
  renamed.forEach(change => {
    result.find(coding => coding.id === change.id)!.alias = change.alias;
  });
  const analysis = analyzeVariableIdentifiers(variables, result);
  const renamedIndices = new Set(analysis.identifiers.flatMap((identifier, index) => (
    identifier.origin === 'DERIVED_CODING' && renamed.some(change => change.id === identifier.id) ? [index] : []
  )));
  if (analysis.errors.some(error => renamedIndices.has(error.variableIndex) ||
    (error.conflictingVariableIndex !== undefined && renamedIndices.has(error.conflictingVariableIndex)))) {
    return fail('Der neue Alias ist bereits vergeben oder kollidiert mit einem anderen Variablenbezeichner.');
  }

  // Include the host names that normal editor initialization will add/update after recovery.
  const namespace = result.map(coding => {
    const host = (coding.sourceType === 'BASE' || coding.sourceType === 'BASE_NO_VALUE') &&
      variables.find(variable => variable.id === coding.id);
    return host ? { id: coding.id, alias: host.alias || host.id } : coding;
  });
  variables.filter(variable => !namespace.some(coding => coding.id === variable.id))
    .forEach(variable => namespace.push({ id: variable.id, alias: variable.alias || variable.id }));
  let referencesPreserved = true;
  result.forEach(coding => {
    if (coding.sourceType !== 'SOLVER' || !coding.sourceParameters?.solverExpression) return;
    coding.sourceParameters.solverExpression = coding.sourceParameters.solverExpression
      .replace(/\$\{(\s*)([0-9A-Za-z_,-]+)([^{}]*)\}/g, (token, leading: string, reference: string, suffix: string) => {
        const sourceId = solverSourceId(reference, codings);
        if (solverSourceId(reference, namespace) === sourceId) return token;
        const source = namespace.find(candidate => candidate.id === sourceId);
        const replacement = source && [source.alias, source.id].find(candidate => (
          candidate && solverSourceId(candidate, namespace) === sourceId
        ));
        if (!replacement) {
          referencesPreserved = false;
          return token;
        }
        return `\u0024{${leading}${replacement}${suffix}}`;
      });
  });
  if (!referencesPreserved) {
    return fail('Formelverweise können mit diesem Alias nicht eindeutig erhalten werden. ' +
      'Bitte wähle einen anderen Alias.');
  }
  return { variableCodings: result, problems: [] };
};
