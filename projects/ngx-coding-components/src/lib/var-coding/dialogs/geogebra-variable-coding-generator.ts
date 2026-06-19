import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';

export type GeoGebraCodingMode = 'numeric' | 'angle' | 'point' | 'boolean' | 'text';

export const isGeoGebraVariableInfo = (
  varInfo: VariableInfo | null | undefined
): boolean => varInfo?.format === 'ggb-variable';

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const geoGebraNumberPattern = '([-+]?\\d+(?:[.,]\\d+)?)';

export const createGeoGebraValueFragmenting = (
  varInfo: VariableInfo,
  mode: GeoGebraCodingMode = 'text'
): string => {
  const variablePattern = varInfo.id ? escapeRegExp(varInfo.id) : '[^=]+';
  const valuePatternByMode: Record<GeoGebraCodingMode, string> = {
    numeric: geoGebraNumberPattern,
    angle: `${geoGebraNumberPattern}\\s*°?`,
    point: `\\(\\s*${geoGebraNumberPattern}\\s*,\\s*${geoGebraNumberPattern}\\s*\\)`,
    boolean: '(true|false)',
    text: '(.*?)'
  };
  return `^\\s*${variablePattern}\\s*=\\s*${valuePatternByMode[mode]}\\s*$`;
};
