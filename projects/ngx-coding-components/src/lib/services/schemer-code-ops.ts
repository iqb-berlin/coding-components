import {
  CodeData,
  CodeType,
  RuleSet
} from '@iqbspecs/coding-scheme/coding-scheme.interface';

export type UserRoleType = 'RO' | 'RW_MINIMAL' | 'RW_MAXIMAL';

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const residualTypes: CodeType[] = [
  'RESIDUAL',
  'RESIDUAL_AUTO',
  'INTENDED_INCOMPLETE'
];

export const canEdit = (userRole: UserRoleType): boolean => ['RW_MINIMAL', 'RW_MAXIMAL'].includes(userRole);

export const copySingleCode = (code: CodeData | null | undefined): CodeData | null => {
  if (!code) return null;
  return deepClone(code);
};

export const canPasteSingleCodeInto = (
  copiedCode: CodeData | null,
  codeList: CodeData[],
  userRole: UserRoleType
): boolean => {
  if (!copiedCode) return false;
  if (!canEdit(userRole)) return false;

  const typeToPaste = copiedCode.type as CodeType | undefined;
  if (typeToPaste && residualTypes.includes(typeToPaste)) {
    const firstResidualOrIntendedIncomplete = codeList.find(
      c => c.type && residualTypes.includes(c.type as CodeType)
    );
    if (firstResidualOrIntendedIncomplete) return false;
  }

  return true;
};

export const addCode = (
  codeList: CodeData[],
  codeType: CodeType,
  userRole: UserRoleType,
  orderOfCodeTypes: CodeType[]
): CodeData | string => {
  if (!canEdit(userRole)) return 'code.error-message.no-access';

  const maxCode =
    codeList.length > 0 ?
      Math.max(
        ...codeList
          .filter(c => typeof c.id === 'number')
          .map(c => Number(c.id) || 0)
      ) :
      0;

  const hasNullCode = codeList.length > 0 ? !!codeList.find(c => c.id === 0) : false;

  if (['RESIDUAL', 'RESIDUAL_AUTO'].includes(codeType)) {
    const firstResidualOrIntendedIncomplete = codeList.find(
      c => c.type && residualTypes.includes(c.type as CodeType)
    );
    if (firstResidualOrIntendedIncomplete) return 'code.error-message.residual-exists';

    const newCode: CodeData = {
      id: hasNullCode ? maxCode + 1 : 0,
      type: codeType,
      label: '',
      score: 0,
      ruleSetOperatorAnd: true,
      ruleSets: [],
      manualInstruction:
        codeType === 'RESIDUAL_AUTO' ?
          '' :
          '<p style="padding-left: 0; text-indent: 0; margin-bottom: 0; margin-top: 0">Alle anderen Antworten</p>'
    };

    codeList.push(newCode);
    return newCode;
  }

  if (codeType === 'INTENDED_INCOMPLETE') {
    const firstResidualOrIntendedIncomplete = codeList.find(
      c => c.type && residualTypes.includes(c.type as CodeType)
    );
    if (firstResidualOrIntendedIncomplete) return 'code.error-message.residual-exists';

    const newCode: CodeData = {
      id: 0,
      type: codeType,
      label: '',
      score: 0,
      ruleSetOperatorAnd: true,
      ruleSets: [],
      manualInstruction: ''
    };

    codeList.push(newCode);
    return newCode;
  }

  if (
    [
      'FULL_CREDIT',
      'PARTIAL_CREDIT',
      'NO_CREDIT',
      'UNSET',
      'TO_CHECK'
    ].includes(codeType)
  ) {
    let newCodeId = -1;
    codeList
      .filter(c => typeof c.id === 'number')
      .forEach(c => {
        if (c.type === codeType && c.id && Number(c.id) > newCodeId) newCodeId = Number(c.id);
      });

    if (newCodeId < 0) {
      newCodeId = orderOfCodeTypes.indexOf(codeType) + 1;
      const alreadyUsed = codeList.find(c => c.id === newCodeId);
      if (alreadyUsed) newCodeId = maxCode + 1;
    } else {
      const newCodeFound = codeList.find(c => c.id === newCodeId + 1);
      newCodeId = newCodeFound ? maxCode + 1 : newCodeId + 1;
    }

    const newCode: CodeData = {
      id: newCodeId,
      type: codeType,
      label: '',
      score: codeType === 'FULL_CREDIT' ? 1 : 0,
      ruleSetOperatorAnd: true,
      ruleSets: [
        <RuleSet>{
          ruleOperatorAnd: false,
          rules: [
            {
              method: 'MATCH',
              parameters: ['']
            }
          ]
        }
      ],
      manualInstruction: ''
    };

    const firstFollowerCode =
      codeList.length > 0 ?
        codeList.findIndex(
          c => orderOfCodeTypes.indexOf(c.type as CodeType) > orderOfCodeTypes.indexOf(codeType)
        ) :
        -1;

    if (firstFollowerCode < 0) {
      codeList.push(newCode);
    } else {
      codeList.splice(firstFollowerCode, 0, newCode);
    }

    return newCode;
  }

  return 'code.error-message.type-not-supported';
};

export const pasteSingleCode = (
  copiedCode: CodeData | null,
  codeList: CodeData[],
  userRole: UserRoleType,
  orderOfCodeTypes: CodeType[]
): CodeData | string => {
  if (!copiedCode) return 'code.error-message.nothing-to-paste';
  if (!canEdit(userRole)) return 'code.error-message.no-access';
  if (!codeList) return 'code.error-message.fatal-error';

  const typeToPaste = copiedCode.type as CodeType | undefined;

  if (typeToPaste && residualTypes.includes(typeToPaste)) {
    const firstResidualOrIntendedIncomplete = codeList.find(
      c => c.type && residualTypes.includes(c.type as CodeType)
    );
    if (firstResidualOrIntendedIncomplete) return 'code.error-message.residual-exists';
  }

  const addResult = typeToPaste ?
    addCode(codeList, typeToPaste, userRole, orderOfCodeTypes) :
    'code.error-message.fatal-error';
  if (typeof addResult === 'string') return addResult;

  const created = addResult as CodeData;
  const payload = deepClone(copiedCode);

  const { id, type } = created;
  Object.assign(created, payload);
  created.id = id;
  created.type = type;

  return created;
};

export const deleteCode = (
  codeList: CodeData[],
  codeIndex: number,
  userRole: UserRoleType
): boolean => {
  if (!canEdit(userRole)) return false;
  if (codeIndex < codeList.length) {
    codeList.splice(codeIndex, 1);
    return true;
  }
  return false;
};

export const duplicateCode = (
  codeList: CodeData[],
  codeIndex: number,
  userRole: UserRoleType
): CodeData | string => {
  if (!canEdit(userRole)) return 'code.error-message.no-access';
  if (codeIndex < 0 || codeIndex >= codeList.length) return 'code.error-message.invalid-index';

  const sourceCode = codeList[codeIndex];
  if (residualTypes.includes(sourceCode.type as CodeType)) {
    return 'code.error-message.type-not-supported';
  }

  const maxCode =
    codeList.length > 0 ?
      Math.max(
        ...codeList
          .filter(c => typeof c.id === 'number')
          .map(c => Number(c.id) || 0)
      ) :
      0;

  const duplicated: CodeData = deepClone(sourceCode);
  duplicated.id = maxCode + 1;

  codeList.splice(codeIndex + 1, 0, duplicated);
  return duplicated;
};

export const sortCodes = (
  codeList: CodeData[],
  orderOfCodeTypes: CodeType[],
  normaliseCodeIds = false
): void => {
  if (codeList.length <= 1) return;

  if (normaliseCodeIds) {
    orderOfCodeTypes.forEach((type, typeIndex) => {
      const allCodesOfType = codeList.filter(code => code.type === type);

      if (allCodesOfType.length > 1) {
        const startValueBase = (typeIndex + 1) * (allCodesOfType.length > 9 ? 100 : 10);
        const startValue = startValueBase + 1;

        allCodesOfType.forEach((code: CodeData, index: number) => {
          if (code.id !== null) {
            code.id = startValue + index;
          }
        });
      }
    });

    orderOfCodeTypes.forEach(t => {
      if (!residualTypes.includes(t)) {
        const allCodesOfType = codeList.filter(c => c.type === t);
        if (allCodesOfType.length === 1) allCodesOfType[0].id = orderOfCodeTypes.indexOf(t) + 1;
      } else {
        const allResidualCodes = codeList.filter(c => ['RESIDUAL', 'RESIDUAL_AUTO'].includes(c.type as CodeType));
        if (allResidualCodes.length === 1) allResidualCodes[0].id = 0;
      }
    });
  }

  codeList.sort((a: CodeData, b: CodeData) => {
    const getTypeOrder = (type: CodeType): number => orderOfCodeTypes.indexOf(type);

    if (a.type === b.type) {
      if (a.id === b.id) return 0;
      if (a.id === null) return -1;
      if (b.id === null) return 1;
      return (a.id as number) < (b.id as number) ? -1 : 1;
    }

    return getTypeOrder(a.type as CodeType) - getTypeOrder(b.type as CodeType);
  });
};
