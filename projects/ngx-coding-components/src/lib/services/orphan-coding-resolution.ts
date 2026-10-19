import { CodingFactory } from '@iqb/responses/coding-factory';
import { VariableCodingData } from '@iqbspecs/coding-scheme/coding-scheme.interface';
import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';
import {
  analyzeVariableIdentifiers,
  isEmptyVariableCoding
} from './schemer-identifier-validation';
import { validateVariableList } from './variable-identifier-validation';

export type OrphanCodingDecision = 'TRANSFER' | 'START_EMPTY';

export interface OrphanCodingConflict {
  previous: VariableCodingData;
  current: VariableInfo;
  dependents: VariableCodingData[];
}

export interface OrphanCodingResolutionPlan {
  conflicts: OrphanCodingConflict[];
  problems: string[];
}

const publicName = (variable: { id: string; alias?: string }): string => (
  (typeof variable.alias === 'string' && variable.alias) ||
  (typeof variable.id === 'string' ? variable.id : '')
);

const samePublicName = (
  first: { id: string; alias?: string },
  second: { id: string; alias?: string }
): boolean => publicName(first).toLowerCase() === publicName(second).toLowerCase();

// Fresh base codings use RULES_ONLY; the orphan cleanup deliberately also
// preserves empty codings with a non-default, user-selected coding model.
const isFreshTarget = (coding: VariableCodingData): boolean => (
  coding.sourceType === 'BASE' &&
  coding.codeModel !== 'MANUAL_ONLY' &&
  isEmptyVariableCoding({ ...coding, codeModel: 'MANUAL_AND_RULES' }) &&
  !coding.deriveSources?.length &&
  !coding.sourceParameters?.solverExpression &&
  !coding.sourceParameters?.processing?.length
);

const createTarget = (variable: VariableInfo): VariableCodingData => ({
  ...(variable.type === 'no-value' ?
    CodingFactory.createBaseCodingVariable(variable.id, 'BASE_NO_VALUE') :
    CodingFactory.createCodingVariable(variable.id)),
  alias: publicName(variable),
  ...(variable.page === undefined ? {} : { page: variable.page })
});

/** Only offer recovery when every identifier conflict has an unambiguous repair. */
export const getOrphanCodingResolutionPlan = (
  variables: VariableInfo[],
  codings: VariableCodingData[]
): OrphanCodingResolutionPlan => {
  const plan: OrphanCodingResolutionPlan = { conflicts: [], problems: [] };
  if (!variables.length || validateVariableList(variables).length) return plan;

  const activeIds = new Set(variables.map(variable => variable.id));
  const orphans = codings.filter(coding => (
    coding.sourceType === 'BASE' && !activeIds.has(coding.id) && !isEmptyVariableCoding(coding)
  ));
  variables.forEach(current => {
    const candidates = orphans.filter(orphan => samePublicName(orphan, current));
    if (!candidates.length) return;
    const name = publicName(current);
    if (candidates.length !== 1) {
      plan.problems.push(`Für „${name}“ gibt es mehrere alte Kodierungen. Eine eindeutige Auswahl ist nicht möglich.`);
      return;
    }
    const previous = candidates[0];
    const targets = codings.filter(coding => coding.id === current.id);
    if (current.type === 'no-value' || targets.length > 1 ||
      (targets.length === 1 && !isFreshTarget(targets[0]))) {
      plan.problems.push(`Die aktuelle Variable „${name}“ kann nicht automatisch ersetzt werden: ` +
        'Sie besitzt bereits eigene Einstellungen oder ist keine aktive Basisvariable.');
      return;
    }
    if (typeof previous.id !== 'string' ||
      variables.some(variable => variable.id.toLowerCase() === previous.id.toLowerCase()) ||
      codings.filter(coding => typeof coding.id === 'string' &&
        coding.id.toLowerCase() === previous.id.toLowerCase()).length !== 1) {
      plan.problems.push(`Die technische ID der alten Kodierung „${name}“ ist nicht eindeutig.`);
      return;
    }
    plan.conflicts.push({
      previous,
      current,
      dependents: codings.filter(coding => coding.deriveSources?.includes(previous.id))
    });
  });

  if (plan.conflicts.length) {
    const previousCodings = new Set(plan.conflicts.map(conflict => conflict.previous));
    const remaining = codings.filter(coding => !previousCodings.has(coding));
    if (analyzeVariableIdentifiers(variables, remaining).hasProblems) {
      plan.problems.push('Weitere ungültige Variablenbezeichner müssen zuerst an ihrer Quelle korrigiert werden.');
    }
  }
  return plan;
};

// Match the runtime's alias-first lookup, including technical IDs as fallback.
const getSolverSourceId = (reference: string, codings: VariableCodingData[]): string => (
  codings.find(coding => coding.alias === reference)?.id || reference
);

const remapSolverExpression = (
  expression: string,
  codings: VariableCodingData[],
  resolvedCodings: VariableCodingData[],
  replacements: Map<string, VariableInfo>
): string | null => {
  let canPreserveReferences = true;
  const resolvedExpression = expression.replace(/\$\{([^{}]+)\}/g, (token, content: string) => {
    // Legacy technical IDs may contain commas, which SOLVER also accepts.
    const match = content.match(/^(\s*)([0-9A-Za-z_,-]+)([\s\S]*)$/);
    if (!match) return token;
    const [, leadingSpace, reference, suffix] = match;
    const sourceId = getSolverSourceId(reference, codings);
    const targetId = replacements.get(sourceId)?.id || sourceId;
    if (getSolverSourceId(reference, resolvedCodings) === targetId) return token;

    const target = resolvedCodings.find(coding => coding.id === targetId);
    // START_EMPTY deliberately leaves references to the removed source for manual repair.
    if (!target) return token;
    // A new alias can also shadow an unchanged technical ID in another token.
    const targetReference = [publicName(target), target.id].find(candidate => (
      getSolverSourceId(candidate, resolvedCodings) === targetId
    ));
    if (!targetReference) {
      canPreserveReferences = false;
      return token;
    }
    return `\u0024{${leadingSpace}${targetReference}${suffix}}`;
  });
  return canPreserveReferences ? resolvedExpression : null;
};

/** Build a new array; callers must recheck their snapshot before committing it. */
export const resolveOrphanCodings = (
  variables: VariableInfo[],
  codings: VariableCodingData[],
  decisions: OrphanCodingDecision[]
): VariableCodingData[] | null => {
  const plan = getOrphanCodingResolutionPlan(variables, codings);
  if (plan.problems.length || !plan.conflicts.length || decisions.length !== plan.conflicts.length ||
    decisions.some(decision => decision !== 'TRANSFER' && decision !== 'START_EMPTY')) return null;

  const result = structuredClone(codings);
  const removedIds = new Set(plan.conflicts.map(conflict => conflict.previous.id));
  const replacements = new Map<string, VariableInfo>();
  plan.conflicts.forEach((conflict, index) => {
    const targetIndex = result.findIndex(coding => coding.id === conflict.current.id);
    const existingTarget = targetIndex < 0 ? createTarget(conflict.current) : result[targetIndex];
    const target = decisions[index] === 'TRANSFER' ? {
      ...structuredClone(conflict.previous),
      id: conflict.current.id,
      alias: publicName(conflict.current),
      page: conflict.current.page ?? existingTarget.page
    } : {
      ...createTarget(conflict.current),
      page: conflict.current.page ?? existingTarget.page
    };
    if (targetIndex < 0) result.push(target);
    else result[targetIndex] = target;
    if (decisions[index] === 'TRANSFER') replacements.set(conflict.previous.id, conflict.current);
  });
  const resolved = result.filter(coding => !removedIds.has(coding.id));
  // Build the complete host namespace before preserving SOLVER references.
  // Later editor initialization must not introduce another alias that shadows a source ID.
  variables.forEach(variable => {
    const coding = resolved.find(candidate => candidate.id === variable.id);
    if (coding) coding.alias = publicName(variable);
    else resolved.push(createTarget(variable));
  });
  let canPreserveReferences = true;
  resolved.forEach(coding => {
    // START_EMPTY intentionally leaves the old ID in place. Validation exposes
    // the missing source, and the derived coding stays editable for repair.
    if (coding.deriveSources?.some(source => replacements.has(source))) {
      const originalSourceCounts = new Map<string, number>();
      const resolvedSourceCounts = new Map<string, number>();
      coding.deriveSources = coding.deriveSources.flatMap(source => {
        const targetId = replacements.get(source)?.id || source;
        const sourceCount = (originalSourceCounts.get(source) || 0) + 1;
        originalSourceCounts.set(source, sourceCount);
        // Coalesce only occurrences introduced by different IDs converging.
        // Existing repetitions keep their multiplicity and relative order.
        if (sourceCount <= (resolvedSourceCounts.get(targetId) || 0)) return [];
        resolvedSourceCounts.set(targetId, sourceCount);
        return [targetId];
      });
    }
    if (coding.sourceType === 'SOLVER' && coding.sourceParameters?.solverExpression) {
      const expression = remapSolverExpression(
        coding.sourceParameters.solverExpression,
        codings,
        resolved,
        replacements
      );
      if (expression === null) canPreserveReferences = false;
      else coding.sourceParameters.solverExpression = expression;
    }
  });
  return !canPreserveReferences || analyzeVariableIdentifiers(variables, resolved).hasProblems ? null : resolved;
};
