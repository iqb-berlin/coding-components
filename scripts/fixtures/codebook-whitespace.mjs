import { defaults } from './codebook-synthetic.mjs';

// Invented typography examples. Internal spacing is unchanged by old Studio;
// the separately tested corrections at formatting boundaries still apply.
const variants = [
  ['nbsp-named', '<p>10&nbsp;kg</p>', '10\u00a0kg'],
  ['nbsp-decimal', '<p>10&#160;kg</p>', '10\u00a0kg'],
  ['nbsp-hex', '<p>10&#xA0;kg</p>', '10\u00a0kg'],
  ['nbsp-literal', '<p>10\u00a0kg</p>', '10\u00a0kg'],
  ['narrow-nbsp-decimal', '<p>20&#8239;cm</p>', '20\u202fcm'],
  ['narrow-nbsp-hex', '<p>20&#x202F;cm</p>', '20\u202fcm'],
  ['narrow-nbsp-literal', '<p>20\u202fcm</p>', '20\u202fcm'],
  ['repeated-nbsp', '<p>10&nbsp;&nbsp;kg</p>', '10\u00a0\u00a0kg'],
  ['formatted-nbsp', '<p><strong>10&nbsp;kg</strong></p>', '10\u00a0kg'],
  ['repeated-spaces', '<p>Abstand  bleibt</p>', 'Abstand  bleibt']
];

export function whitespaceReferenceUnits(html) {
  return [{ id: 1, key: 'SPACE', name: 'Synthetische Abstände', metadata: { items: [] },
    scheme: JSON.stringify({ version: '3.4', variableCodings: [{ id: 'V', label: 'Abstände',
      sourceType: 'BASE', manualInstruction: html,
      codes: [{ id: 1, type: 'FULL_CREDIT', label: 'Code', score: 1,
        ruleSets: [], ruleSetOperatorAnd: true, manualInstruction: html }] }] }) }];
}

export function* whitespaceReferenceCases() {
  for (const [id, html, text] of variants) {
    for (const showScore of [false, true]) {
      yield { id, html, text, options: { ...defaults, hasOnlyManualCoding: false,
        hasClosedVars: false, hasOnlyVarsWithCodes: false, codeLabelToUpper: false, showScore } };
    }
  }
}
