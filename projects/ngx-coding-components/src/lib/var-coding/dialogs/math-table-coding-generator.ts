import {
  CodeType,
  CodingRule
} from '@iqbspecs/coding-scheme/coding-scheme.interface';
import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';

export type MathTableGenerationMode = 'result-auto' | 'manual';

export const MATH_TABLE_GENERAL_MANUAL_INSTRUCTION =
  '<p>Bitte Ergebniszeile, Rechenweg, Hilfszeilen und ggf. Durchstreichungen pr&uuml;fen.</p>';

export const MATH_TABLE_MANUAL_CODE_INSTRUCTIONS: Partial<Record<CodeType, string>> = {
  FULL_CREDIT: '<p>Ergebnis und Rechenweg sind richtig.</p>',
  PARTIAL_CREDIT: '<p>Antwort teilweise richtig, z. B. nachvollziehbarer Rechenweg mit Fehlern.</p>',
  NO_CREDIT: '<p>Antwort falsch oder nicht nachvollziehbar.</p>',
  TO_CHECK: '<p>Antwort muss manuell gepr&uuml;ft werden.</p>'
};

export const isMathTableVariableInfo = (varInfo: VariableInfo | null | undefined): boolean => (
  varInfo?.type === 'json' && varInfo.format === 'math-table'
);

export const normaliseMathTableExpectedResult = (value: string): string => (
  (value || '')
    .replace(/\s+/g, '')
    .replace(/-/g, '\u2212')
    .replace(/\*/g, '\u2022')
    .replace(/\//g, ':')
);

const escapeRegExp = (value: string): string => (
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
);

const escapeJsonStringValueForRegExp = (value: string): string => (
  escapeRegExp(JSON.stringify(value).slice(1, -1))
);

const createCellWithValuePattern = (valuePattern: string): string => (
  `\\{[^{}]*"value"\\s*:\\s*"${valuePattern}"[^{}]*\\}`
);

export const createMathTableResultRulePattern = (expectedResult: string): string => {
  const normalisedResult = normaliseMathTableExpectedResult(expectedResult);

  if (!normalisedResult) {
    return '(?!)';
  }

  const emptyCellPattern = createCellWithValuePattern('(?:|\\s)');
  const expectedCellPatterns = normalisedResult
    .split('')
    .map(char => createCellWithValuePattern(escapeJsonStringValueForRegExp(char)))
    .join('\\s*,\\s*');

  return [
    '"rowType"\\s*:\\s*"result"',
    '\\s*,\\s*"cells"\\s*:\\s*\\[',
    `\\s*(?:${emptyCellPattern}\\s*,\\s*)*`,
    expectedCellPatterns,
    `(?:\\s*,\\s*${emptyCellPattern})*\\s*\\]`
  ].join('');
};

export const createMathTableResultRule = (expectedResult: string): CodingRule => ({
  method: 'MATCH_REGEX',
  parameters: [createMathTableResultRulePattern(expectedResult)]
});
