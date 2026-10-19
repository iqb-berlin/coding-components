import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';
import { normalizeVariableInfoFormat } from '@iqb/responses';

export type GeoGebraCodingMode = 'numeric' | 'angle' | 'point' | 'boolean' | 'text';

export const isGeoGebraVariableInfo = (
  varInfo: VariableInfo | null | undefined
): boolean => !!varInfo && normalizeVariableInfoFormat(varInfo.format) === 'GGB_VARIABLE';

const geoGebraNumberPattern = '([-+]?\\d+(?:[.,]\\d+)?)';
// GeoGebra uses a decimal point and commas between Cartesian coordinates.
// Allowing decimal commas here would make compact 3D points look like 2D points.
const geoGebraPointCoordinatePattern = '([-+]?\\d+(?:\\.\\d+)?)';

export const createGeoGebraValueFragmenting = (
  mode: GeoGebraCodingMode = 'text'
): string => {
  const variablePattern = '[^=]+';
  const valuePatternByMode: Record<GeoGebraCodingMode, string> = {
    numeric: geoGebraNumberPattern,
    angle: `${geoGebraNumberPattern}\\s*°?`,
    point: `\\(\\s*${geoGebraPointCoordinatePattern}\\s*,\\s*${geoGebraPointCoordinatePattern}\\s*\\)`,
    boolean: '(true|false)',
    text: '(.*?)'
  };
  return `^\\s*${variablePattern}\\s*=\\s*${valuePatternByMode[mode]}\\s*$`;
};
