// Entirely invented data. Source archives only informed the structural categories;
// no task identifiers, text, rules, pictures or formulas were copied from them.
export const image = 'iVBORw0KGgoAAAANSUhEUgAAACgAAAAUCAIAAABwJOjsAAAAJElEQVR4nGOQSDgwIIhh1OJRi0ctHrV41OJRi0ctHrV45FgMAHBlzy43YLJ+AAAAAElFTkSuQmCC';
export const booleanOptions = ['hasOnlyManualCoding', 'hasClosedVars', 'hasOnlyVarsWithCodes', 'hasDerivedVars',
  'hasGeneralInstructions', 'codeLabelToUpper', 'showScore', 'hideItemVarRelation'];
export const defaults = { exportFormat: 'docx', missingsProfile: '', hasOnlyManualCoding: true,
  hasClosedVars: true, hasOnlyVarsWithCodes: true, hasDerivedVars: true, hasGeneralInstructions: true,
  codeLabelToUpper: true, showScore: true, hideItemVarRelation: true, trainingRequirement: 'all' };
export function* optionMatrix() {
  for (let bits = 0; bits < 256; bits += 1) {
    for (const trainingRequirement of ['all', 'required', 'not-required']) {
      yield { ...defaults, ...Object.fromEntries(booleanOptions.map((key, i) => [key, !!(bits & (1 << i))])), trainingRequirement };
    }
  }
}
export const missingCases = [[], [{ code: 0, label: 'Missing zero', description: 'Keine Eingabe' },
  { code: 99, label: 'Missing other', description: 'Nicht bearbeitet' }],
[{ code: '0', label: 'Missing string zero', description: 'Keine Eingabe' }]];
export const ruleCases = [
  ['MATCH', ['alpha']], ['MATCH_REGEX', ['^beta$']], ['NUMERIC_MATCH', ['7']],
  ['NUMERIC_RANGE', ['2', '9']], ['NUMERIC_FULL_RANGE', ['3', '8']],
  ['NUMERIC_LESS_THAN', ['5']], ['NUMERIC_MORE_THAN', ['6']], ['NUMERIC_MAX', ['10']],
  ['NUMERIC_MIN', ['4']], ['IS_EMPTY', []], ['IS_NULL', []], ['IS_TRUE', []], ['IS_FALSE', []]
];
const code = (id, manualInstruction = '', type = 'FULL_CREDIT', extra = {}) => ({ id, type,
  label: `Label ${id}`, score: id === 0 ? 0 : 2, manualInstruction, ruleSets: [], ruleSetOperatorAnd: true, ...extra });

// Expected membership is explicit: [no filter, manual only, closed only, both].
// These declarations are the specification, not a call into the production filter.
const groups = [
  { name: 'MANUAL', codes: [code(2, '<p>Bewerten</p>'), code(0)], selected: [[2, 0], [2], null, [2, 0]] },
  { name: 'MIXED', codes: [code(2, '<p>Gemischt</p>'), code(0, '', 'RESIDUAL_AUTO')], selected: [[2, 0], [2], [2, 0], [2, 0]] },
  { name: 'CLOSED', codes: [code(0, '', 'RESIDUAL_AUTO')], selected: [[0], null, [0], [0]] },
  { name: 'INCOMPLETE', codes: [code(0, '', 'INTENDED_INCOMPLETE')], selected: [[0], null, [0], [0]] },
  { name: 'AUTO', codes: [code(0)], selected: [[0], null, null, null] },
  { name: 'EMPTY', codes: [], selected: [[], null, null, null] },
  { name: 'GENERAL_ONLY', codes: [code(0)], general: '<p>Allgemeiner Hinweis</p>', selected: [[0], null, null, null] },
  { name: 'INVISIBLE', codes: [code(0, '<p>&nbsp;&#8288;&shy;</p>')], selected: [[0], null, null, null] },
  { name: 'IMAGE', codes: [code(0, `<img src="data:image/png;base64,${image}">`)], selected: [[0], [0], null, [0]] },
  { name: 'FORMULA', codes: [code(0, '<p>[[iqb-math:x^2]]</p>')], selected: [[0], [0], null, [0]] },
  { name: 'RESIDUAL', codes: [code(0, '<p>Rest bewerten</p>', 'RESIDUAL')], selected: [[0], [0], null, [0]] },
  { name: 'TO_CHECK', codes: [code(0, '<ul><li><p>Prüfen</p></li></ul>', 'TO_CHECK')], selected: [[0], [0], null, [0]] },
  { name: 'PARTIAL', codes: [code(0, '<p>Teilweise</p>', 'PARTIAL_CREDIT')], selected: [[0], [0], null, [0]] },
  { name: 'CLOSED_TEXT', codes: [code(0, '<p>Geschlossener Hinweis</p>', 'RESIDUAL_AUTO')], selected: [[0], null, [0], [0]] }
];
export function selectionCorpus() {
  const rows = [];
  for (const sourceType of ['BASE', 'MANUAL', 'COPY_VALUE', 'SUM_SCORE', 'SOLVER', 'UNIQUE_VALUES', 'CONCAT_CODE', 'SUM_CODE', 'BASE_NO_VALUE']) {
    for (const training of [false, true]) {
      for (const group of groups) {
        const id = `${sourceType}_${training ? 'TRAIN' : 'REGULAR'}_${group.name}`;
        const variable = { id, alias: `PUBLIC.${id}`, label: id, sourceType, deriveSources: ['SOURCE'],
          sourceParameters: sourceType === 'SOLVER' ? { solverExpression: 'SOURCE + 1' } : {},
          processing: training ? ['CODER_TRAINING_REQUIRED'] : [], manualInstruction: group.general || ' ', codes: group.codes };
        rows.push({ variable, selected: group.selected, training });
      }
    }
  }
  return { rows, units: [{ id: 2, key: 'Z', name: 'Leer', scheme: JSON.stringify({ version: '3.4', variableCodings: [] }), metadata: { items: [] } },
    { id: 1, key: 'A', name: 'Künstliche Kategorien', scheme: JSON.stringify({ version: '3.4', variableCodings: rows.map(r => r.variable).reverse() }),
      metadata: { items: rows.map(({ variable }) => ({ id: `ITEM_${variable.id}`, variableId: variable.alias })) } }] };
}
export function expectedSelection(rows, options) {
  const column = Number(options.hasOnlyManualCoding) + 2 * Number(options.hasClosedVars);
  return rows.filter(({ variable, training, selected }) => selected[column] !== null &&
    variable.sourceType !== 'BASE_NO_VALUE' && (options.hasDerivedVars || variable.sourceType === 'BASE') &&
    (options.trainingRequirement === 'all' || training === (options.trainingRequirement === 'required')) &&
    (!options.hasOnlyVarsWithCodes || selected[column].length))
    .map(({ variable, selected }) => ({ id: variable.alias, codes: selected[column].map(String) }))
    .sort((a, b) => a.id < b.id ? -1 : Number(a.id > b.id));
}

// Stable original-Studio behaviour. Approved corrections have separate tests.
// In particular no nested marks, loose text, whitespace at mark boundaries,
// corrected item relations, or changed manual-only filtering is hidden here.
export function referenceCorpus() {
  const variables = ruleCases.map(([method, parameters], i) => ({ id: `RULE_${String(i).padStart(2, '0')}`,
    alias: `ALIAS_${String(i).padStart(2, '0')}`, label: `Regel ${i}`, sourceType: 'BASE', manualInstruction: i ? '' : ' ',
    codes: [code(1, '<p><strong>Bewerten</strong></p>', 'FULL_CREDIT', { ruleSets: [{ rules: [{ method, parameters }], ruleOperatorAnd: true }] })] }));
  variables.push({ id: 'RICH', alias: 'Z_RICH', label: 'Formatierung', sourceType: 'BASE',
    manualInstruction: '<p>Allgemeiner Hinweis</p>', codes: [code(2,
      `<p style="text-align:right"><span style="color:#234567;font-size:18pt"><mark style="background-color:#ffff00">Farbe</mark></span></p>` +
      '<p><u>Unterstrichen</u></p><p><em>Kursiv</em></p><p><s>Durchgestrichen</s></p>' +
      '<ul><li><p>Kriterium eins</p></li><li><p>Kriterium zwei</p></li></ul>' +
      '<p>[[iqb-math:x^2]]</p><p>Formel:[[iqb-math:a%3Cb]]</p>' +
      `<img src="data:image/png;base64,${image}">`)] });
  variables.push({ id: 'DERIVED', alias: 'Z_SUM', label: 'Abgeleitet', sourceType: 'SUM_SCORE', deriveSources: ['RULE_00'],
    manualInstruction: '', codes: [code(3, '<p>Summe bewerten</p>')] });
  variables.push({ id: 'CONNECT', alias: 'Z_CONNECT', label: 'Verknüpfungen', sourceType: 'BASE', manualInstruction: '',
    codes: [true, false].map((and, i) => code(i + 4, '<p>Verknüpft</p>', 'FULL_CREDIT', { ruleSetOperatorAnd: and,
      ruleSets: [{ ruleOperatorAnd: and, valueArrayPos: 'ANY', rules: [{ method: 'MATCH', parameters: ['gamma'] }, { method: 'IS_TRUE', fragment: 0 }] },
        { ruleOperatorAnd: and, valueArrayPos: 0, rules: [{ method: 'NUMERIC_MATCH', parameters: ['11'] }] }] })) });
  return [{ id: 1, key: 'A', name: 'Synthetische Studio Referenz', scheme: JSON.stringify({ version: '3.4', variableCodings: variables }), metadata: { items: [] } },
    { id: 2, key: 'B', name: 'Zweite Aufgabe', scheme: JSON.stringify({ version: '3.0', variableCodings: [variables[0]] }), metadata: { items: [] } }];
}
export function* referenceOptions() {
  for (let bits = 0; bits < 32; bits += 1) {
    const keys = ['hasGeneralInstructions', 'codeLabelToUpper', 'showScore', 'hideItemVarRelation', 'hasDerivedVars'];
    yield { ...defaults, hasOnlyManualCoding: false, hasClosedVars: false, hasOnlyVarsWithCodes: false,
      ...Object.fromEntries(keys.map((key, i) => [key, !!(bits & (1 << i))])) };
  }
}
