import { CodingSchemeFactory, CodingSchemeProblem } from '@iqb/responses';
import { VariableCodingData } from '@iqbspecs/coding-scheme/coding-scheme.interface';
import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';

export const CYCLIC_DERIVATION_PROBLEM_TYPE = 'CYCLIC_DERIVATION';

export type CodingSchemeValidationProblemType =
  CodingSchemeProblem['type'] | typeof CYCLIC_DERIVATION_PROBLEM_TYPE;

export interface CodingSchemeValidationProblem extends
  Omit<CodingSchemeProblem, 'type'> {
  type: CodingSchemeValidationProblemType;
}

const isDerivedVariable = (coding: VariableCodingData): boolean => (
  coding.sourceType !== 'BASE' && coding.sourceType !== 'BASE_NO_VALUE'
);

const getProblemVariableId = (coding: VariableCodingData): string => (
  coding.alias || coding.id
);

const createCodingResolver = (
  variableCodings: VariableCodingData[]
): ((reference: string) => VariableCodingData | undefined) => {
  const codingsById = new Map<string, VariableCodingData>();
  const codingsByAlias = new Map<string, VariableCodingData[]>();

  variableCodings.forEach(coding => {
    codingsById.set(coding.id, coding);
    if (coding.alias) {
      codingsByAlias.set(coding.alias, [
        ...(codingsByAlias.get(coding.alias) || []),
        coding
      ]);
    }
  });

  return (reference: string): VariableCodingData | undefined => {
    const codingById = codingsById.get(reference);
    if (codingById) return codingById;

    const codingsForAlias = codingsByAlias.get(reference) || [];
    return codingsForAlias.length === 1 ? codingsForAlias[0] : undefined;
  };
};

export const getCyclicDerivationProblems = (
  variableCodings: VariableCodingData[]
): CodingSchemeValidationProblem[] => {
  const resolveCoding = createCodingResolver(variableCodings);
  const visitState = new Map<string, 'visiting' | 'visited'>();
  const path: string[] = [];
  const cyclicCodingIds = new Set<string>();

  const markCycle = (cycleStartCodingId: string): void => {
    const cycleStartIndex = path.indexOf(cycleStartCodingId);
    if (cycleStartIndex < 0) return;

    path.slice(cycleStartIndex).forEach(codingId => {
      cyclicCodingIds.add(codingId);
    });
  };

  const visitCoding = (coding: VariableCodingData): void => {
    const currentState = visitState.get(coding.id);
    if (currentState === 'visiting') {
      markCycle(coding.id);
      return;
    }

    if (currentState === 'visited') return;

    visitState.set(coding.id, 'visiting');
    path.push(coding.id);

    (coding.deriveSources || []).forEach(sourceReference => {
      const sourceCoding = resolveCoding(sourceReference);
      if (sourceCoding && isDerivedVariable(sourceCoding)) {
        visitCoding(sourceCoding);
      }
    });

    path.pop();
    visitState.set(coding.id, 'visited');
  };

  variableCodings
    .filter(isDerivedVariable)
    .forEach(visitCoding);

  return variableCodings
    .filter(coding => cyclicCodingIds.has(coding.id))
    .map(coding => ({
      type: CYCLIC_DERIVATION_PROBLEM_TYPE,
      breaking: true,
      variableId: getProblemVariableId(coding),
      variableLabel: coding.label || ''
    }));
};

export const validateCodingScheme = (
  baseVariables: VariableInfo[],
  variableCodings: VariableCodingData[]
): CodingSchemeValidationProblem[] => [
  ...CodingSchemeFactory.validate(baseVariables, variableCodings),
  ...getCyclicDerivationProblems(variableCodings)
];
