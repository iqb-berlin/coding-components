import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';

/**
 * Temporary backport of the shared Verona identifier contract tracked in
 * https://github.com/verona-interfaces/variable-info/issues/2.
 * Replace this module with package exports after an upstream release.
 */

export type VariableValidationErrorCode =
  'EMPTY_IDENTIFIER' |
  'INVALID_CHARACTERS' |
  'DUPLICATE_ID' |
  'DUPLICATE_ALIAS' |
  'PUBLIC_IDENTIFIER_COLLISION';

export interface VariableValidationError {
  code: VariableValidationErrorCode;
  variableIndex: number;
  property: 'id' | 'alias';
  value: unknown;
  conflictingVariableIndex?: number;
}

export type VariableIdentifiers = Pick<VariableInfo, 'id' | 'alias'>;

const VARIABLE_IDENTIFIER_PATTERN = /^[0-9A-Za-z_-]+$/;

export const isValidVariableIdentifier = (
  value: unknown
): value is string => (
  typeof value === 'string' && VARIABLE_IDENTIFIER_PATTERN.test(value)
);

const addIdentifierError = (
  errors: VariableValidationError[],
  value: unknown,
  variableIndex: number,
  property: VariableValidationError['property']
): void => {
  if (!isValidVariableIdentifier(value)) {
    errors.push({
      code: value === '' || value === null || value === undefined ?
        'EMPTY_IDENTIFIER' :
        'INVALID_CHARACTERS',
      variableIndex,
      property,
      value
    });
  }
};

const addDuplicateErrors = (
  variables: ReadonlyArray<VariableIdentifiers>,
  property: VariableValidationError['property'],
  code: 'DUPLICATE_ID' | 'DUPLICATE_ALIAS',
  errors: VariableValidationError[]
): void => {
  const firstIndexByIdentifier = new Map<string, number>();

  variables.forEach((variable, variableIndex) => {
    const value = variable[property];
    if (!isValidVariableIdentifier(value)) return;

    const normalizedValue = value.toLowerCase();
    const conflictingVariableIndex = firstIndexByIdentifier.get(
      normalizedValue
    );
    if (conflictingVariableIndex === undefined) {
      firstIndexByIdentifier.set(normalizedValue, variableIndex);
    } else {
      errors.push({
        code,
        variableIndex,
        property,
        value,
        conflictingVariableIndex
      });
    }
  });
};

const addPublicIdentifierCollisionErrors = (
  variables: ReadonlyArray<VariableIdentifiers>,
  errors: VariableValidationError[]
): void => {
  const firstPublicIdentifier = new Map<string, {
    variableIndex: number;
    property: VariableValidationError['property'];
  }>();

  variables.forEach((variable, variableIndex) => {
    const property = variable.alias === undefined ? 'id' : 'alias';
    const value = variable[property];
    if (!isValidVariableIdentifier(value)) return;

    const normalizedValue = value.toLowerCase();
    const conflicting = firstPublicIdentifier.get(normalizedValue);
    if (!conflicting) {
      firstPublicIdentifier.set(normalizedValue, { variableIndex, property });
    } else if (conflicting.property !== property) {
      errors.push({
        code: 'PUBLIC_IDENTIFIER_COLLISION',
        variableIndex,
        property,
        value,
        conflictingVariableIndex: conflicting.variableIndex
      });
    }
  });
};

export const validateVariableList = (
  variables: ReadonlyArray<VariableIdentifiers>
): VariableValidationError[] => {
  const errors: VariableValidationError[] = [];

  variables.forEach((variable, variableIndex) => {
    addIdentifierError(errors, variable.id, variableIndex, 'id');
    if (variable.alias !== undefined) {
      addIdentifierError(errors, variable.alias, variableIndex, 'alias');
    }
  });
  addDuplicateErrors(variables, 'id', 'DUPLICATE_ID', errors);
  addDuplicateErrors(variables, 'alias', 'DUPLICATE_ALIAS', errors);
  addPublicIdentifierCollisionErrors(variables, errors);

  return errors;
};
