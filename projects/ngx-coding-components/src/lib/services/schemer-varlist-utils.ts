import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';

export const parseVarListInput = (value: unknown): VariableInfo[] => {
  if (!value) return [];

  if (typeof value === 'string') {
    if (!value) return [];
    try {
      return JSON.parse(value) as VariableInfo[];
    } catch {
      return [];
    }
  }

  return value as VariableInfo[];
};
