import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';

export const isGeoGebraVariableInfo = (
  varInfo: VariableInfo | null | undefined
): boolean => varInfo?.format === 'ggb-variable';

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const createGeoGebraValueFragmenting = (varInfo: VariableInfo): string => {
  const variablePattern = varInfo.id ? escapeRegExp(varInfo.id) : '[^=]+';
  return `^\\s*${variablePattern}\\s*=\\s*(.*?)\\s*$`;
};
