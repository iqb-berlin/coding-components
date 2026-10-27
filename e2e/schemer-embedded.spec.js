/* Browser interactions in a scenario must run sequentially. */
/* eslint-disable no-await-in-loop, no-restricted-syntax */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const {
  CodingFactory, CodingSchemeFactory, normalizeVariableInfoType, normalizeVariableInfoFormat
} = require('@iqb/responses');
const veronaSchema = require('./fixtures/verona/schemer-3.2.0.json');
const variableSchema = require('./fixtures/verona/variable-info-1.3.json');
const variableInfo21Schema = require('./fixtures/verona/variable-info-2.1.json');
const studioStart = require('./fixtures/verona/studio-start-command.json');

const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv, ['date-time']);
const validateVariableInfo21 = ajv.compile(variableInfo21Schema);
// The API examples use plain serialized schemes for this AsyncAPI annotation.
ajv.addFormat('byte', true);
ajv.addSchema(variableSchema, 'https://w3id.org/iqb/spec/variable-info/1.3');
ajv.addSchema(veronaSchema, 'verona-schemer-3.2.0');
const validateMessage = Object.fromEntries(Object.entries(veronaSchema.channels).map(([type, channel]) => [
  type,
  ajv.compile({
    $ref: `verona-schemer-3.2.0#/channels/${type}/${channel.publish ? 'publish' : 'subscribe'}/message/payload`
  })
]));

function expectVeronaMessage(message) {
  const validate = validateMessage[message.type];
  expect(validate(message), JSON.stringify(validate.errors)).toBe(true);
}

const runtimeErrors = new WeakMap();
test.beforeEach(({ page }) => {
  const errors = [];
  runtimeErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().includes('Failed to load resource')) {
      errors.push(message.text());
    }
  });
});

test.afterEach(async ({ page }) => {
  await page.evaluate(() => new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  expect(runtimeErrors.get(page)).toEqual([]);
  const zones = await Promise.all(page.frames().map(frame => frame.evaluate(() => typeof window.Zone)));
  expect(zones.every(value => value === 'undefined')).toBe(true);
});

const makeVariable = id => ({
  id,
  alias: id,
  type: 'string',
  format: '',
  multiple: false,
  nullable: false,
  values: [],
  valuePositionLabels: []
});

const makeStart = (variables, role = 'super') => ({
  type: 'vosStartCommand',
  sessionId: 'embedded-regression',
  variables,
  codingScheme: JSON.stringify({ version: '3.4', variableCodings: [] }),
  codingSchemeType: 'iqb@3.4',
  schemerConfig: { role, directDownloadUrl: '' }
});

const makeOrphanStart = (sessionId = 'orphan-recovery', currentId = 'current') => ({
  ...makeStart([{ ...makeVariable(currentId), alias: '01', type: 'number' }]),
  sessionId,
  codingSchemeType: 'iqb@3.5',
  codingScheme: JSON.stringify({
    version: '3.5',
    variableCodings: [{
      id: 'old-radio',
      alias: '01',
      sourceType: 'BASE',
      codeModel: 'MANUAL_AND_RULES',
      manualInstruction: '<p>Original instructions</p>',
      processing: [],
      fragmenting: '',
      codes: [{
        id: 1,
        score: 2,
        type: 'FULL_CREDIT',
        manualInstruction: '<p>Keep code instruction</p>',
        ruleSets: [{ rules: [{ method: 'NUMERIC_MATCH', parameters: ['2'] }] }]
      }]
    }, {
      id: 'derived',
      alias: 'sum',
      sourceType: 'SOLVER',
      deriveSources: ['old-radio'],
      // SOLVER placeholders are serialized literally in Verona start messages.
      // eslint-disable-next-line no-template-curly-in-string
      sourceParameters: { processing: [], solverExpression: '${01} + 1' },
      codeModel: 'RULES_ONLY',
      codes: []
    }]
  })
});

const makeDerivedConflictStart = () => {
  const rows = Array.from({ length: 5 }, (_, index) => ({
    ...CodingFactory.createCodingVariable(`old_row_${index}`),
    alias: `01${String.fromCharCode(97 + index)}`,
    codes: [{
      id: 1,
      type: 'FULL_CREDIT',
      score: index + 1,
      ruleSets: [{ rules: [{ method: 'NUMERIC_MATCH', parameters: ['1'] }] }]
    }]
  }));
  const total = {
    ...CodingFactory.createCodingVariable('derived_01'),
    alias: '01',
    sourceType: 'SUM_SCORE',
    deriveSources: rows.map(row => row.id),
    manualInstruction: '<p>Keep the CMC total instruction</p>',
    codes: [{
      id: 1,
      type: 'FULL_CREDIT',
      score: 3,
      ruleSets: [{ rules: [{ method: 'NUMERIC_MATCH', parameters: ['5'] }] }]
    }]
  };
  return {
    ...makeStart([{ ...makeVariable('new_mc'), alias: '01', type: 'integer' }]),
    codingSchemeType: 'iqb@3.5',
    codingScheme: JSON.stringify({ version: '3.5', variableCodings: [...rows, total] })
  };
};

async function loadEmbeddedSchemer(
  page,
  start = makeStart([makeVariable('response_1'), makeVariable('response_2')]),
  { variableInfo21 = false, compatibleVariableInfo = false } = {}
) {
  // The message envelope remains API 3.2; 2.1 variable payloads are an additive compatibility feature.
  expectVeronaMessage(variableInfo21 || compatibleVariableInfo ? { ...start, variables: [] } : start);
  if (variableInfo21 || compatibleVariableInfo) {
    start.variables.forEach(variable => {
      // Validate current identifiers for both supported spellings; send the original host payload unchanged.
      const validationCopy = compatibleVariableInfo ? {
        ...variable,
        type: normalizeVariableInfoType(variable.type),
        ...(variable.format ? { format: normalizeVariableInfoFormat(variable.format) } : {})
      } : variable;
      // Studio still supplies the optional 1.x page field, outside the current 2.1 schema.
      if (compatibleVariableInfo && Object.prototype.hasOwnProperty.call(validationCopy, 'page')) {
        expect(typeof validationCopy.page).toBe('string');
        delete validationCopy.page;
      }
      expect(validateVariableInfo21(validationCopy), JSON.stringify(validateVariableInfo21.errors)).toBe(true);
    });
  }
  if (process.env.SCHEMER_ARTIFACT) {
    const artifact = await fs.readFile(process.env.SCHEMER_ARTIFACT, 'utf8');
    await page.route('**/schemer-artifact.html', route => route.fulfill({
      contentType: 'text/html', body: artifact
    }));
  }
  const src = process.env.SCHEMER_ARTIFACT ? '/schemer-artifact.html' : '/';
  await page.route('**/studio-host.html', route => route.fulfill({
    contentType: 'text/html',
    body: `<!doctype html><html><body>
      <iframe title="Embedded Schemer" src="${src}" style="width:1100px;height:800px"></iframe>
      <script>
        window.received = [];
        addEventListener('message', event => {
          const frame = document.querySelector('iframe');
          if (event.source !== frame.contentWindow) return;
          window.received.push(event.data);
          if (event.data.type === 'vosReadyNotification') {
            frame.contentWindow.postMessage(${JSON.stringify(start)}, '*');
          }
        });
      </script>
    </body></html>`
  }));
  await page.goto('/studio-host.html');
  await expect.poll(() => page.evaluate(() => window.received
    .some(message => message.type === 'vosReadyNotification'))).toBe(true);
  return page.frameLocator('iframe[title="Embedded Schemer"]');
}

const makeCmcStart = type => {
  const rows = [1, 2, 3].map(index => ({
    ...CodingFactory.createCodingVariable(`old_row_${index}`),
    alias: `row_${index}`,
    manualInstruction: `Instructions for row ${index}`,
    codes: [{
      id: 1,
      type: 'FULL_CREDIT',
      score: index,
      ruleSets: [{ rules: [{ method: 'NUMERIC_MATCH', parameters: ['1'] }] }]
    }]
  }));
  return {
    ...makeStart([
      { ...makeVariable('anchor'), type: type === 'NO_VALUE' ? 'INTEGER' : 'integer' },
      { ...makeVariable('old_caption'), alias: 'cmc', type },
      ...rows.map(row => ({
        ...makeVariable(row.id), alias: row.alias, type: type === 'NO_VALUE' ? 'INTEGER' : 'integer'
      }))
    ]),
    codingSchemeType: 'iqb@3.5',
    codingScheme: JSON.stringify({
      version: '3.5',
      variableCodings: [CodingFactory.createCodingVariable('anchor'), ...rows, {
        ...CodingFactory.createCodingVariable('total'),
        sourceType: 'SUM_SCORE',
        deriveSources: rows.map(row => row.id)
      }]
    })
  };
};

test('derived CMC alias conflict: rename, cancel and reopen without reloading', async ({ page }) => {
  const current = makeDerivedConflictStart();
  const original = JSON.parse(current.codingScheme).variableCodings;
  const previous = {
    ...current,
    variables: original.slice(0, 5).map(row => ({ ...makeVariable(row.id), alias: row.alias, type: 'integer' }))
  };
  const frame = await loadEmbeddedSchemer(page, previous);
  await frame.locator('.var-list-entry').filter({ hasText: /^\s*01\s*$/ }).click();
  await frame.locator('var-coding .variable-details input').first().fill('Original CMC total');
  await expect.poll(() => page.evaluate(() => window.received
    .filter(message => message.type === 'vosSchemeChangedNotification').length)).toBeGreaterThan(0);
  const saved = await page.evaluate(() => window.received
    .filter(message => message.type === 'vosSchemeChangedNotification').at(-1).codingScheme);
  await frame.locator('body').evaluate(element => element.setAttribute('data-derived-instance', 'original'));
  await page.evaluate(message => {
    window.received = [];
    document.querySelector('iframe').contentWindow.postMessage(message, '*');
  }, { ...current, codingScheme: saved });
  await expect(frame.locator('body')).toHaveAttribute('data-derived-instance', 'original');
  const dialog = frame.getByRole('dialog');
  const alias = dialog.getByRole('textbox', { name: 'Neuer Alias für 01', exact: true });
  const apply = dialog.getByRole('button', { name: 'Änderungen übernehmen', exact: true });
  await expect(dialog).toHaveCount(1);
  await expect(dialog).toContainText('Der Alias kommt mehrfach vor.');
  await expect(apply).toBeDisabled();
  await alias.fill('bad.alias');
  await expect(dialog.getByRole('alert')).toContainText('nicht leer');
  await expect(apply).toBeDisabled();
  await alias.fill('01a');
  await expect(dialog.getByRole('alert')).toContainText('bereits vergeben');
  await alias.fill('old_01');
  await expect(apply).toBeEnabled();
  await dialog.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(() => window.received.filter(message => message.type === 'vosSchemeChangedNotification')))
    .toEqual([]);
  await frame.getByRole('button', { name: 'Konflikte prüfen', exact: true }).click();
  await expect(dialog).toHaveCount(1);
  await expect(alias).toHaveValue('01');
  await alias.fill('old_01');
  await apply.click();
  await expect(dialog).toHaveCount(0);
  const changes = await page.evaluate(() => window.received
    .filter(message => message.type === 'vosSchemeChangedNotification'));
  expect(changes).toHaveLength(1);
  const persisted = JSON.parse(changes[0].codingScheme).variableCodings;
  expect(persisted.find(coding => coding.id === 'derived_01')).toEqual({
    ...JSON.parse(saved).variableCodings.find(coding => coding.id === 'derived_01'), alias: 'old_01'
  });
  expect(persisted.filter(coding => coding.id.startsWith('old_row_'))).toEqual(original.slice(0, 5));
  expect(persisted.find(coding => coding.id === 'new_mc').codes).toEqual([]);
  await expect(frame.locator('body')).toHaveAttribute('data-derived-instance', 'original');
  const reopened = await loadEmbeddedSchemer(page, { ...current, codingScheme: changes[0].codingScheme });
  await expect(reopened.getByRole('dialog')).toHaveCount(0);
  await reopened.locator('.var-list-entry').filter({ hasText: /^\s*old_01\s*$/ }).click();
  await expect(reopened.locator('single-code input[type="number"]').last()).toHaveValue('3');
});

test('derived conflict deletion needs confirmation and preserves all original source codings', async ({ page }) => {
  const start = makeDerivedConflictStart();
  const original = JSON.parse(start.codingScheme).variableCodings;
  const frame = await loadEmbeddedSchemer(page, start);
  const dialog = frame.getByRole('dialog');
  const apply = dialog.getByRole('button', { name: 'Änderungen übernehmen', exact: true });
  await dialog.getByRole('button', { name: 'Ableitung zum Löschen vormerken', exact: true }).click();
  await expect(apply).toBeDisabled();
  await dialog.getByRole('checkbox', {
    name: 'Vorgemerkte Ableitungen einschließlich ihrer Kodierung löschen'
  }).check();
  await expect(apply).toBeEnabled();
  await dialog.getByRole('button', { name: 'Rückgängig', exact: true }).click();
  await dialog.getByRole('button', { name: 'Ableitung zum Löschen vormerken', exact: true }).click();
  await expect(apply).toBeDisabled();
  await dialog.getByRole('checkbox').check();
  await apply.click();
  await expect(dialog).toHaveCount(0);
  const changes = await page.evaluate(() => window.received
    .filter(message => message.type === 'vosSchemeChangedNotification'));
  expect(changes).toHaveLength(1);
  const persisted = JSON.parse(changes[0].codingScheme).variableCodings;
  expect(persisted.some(coding => coding.id === 'derived_01')).toBe(false);
  expect(persisted.filter(coding => coding.id.startsWith('old_row_'))).toEqual(original.slice(0, 5));
  expect(persisted.find(coding => coding.id === 'new_mc').codes).toEqual([]);
});

['SOLVER', 'SUM_SCORE'].forEach(sourceType => {
  test(`derived conflict repair preserves alias-based ${sourceType} sources after reopening`, async ({ page }) => {
    const start = makeDerivedConflictStart();
    const scheme = JSON.parse(start.codingScheme);
    scheme.variableCodings.push({
      ...CodingFactory.createCodingVariable('dependent'),
      alias: 'dependent',
      sourceType,
      deriveSources: ['01'],
      // SOLVER references are serialized literally in Verona messages.
      // eslint-disable-next-line no-template-curly-in-string
      sourceParameters: { processing: [], solverExpression: '${01} + 1' }
    });
    start.codingScheme = JSON.stringify(scheme);
    const frame = await loadEmbeddedSchemer(page, start);
    const dialog = frame.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Ableitung zum Löschen vormerken', exact: true }).click();
    await dialog.getByRole('checkbox').check();
    await expect(dialog.getByRole('alert')).toContainText('dependent');
    await expect(dialog.getByRole('button', { name: 'Änderungen übernehmen', exact: true })).toBeDisabled();
    await dialog.getByRole('button', { name: 'Rückgängig', exact: true }).click();
    await dialog.getByRole('textbox', { name: 'Neuer Alias für 01', exact: true }).fill('old_01');
    await dialog.getByRole('button', { name: 'Änderungen übernehmen', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    const changes = await page.evaluate(() => window.received
      .filter(message => message.type === 'vosSchemeChangedNotification'));
    expect(changes).toHaveLength(1);
    const persisted = JSON.parse(changes[0].codingScheme).variableCodings;
    const expectedDependent = {
      // eslint-disable-next-line no-template-curly-in-string
      ...scheme.variableCodings.at(-1),
      deriveSources: ['derived_01'],
      sourceParameters: {
        processing: [],
        // eslint-disable-next-line no-template-curly-in-string
        solverExpression: sourceType === 'SOLVER' ? '${old_01} + 1' : '${01} + 1'
      }
    };
    expect(persisted.find(coding => coding.id === 'dependent')).toEqual(expectedDependent);
    const reopened = await loadEmbeddedSchemer(page, { ...start, codingScheme: changes[0].codingScheme });
    await expect(reopened.getByRole('dialog')).toHaveCount(0);
    await reopened.locator('.var-list-entry').filter({ hasText: /^\s*dependent\s*$/ }).click();
    await expect(reopened.getByText('Kodierung reparieren')).toHaveCount(0);
    await reopened.locator('var-coding .variable-details input').first().fill('Still uses original aggregate');
    await expect.poll(() => page.evaluate(() => window.received
      .filter(message => message.type === 'vosSchemeChangedNotification').length)).toBeGreaterThan(0);
    const saved = await page.evaluate(() => window.received
      .filter(message => message.type === 'vosSchemeChangedNotification').at(-1).codingScheme);
    const roundTrip = JSON.parse(saved).variableCodings;
    const dependent = roundTrip.find(coding => coding.id === 'dependent');
    expect(dependent).toEqual({ ...expectedDependent, label: 'Still uses original aggregate' });
    expect(CodingSchemeFactory.deriveValue(roundTrip, dependent, [
      {
        id: 'derived_01', value: 5, code: 1, score: 3, status: 'CODING_COMPLETE'
      },
      {
        id: 'new_mc', value: 100, code: 1, score: 99, status: 'CODING_COMPLETE'
      }
    ])).toEqual(expect.objectContaining({ value: sourceType === 'SOLVER' ? 6 : 3, status: 'VALUE_CHANGED' }));
  });
});

test('derived conflict repair continues with orphan recovery before emitting the scheme', async ({ page }) => {
  const start = makeDerivedConflictStart();
  const scheme = JSON.parse(start.codingScheme);
  const orphan = JSON.parse(makeOrphanStart().codingScheme).variableCodings[0];
  scheme.variableCodings.push({ ...orphan, alias: '02' });
  start.variables.push({ ...makeVariable('new_radio_02'), alias: '02' });
  start.codingScheme = JSON.stringify(scheme);
  const frame = await loadEmbeddedSchemer(page, start);
  await frame.getByRole('textbox', { name: 'Neuer Alias für 01', exact: true }).fill('old_01');
  await frame.getByRole('button', { name: 'Änderungen übernehmen', exact: true }).click();
  await expect(frame.getByRole('dialog')).toContainText('Alte Kodierung übernehmen?');
  expect(await page.evaluate(() => window.received.filter(message => message.type === 'vosSchemeChangedNotification')))
    .toEqual([]);
  await frame.getByRole('button', { name: 'Kodierung übernehmen', exact: true }).click();
  await expect(frame.getByRole('dialog')).toHaveCount(0);
  const changes = await page.evaluate(() => window.received
    .filter(message => message.type === 'vosSchemeChangedNotification'));
  expect(changes).toHaveLength(1);
  const persisted = JSON.parse(changes[0].codingScheme).variableCodings;
  expect(persisted.find(coding => coding.id === 'derived_01').alias).toBe('old_01');
  expect(persisted.find(coding => coding.id === 'new_radio_02').codes).toEqual(orphan.codes);
});

test('derived conflict edits cannot survive a host task or permission change', async ({ page }) => {
  const start = makeDerivedConflictStart();
  const frame = await loadEmbeddedSchemer(page, start);
  await frame.getByRole('textbox', { name: 'Neuer Alias für 01', exact: true }).fill('old_01');
  await page.evaluate(message => {
    window.received = [];
    document.querySelector('iframe').contentWindow.postMessage(message, '*');
  }, { ...start, schemerConfig: { ...start.schemerConfig, role: 'guest' } });
  await expect(frame.getByRole('dialog')).toHaveCount(1);
  await expect(frame.getByRole('textbox', { name: 'Neuer Alias für 01', exact: true })).toBeDisabled();
  await expect(frame.getByRole('textbox', { name: 'Neuer Alias für 01', exact: true })).toHaveValue('01');
  await expect(frame.getByRole('button', { name: 'Änderungen übernehmen', exact: true })).toBeDisabled();
  await page.evaluate(message => document.querySelector('iframe').contentWindow.postMessage(message, '*'), {
    ...makeStart([makeVariable('next_task')]), sessionId: 'next-task'
  });
  await expect(frame.getByRole('dialog')).toHaveCount(0);
  await expect(frame.locator('.var-list-entry')).toHaveText(['next_task']);
  expect(await page.evaluate(() => window.received.filter(message => message.type === 'vosSchemeChangedNotification')))
    .toEqual([]);
});

['no-value', 'NO_VALUE'].forEach(type => {
  [false, true].forEach(cancel => {
    test(`CMC recreation without iframe reload: ${type}, cancel=${cancel}`, async ({ page }) => {
      const start = makeCmcStart(type);
      const frame = await loadEmbeddedSchemer(page, start, { variableInfo21: type === 'NO_VALUE' });
      await expect(frame.locator('.var-list-entry')).toHaveCount(5);
      await frame.locator('body').evaluate(element => element.setAttribute('data-cmc-instance', 'original'));
      await frame.locator('var-coding .variable-details input').first().fill('Persist the initialized CMC');
      await expect.poll(() => page.evaluate(() => window.received
        .filter(message => message.type === 'vosSchemeChangedNotification').length)).toBeGreaterThan(0);
      const saved = await page.evaluate(() => window.received
        .filter(message => message.type === 'vosSchemeChangedNotification').at(-1).codingScheme);
      const recreated = {
        ...start,
        codingScheme: saved,
        variables: start.variables.map(variable => ({ ...variable, id: variable.id.replace(/^old_/, 'new_') }))
      };
      await page.evaluate(message => {
        window.received = [];
        document.querySelector('iframe').contentWindow.postMessage(message, '*');
      }, recreated);
      await expect(frame.locator('body')).toHaveAttribute('data-cmc-instance', 'original');
      const dialog = frame.getByRole('dialog');
      const transfer = frame.getByRole('button', { name: 'Kodierung übernehmen', exact: true });
      const restart = frame.getByRole('button', { name: 'Neu beginnen und alte Kodierung löschen', exact: true });
      const changes = () => page.evaluate(() => window.received
        .filter(message => message.type === 'vosSchemeChangedNotification'));
      await expect(dialog).toHaveCount(1);
      await expect(dialog).toContainText('Konflikt 1 von 3');
      await expect(dialog).toContainText('Instructions for row 1');
      await transfer.click();
      await expect(dialog).toContainText('Konflikt 2 von 3');
      expect(await changes()).toEqual([]);
      await restart.click();
      await expect(dialog).toContainText('Konflikt 3 von 3');
      expect(await changes()).toEqual([]);
      if (cancel) {
        await frame.getByRole('button', { name: 'Abbrechen', exact: true }).click();
        await expect(dialog).toHaveCount(0);
        expect(await changes()).toEqual([]);
        await frame.getByRole('button', { name: 'Konflikte prüfen', exact: true }).click();
        await expect(dialog).toContainText('Konflikt 1 von 3');
        await expect(dialog).toContainText('Instructions for row 1');
        await transfer.click();
        await restart.click();
        await expect(dialog).toContainText('Konflikt 3 von 3');
      }
      await transfer.click();
      await expect(dialog).toHaveCount(0);
      const notifications = await changes();
      expect(notifications).toHaveLength(1);
      const persisted = JSON.parse(notifications[0].codingScheme).variableCodings;
      expect(persisted.find(coding => coding.id === 'new_row_1').codes[0].score).toBe(1);
      expect(persisted.find(coding => coding.id === 'new_row_2').codes).toEqual([]);
      expect(persisted.find(coding => coding.id === 'new_row_3').codes[0].score).toBe(3);
      expect(persisted.find(coding => coding.id === 'new_caption').sourceType).toBe('BASE_NO_VALUE');
      expect(persisted.find(coding => coding.id === 'total').deriveSources)
        .toEqual(['new_row_1', 'old_row_2', 'new_row_3']);
      expect(persisted.map(coding => coding.id)).not.toContain('old_caption');
      await page.evaluate(message => {
        document.querySelector('iframe').contentWindow.postMessage(message, '*');
      }, { ...recreated, codingScheme: notifications[0].codingScheme });
      await expect(frame.getByRole('dialog')).toHaveCount(0);
      await expect(frame.locator('body')).toHaveAttribute('data-cmc-instance', 'original');
      await frame.locator('.var-list-entry').filter({ hasText: 'total' }).click();
      await expect(frame.locator('.missing-source-notice')).toContainText('old_row_2');
      const reopened = await loadEmbeddedSchemer(page, {
        ...recreated, codingScheme: notifications[0].codingScheme
      }, { variableInfo21: type === 'NO_VALUE' });
      await expect(reopened.getByRole('dialog')).toHaveCount(0);
      await reopened.locator('.var-list-entry').filter({ hasText: 'total' }).click();
      await expect(reopened.locator('.missing-source-notice')).toContainText('old_row_2');
    });
  });
});

test('Studio CMC fixture has identical mixed recovery with a reused iframe and a fresh load', async ({ page }) => {
  const current = process.env.STUDIO_CMC_START_FILE
    ? JSON.parse(await fs.readFile(process.env.STUDIO_CMC_START_FILE, 'utf8'))
    : makeCmcStart('no-value');
  const original = JSON.parse(current.codingScheme).variableCodings;
  const total = original.find(coding => coding.sourceType === 'SUM_SCORE');
  const oldRows = total.deriveSources.map(id => original.find(coding => coding.id === id));
  expect(oldRows).toHaveLength(3);
  if (!process.env.STUDIO_CMC_START_FILE) {
    current.variables = current.variables.map(variable => ({
      ...variable, id: variable.id.replace(/^old_/, 'new_')
    }));
  }
  const newRows = oldRows.map(old => current.variables.find(variable => variable.alias === old.alias));
  expect(newRows.every(variable => variable)).toBe(true);
  const hostBefore = JSON.stringify(current.variables);
  const previous = {
    ...current,
    variables: current.variables.map(variable => ({
      ...variable,
      id: oldRows.find(row => row.alias === variable.alias)?.id
        || (normalizeVariableInfoType(variable.type) === 'NO_VALUE' ? `previous_${variable.id}` : variable.id)
    }))
  };
  const frame = await loadEmbeddedSchemer(page, previous, { compatibleVariableInfo: true });
  await expect(frame.getByRole('dialog')).toHaveCount(0);
  await frame.locator('.var-list-entry').filter({ hasText: total.alias }).click();
  await frame.locator('var-coding .variable-details input').first().fill('Local CMC initialization');
  await expect.poll(() => page.evaluate(() => window.received
    .filter(message => message.type === 'vosSchemeChangedNotification').length)).toBeGreaterThan(0);
  const saved = await page.evaluate(() => window.received
    .filter(message => message.type === 'vosSchemeChangedNotification').at(-1).codingScheme);
  const recreated = { ...current, codingScheme: saved };
  await frame.locator('body').evaluate(element => element.setAttribute('data-cmc-instance', 'original'));
  await page.evaluate(message => {
    window.received = [];
    document.querySelector('iframe').contentWindow.postMessage(message, '*');
  }, recreated);

  const decide = async currentFrame => {
    const dialog = currentFrame.getByRole('dialog');
    await expect(dialog).toHaveCount(1);
    for (const [index, row] of newRows.entries()) {
      await expect(dialog).toContainText(`Konflikt ${index + 1} von 3`);
      await expect(dialog).toContainText(row.alias);
      const name = index === 1 ? 'Neu beginnen und alte Kodierung löschen' : 'Kodierung übernehmen';
      await currentFrame.getByRole('button', { name, exact: true }).click();
      if (index < 2) {
        expect(await page.evaluate(() => window.received
          .filter(message => message.type === 'vosSchemeChangedNotification'))).toEqual([]);
      }
    }
    await expect(dialog).toHaveCount(0);
    const changes = await page.evaluate(() => window.received
      .filter(message => message.type === 'vosSchemeChangedNotification'));
    expect(changes).toHaveLength(1);
    return JSON.parse(changes[0].codingScheme).variableCodings;
  };
  const warm = await decide(frame);
  await expect(frame.locator('body')).toHaveAttribute('data-cmc-instance', 'original');
  const expectedSources = [newRows[0].id, oldRows[1].id, newRows[2].id];
  expect(warm.find(coding => coding.id === total.id).deriveSources).toEqual(expectedSources);
  expect(warm.find(coding => coding.id === newRows[0].id).codes).toEqual(oldRows[0].codes);
  expect(warm.find(coding => coding.id === newRows[1].id).codes).toEqual([]);
  expect(warm.find(coding => coding.id === newRows[2].id).codes).toEqual(oldRows[2].codes);
  current.variables.filter(variable => normalizeVariableInfoType(variable.type) === 'NO_VALUE').forEach(variable => {
    expect(warm.find(coding => coding.id === variable.id).sourceType).toBe('BASE_NO_VALUE');
  });
  const cold = await loadEmbeddedSchemer(page, recreated, { compatibleVariableInfo: true });
  expect(await decide(cold)).toEqual(warm);
  expect(JSON.stringify(current.variables)).toBe(hostBefore);
});

['no-value', 'NO_VALUE'].forEach(type => {
  const protectedCase = `protected ${type} text requires an explicit decision and cancels atomically`;
  test(protectedCase, async ({ page }) => {
    const start = makeOrphanStart();
    start.variables.unshift({ ...makeVariable('new_text'), alias: 'text_1', type });
    if (type === 'NO_VALUE') start.variables[1].type = 'NUMBER';
    const scheme = JSON.parse(start.codingScheme);
    scheme.variableCodings.unshift({
      ...CodingFactory.createBaseCodingVariable('old_text', 'BASE_NO_VALUE'),
      alias: 'text_1',
      manualInstruction: '<p>Keep the old text instructions until explicitly discarded</p>'
    });
    start.codingScheme = JSON.stringify(scheme);
    const frame = await loadEmbeddedSchemer(page, start, { variableInfo21: type === 'NO_VALUE' });
    const dialog = frame.getByRole('dialog');
    const restart = frame.getByRole('button', { name: 'Neu beginnen und alte Kodierung löschen', exact: true });
    const transfer = frame.getByRole('button', { name: 'Kodierung übernehmen', exact: true });
    await expect(dialog).toContainText('Konflikt 1 von 2');
    await expect(dialog).toContainText('Keep the old text instructions');
    await expect(transfer).toBeDisabled();
    await restart.click();
    await expect(dialog).toContainText('Konflikt 2 von 2');
    expect(await page.evaluate(() => window.received
      .filter(message => message.type === 'vosSchemeChangedNotification'))).toEqual([]);
    await frame.getByRole('button', { name: 'Abbrechen', exact: true }).click();
    await frame.getByRole('button', { name: 'Konflikte prüfen', exact: true }).click();
    await expect(dialog).toContainText('Konflikt 1 von 2');
    await expect(dialog).toContainText('Keep the old text instructions');
    await expect(transfer).toBeDisabled();
    await restart.click();
    await transfer.click();
    await expect(dialog).toHaveCount(0);
    const changes = await page.evaluate(() => window.received
      .filter(message => message.type === 'vosSchemeChangedNotification'));
    expect(changes).toHaveLength(1);
    const persisted = JSON.parse(changes[0].codingScheme).variableCodings;
    expect(persisted.find(coding => coding.id === 'new_text')).toEqual(expect.objectContaining({
      sourceType: 'BASE_NO_VALUE', codes: [], manualInstruction: ''
    }));
    expect(persisted.find(coding => coding.id === 'current').codes).toEqual(scheme.variableCodings[1].codes);
    expect(persisted.map(coding => coding.id)).not.toContain('old_text');
  });

  ['TRANSFER', 'START_EMPTY', 'CANCEL'].forEach(decision => {
    test(`MC text/radio recreation with ${type}: ${decision} survives Verona save and reopen`, async ({ page }) => {
      const start = makeOrphanStart();
      start.codingScheme = start.codingScheme.replaceAll('old-radio', 'old_radio');
      const responseType = type === 'NO_VALUE' ? 'INTEGER' : 'integer';
      start.variables = [
        { ...makeVariable('old_text'), alias: 'text_1', type },
        { ...makeVariable('old_radio'), alias: '01', type: responseType }
      ];
      // First initialize the real app: its Verona start handler creates the text schema entry.
      const frame = await loadEmbeddedSchemer(page, start, { variableInfo21: type === 'NO_VALUE' });
      await expect(frame.getByRole('dialog')).toHaveCount(0);
      await frame.locator('.var-list-entry').filter({ hasText: '01' }).click();
      await frame.locator('var-coding .variable-details input').first().fill('Original MC coding');
      await expect.poll(() => page.evaluate(() => window.received
        .filter(message => message.type === 'vosSchemeChangedNotification').at(-1)?.codingScheme)).toBeTruthy();
      const saved = await page.evaluate(() => window.received
        .filter(message => message.type === 'vosSchemeChangedNotification').at(-1).codingScheme);
      const oldCodings = JSON.parse(saved).variableCodings;
      expect(oldCodings.find(coding => coding.id === 'old_text')).toEqual(expect.objectContaining({
        sourceType: 'BASE_NO_VALUE', codeModel: 'RULES_ONLY', alias: 'text_1', codes: []
      }));
      const recreated = {
        ...start,
        codingScheme: saved,
        variables: start.variables.map(variable => ({
          ...variable, id: variable.id === 'old_text' ? 'new_text' : 'new_radio'
        }))
      };
      const recovery = await loadEmbeddedSchemer(page, recreated, { variableInfo21: type === 'NO_VALUE' });
      const dialog = recovery.getByRole('dialog');
      await expect(dialog).toContainText('Konflikt 1 von 1');
      await expect(dialog).toContainText('Original instructions');
      await expect(dialog).not.toContainText('old_text');
      const transfer = recovery.getByRole('button', { name: 'Kodierung übernehmen', exact: true });
      if (decision === 'CANCEL') {
        await recovery.getByRole('button', { name: 'Abbrechen', exact: true }).click();
        expect(await page.evaluate(() => window.received
          .filter(message => message.type === 'vosSchemeChangedNotification'))).toEqual([]);
        await recovery.getByRole('button', { name: 'Konflikte prüfen', exact: true }).click();
        await expect(dialog).toContainText('Original instructions');
      }
      const effectiveDecision = decision === 'CANCEL' ? 'TRANSFER' : decision;
      if (effectiveDecision === 'TRANSFER') await transfer.click();
      else await recovery.getByRole('button', { name: 'Neu beginnen und alte Kodierung löschen', exact: true }).click();
      await expect(dialog).toHaveCount(0);
      const changes = await page.evaluate(() => window.received
        .filter(message => message.type === 'vosSchemeChangedNotification'));
      expect(changes).toHaveLength(1);
      const persisted = JSON.parse(changes[0].codingScheme).variableCodings;
      expect(persisted.map(coding => coding.id).sort()).toEqual(['derived', 'new_radio', 'new_text']);
      expect(persisted.find(coding => coding.id === 'new_text')).toEqual(expect.objectContaining({
        sourceType: 'BASE_NO_VALUE', codeModel: 'RULES_ONLY', alias: 'text_1', codes: []
      }));
      expect(persisted.find(coding => coding.id === 'new_radio')).toEqual(expect.objectContaining({
        sourceType: 'BASE',
        alias: '01',
        codes: effectiveDecision === 'TRANSFER' ? oldCodings.find(coding => coding.id === 'old_radio').codes : []
      }));
      const reopened = await loadEmbeddedSchemer(page, {
        ...recreated, codingScheme: changes[0].codingScheme
      }, { variableInfo21: type === 'NO_VALUE' });
      await expect(reopened.getByRole('dialog')).toHaveCount(0);
      await expect(reopened.locator('.var-list-entry')).toHaveText(['01', 'sum']);
      await reopened.locator('.var-list-entry').filter({ hasText: 'sum' }).click();
      await expect(reopened.locator('.missing-source-notice')).toHaveCount(effectiveDecision === 'TRANSFER' ? 0 : 1);
      expect(recreated.variables).toEqual([
        { ...makeVariable('new_text'), alias: 'text_1', type },
        { ...makeVariable('new_radio'), alias: '01', type: responseType }
      ]);
    });
  });
});

[false, true].forEach(current => {
  const version = current ? '2.1 minimal' : '1.x';
  test(`VariableInfo ${version} preserves states and generates usable codings`, async ({ page }) => {
    const input = [
      { id: 'state', type: 'NO_VALUE' },
      { id: 'answer', type: 'STRING' },
      { id: 'count', type: 'INTEGER' },
      { id: 'geo', type: 'NUMBER', format: 'GGB_VARIABLE' },
      { id: 'table', type: 'JSON', format: 'MATH_TABLE' },
      { id: 'element', type: 'STRING', format: 'CHEM_ELEMENT_SYMBOLS' },
      { id: 'molecule', type: 'JSON', format: 'CHEM_MOLECULE' }
    ];
    const variables = current ? input : input.map(variable => ({
      ...makeVariable(variable.id),
      type: variable.type.toLowerCase().replace(/_/g, '-'),
      format: (variable.format || '').toLowerCase().replace(/_/g, '-')
    }));
    const start = makeStart(variables);
    // The lowercase chemistry spellings are compatibility extensions outside the 1.3 schema.
    if (!current) {
      expectVeronaMessage(makeStart(variables.filter(variable => !variable.format.startsWith('chem-'))));
    }
    const frame = await loadEmbeddedSchemer(page, current ? start : makeStart([]), { variableInfo21: current });
    if (!current) {
      await page.evaluate(message => {
        document.querySelector('iframe').contentWindow.postMessage(message, '*');
      }, start);
    }
    await expect(frame.locator('.var-list-entry')).toHaveText([
      'answer', 'count', 'element', 'geo', 'molecule', 'table'
    ]);
    const scenarios = [
      { id: 'answer', expected: 'correct', response: 'correct' },
      { id: 'count', expected: '2', response: 2 },
      { id: 'geo', expected: '2', response: 'A = 2' },
      { id: 'table', expected: '3', response: JSON.stringify([{ rowType: 'result', cells: [{ value: '3' }] }]) },
      { id: 'element', expected: 'H', response: 'H' }
    ];
    for (const scenario of scenarios) {
      await frame.locator('.var-list-entry').getByText(scenario.id, { exact: true }).click();
      await frame.getByRole('button', {
        description: 'Variableninformation / Kodierung generieren', exact: true
      }).click();
      const dialog = frame.getByRole('dialog');
      await expect(dialog).not.toContainText('unbekannt');
      if (['answer', 'element'].includes(scenario.id)) {
        await dialog.locator('textarea').fill(scenario.expected);
      } else {
        await dialog.getByRole('textbox').first().fill(scenario.expected);
      }
      await dialog.getByRole('button', { name: 'Generiere Kodierung', exact: true }).click();
      await expect(dialog).toHaveCount(0);
      await expect.poll(() => page.evaluate(id => {
        const changed = window.received.filter(message => message.type === 'vosSchemeChangedNotification').at(-1);
        return changed && JSON.parse(changed.codingScheme).variableCodings
          .find(variable => variable.id === id)?.codes?.length;
      }, scenario.id)).toBeGreaterThan(0);
      const scheme = await page.evaluate(() => JSON.parse(window.received
        .filter(message => message.type === 'vosSchemeChangedNotification').at(-1).codingScheme));
      expect(scheme.variableCodings.find(variable => variable.id === 'state').sourceType).toBe('BASE_NO_VALUE');
      const coding = scheme.variableCodings.find(variable => variable.id === scenario.id);
      expect(CodingFactory.code({ id: scenario.id, value: scenario.response, status: 'VALUE_CHANGED' }, coding).code)
        .toBe(coding.codes.find(code => code.type === 'FULL_CREDIT').id);
    }
    await frame.locator('.var-list-entry').getByText('molecule', { exact: true }).click();
    await frame.getByRole('button', {
      description: 'Variableninformation / Kodierung generieren', exact: true
    }).click();
    await expect(frame.getByRole('dialog')).toContainText('Molekül mit Bild (JSON)');
    await expect(frame.getByRole('dialog')).not.toContainText('unbekannt');
    await frame.getByRole('dialog').getByRole('button', { name: 'Schließen', exact: true }).click();
  });
});

test('Verona 3.2 metadata and edited schemes follow the published message contract', async ({ page }) => {
  const frame = await loadEmbeddedSchemer(page, studioStart);
  await expect(frame.locator('.var-list-entry')).toHaveCount(2);
  const ready = await page.evaluate(() => window.received.find(message => message.type === 'vosReadyNotification'));
  expectVeronaMessage(ready);
  const metadata = JSON.parse(ready.metadata);
  if (process.env.SCHEMER_ARTIFACT) {
    expect(metadata.apiVersion).toBe(veronaSchema.info.version);
    expect(metadata['@type']).toBe('schemer');
  }
  const wrapper = await fs.readFile('projects/schemer/src/html_wrapper/index.html', 'utf8');
  const advertised = JSON.parse(wrapper.match(/<script[^>]*id="meta_data"[^>]*>([\s\S]*?)<\/script>/)[1]);
  expect(advertised.apiVersion).toBe(veronaSchema.info.version);

  const label = frame.locator('var-coding .variable-details input').first();
  await label.fill('Verona contract edit');
  await label.press('Tab');
  await expect.poll(() => page.evaluate(() => window.received
    .filter(message => message.type === 'vosSchemeChangedNotification').at(-1)?.codingScheme))
    .toContain('Verona contract edit');
  const changed = await page.evaluate(() => window.received
    .filter(message => message.type === 'vosSchemeChangedNotification').at(-1));
  expectVeronaMessage(changed);
  expect(changed.sessionId).toBe('embedded-regression');
  expect(changed.codingSchemeType).toBe('iqb@3.5');
  expect(JSON.parse(changed.codingScheme).version).toBe('3.5');
});

test('a minimal Verona start can be followed by a Studio update', async ({ page }) => {
  const frame = await loadEmbeddedSchemer(page, { type: 'vosStartCommand', sessionId: 'minimal-host' });
  await expect(frame.getByText('Es sind keine Basis-Variablen definiert.', { exact: false })).toBeVisible();
  const update = { ...makeStart([makeVariable('later_variable')]), sessionId: 'minimal-host' };
  await page.evaluate(message => document.querySelector('iframe').contentWindow.postMessage(message, '*'), update);
  await expect(frame.locator('.var-list-entry')).toHaveText(['later_variable']);
  const label = frame.locator('var-coding .variable-details input').first();
  await label.fill('Loaded after minimal start');
  await label.press('Tab');
  await expect.poll(() => page.evaluate(() => window.received
    .filter(message => message.type === 'vosSchemeChangedNotification').at(-1)?.codingScheme))
    .toContain('Loaded after minimal start');
  const changed = await page.evaluate(() => window.received
    .filter(message => message.type === 'vosSchemeChangedNotification').at(-1));
  expectVeronaMessage(changed);
  expect(changed.sessionId).toBe('minimal-host');
});

test('invalid start sessions cannot replace a loaded Studio scheme', async ({ page }) => {
  const frame = await loadEmbeddedSchemer(page);
  await expect(frame.locator('.var-list-entry')).toHaveCount(2);
  await page.evaluate(message => {
    const target = document.querySelector('iframe').contentWindow;
    target.postMessage({ ...message, sessionId: '' }, '*');
    target.postMessage({ ...message, sessionId: null }, '*');
    const withoutSession = { ...message };
    delete withoutSession.sessionId;
    target.postMessage(withoutSession, '*');
  }, makeStart([makeVariable('invalid_replacement')]));
  await frame.locator('app-root').evaluate(() => new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  await expect(frame.locator('.var-list-entry')).toHaveText(['response_1', 'response_2']);
});

test('a sibling frame cannot replace host data or the active session', async ({ page }) => {
  const frame = await loadEmbeddedSchemer(page);
  await expect(frame.locator('.var-list-entry')).toHaveText(['response_1', 'response_2']);
  await frame.locator('app-root').evaluate(() => {
    window.foreignStartReceived = false;
    window.addEventListener('message', event => {
      if (event.data?.sessionId === 'foreign-session') window.foreignStartReceived = true;
    });
  });
  await page.evaluate(message => {
    const sibling = document.createElement('iframe');
    sibling.title = 'Untrusted sibling';
    sibling.srcdoc = `<script>parent.frames[0].postMessage(${JSON.stringify(message)}, '*');</script>`;
    document.body.appendChild(sibling);
  }, { ...makeStart([makeVariable('foreign_variable')], 'guest'), sessionId: 'foreign-session' });
  await expect.poll(() => frame.locator('app-root').evaluate(() => window.foreignStartReceived)).toBe(true);
  await frame.locator('app-root').evaluate(() => new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  await expect(frame.locator('.var-list-entry')).toHaveText(['response_1', 'response_2']);
  const label = frame.locator('var-coding .variable-details input').first();
  await label.fill('Host session preserved');
  await label.press('Tab');
  await expect.poll(() => page.evaluate(() => window.received
    .filter(message => message.type === 'vosSchemeChangedNotification').at(-1)?.codingScheme))
    .toContain('Host session preserved');
  const changed = await page.evaluate(() => window.received
    .filter(message => message.type === 'vosSchemeChangedNotification').at(-1));
  expect(changed.sessionId).toBe('embedded-regression');
});

test('embedded Schemer displays host variables without a user interaction', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const frame = await loadEmbeddedSchemer(page);

  await expect(frame.locator('.var-list-entry')).toHaveText(['response_1', 'response_2']);
  await expect(frame.getByText('Es sind keine Basis-Variablen definiert.', { exact: false })).toHaveCount(0);
  await expect(frame.locator('var-coding')).toBeVisible();
  expect(errors).toEqual([]);
});

test('embedded Schemer renders a later host update and its read-only role', async ({ page }) => {
  const frame = await loadEmbeddedSchemer(page);
  await expect(frame.locator('.var-list-entry')).toHaveCount(2);

  const update = makeStart([makeVariable('replacement')], 'guest');
  await page.evaluate(message => {
    document.querySelector('iframe').contentWindow.postMessage(message, '*');
  }, update);

  await expect(frame.locator('.var-list-entry')).toHaveText(['replacement']);
  await expect(frame.locator('.var-list-buttons button').first()).toBeDisabled();
  await expect(frame.locator('var-coding .variable-details input').first()).toBeDisabled();

  const withoutRole = makeStart([makeVariable('refresh_without_role')]);
  delete withoutRole.schemerConfig;
  await page.evaluate(message => {
    document.querySelector('iframe').contentWindow.postMessage(message, '*');
  }, withoutRole);
  await expect(frame.locator('.var-list-entry')).toHaveText(['refresh_without_role']);
  await expect(frame.locator('var-coding .variable-details input').first()).toBeDisabled();

  await page.evaluate(message => {
    document.querySelector('iframe').contentWindow.postMessage(message, '*');
  }, makeStart([makeVariable('replacement')], 'super'));
  await expect(frame.locator('.var-list-buttons button').first()).toBeEnabled();
  await expect(frame.locator('var-coding .variable-details input').first()).toBeEnabled();

  await page.evaluate(message => {
    document.querySelector('iframe').contentWindow.postMessage(message, '*');
  }, makeStart([]));
  await expect(frame.locator('.var-list-entry')).toHaveCount(0);
  await expect(frame.getByText('Es sind keine Basis-Variablen definiert.', { exact: false })).toBeVisible();
});

test('embedded Schemer reports edited coding data back to the host session', async ({ page }) => {
  const frame = await loadEmbeddedSchemer(page);
  await expect(frame.locator('.var-list-entry')).toHaveCount(2);

  const label = frame.locator('var-coding .variable-details input').first();
  await label.fill('Edited response label');
  await label.press('Tab');

  await expect.poll(() => page.evaluate(() => {
    const changed = window.received.filter(message => message.type === 'vosSchemeChangedNotification').at(-1);
    if (!changed) return null;
    const coding = JSON.parse(changed.codingScheme).variableCodings.find(variable => variable.id === 'response_1');
    return { sessionId: changed.sessionId, label: coding?.label };
  })).toEqual({ sessionId: 'embedded-regression', label: 'Edited response label' });
});

test('embedded Schemer hands off the latest input before a host save without waiting for blur', async ({ page }) => {
  const frame = await loadEmbeddedSchemer(page);
  await expect(frame.locator('.var-list-entry')).toHaveCount(2);
  await frame.locator('.add-code-actions button').first().click();
  await expect.poll(() => page.evaluate(() => window.received.some(message => (
    message.type === 'vosSchemeChangedNotification'
    && JSON.parse(message.codingScheme).variableCodings[0].codes.length === 1
  )))).toBe(true);
  await page.evaluate(() => {
    const save = document.createElement('button');
    save.id = 'host-save';
    save.textContent = 'Host save';
    save.addEventListener('click', () => {
      window.savedScheme = window.received
        .filter(message => message.type === 'vosSchemeChangedNotification').at(-1).codingScheme;
    });
    document.body.prepend(save);
  });
  await frame.locator('var-coding .variable-details input').first().fill('Latest input before host save');
  await page.locator('#host-save').click();
  const saved = await page.evaluate(() => window.savedScheme);
  expect(JSON.parse(saved).variableCodings[0].label).toBe('Latest input before host save');
  const reopened = await loadEmbeddedSchemer(page, {
    ...makeStart([makeVariable('response_1'), makeVariable('response_2')]), codingScheme: saved
  });
  await expect(reopened.locator('var-coding .variable-details input').first())
    .toHaveValue('Latest input before host save');
});

test('orphan recovery is discarded when the host switches to another conflicting task', async ({ page }) => {
  const start = makeOrphanStart();
  const scheme = JSON.parse(start.codingScheme);
  scheme.variableCodings.push({ ...scheme.variableCodings[0], id: 'older-radio' });
  start.codingScheme = JSON.stringify(scheme);
  const frame = await loadEmbeddedSchemer(page, start);
  await expect(frame.getByRole('dialog')).toContainText('Alte Kodierung übernehmen?');
  await frame.locator('.coding-summary').filter({ hasText: 'Alte technische ID: old-radio' })
    .getByRole('button', { name: 'Alte Kodierung zum Löschen vormerken', exact: true }).click();
  await page.evaluate(
    message => document.querySelector('iframe').contentWindow.postMessage(message, '*'),
    makeOrphanStart('second-orphan-task', 'second-current')
  );
  await expect(frame.getByRole('dialog')).toHaveText([/second-current/]);
  expect(await page.evaluate(() => window.received
    .filter(message => message.type === 'vosSchemeChangedNotification'))).toEqual([]);
  await frame.getByRole('button', { name: 'Kodierung übernehmen', exact: true }).click();
  await expect(frame.getByRole('dialog')).toHaveCount(0);
  const changes = await page.evaluate(() => window.received
    .filter(message => message.type === 'vosSchemeChangedNotification'));
  expect(changes).toHaveLength(1);
  expect(changes[0].sessionId).toBe('second-orphan-task');
  expect(JSON.parse(changes[0].codingScheme).variableCodings).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: 'second-current', manualInstruction: '<p>Original instructions</p>' }),
    expect.objectContaining({ id: 'derived', deriveSources: ['second-current'] })
  ]));
  expect(JSON.parse(changes[0].codingScheme).variableCodings).toHaveLength(2);
});

test('orphan recovery cannot write after the host revokes access', async ({ page }) => {
  const start = makeOrphanStart();
  const frame = await loadEmbeddedSchemer(page, start);
  await expect(frame.getByRole('dialog')).toContainText('Alte Kodierung übernehmen?');
  await page.evaluate(message => document.querySelector('iframe').contentWindow.postMessage(message, '*'), {
    ...start, schemerConfig: { role: 'guest' }
  });
  await expect(frame.getByRole('dialog')).toHaveText([/Du hast nur Leserechte/]);
  await expect(frame.getByRole('button', { name: 'Kodierung übernehmen', exact: true })).toBeDisabled();
  await expect(frame.getByRole('button', { name: 'Neu beginnen und alte Kodierung löschen', exact: true }))
    .toBeDisabled();
  await frame.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await expect(frame.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => window.received
    .filter(message => message.type === 'vosSchemeChangedNotification'))).toEqual([]);
});

test('recovered coding and immediate edits survive the host save and reopen', async ({ page }) => {
  const start = makeOrphanStart();
  const frame = await loadEmbeddedSchemer(page, start);
  await frame.getByRole('button', { name: 'Kodierung übernehmen', exact: true }).click();
  await frame.locator('.var-list-entry').filter({ hasText: '01' }).click();
  await page.evaluate(() => {
    const button = document.createElement('button');
    button.id = 'host-save';
    button.textContent = 'Host save';
    button.addEventListener('click', () => {
      window.savedScheme = window.received
        .filter(message => message.type === 'vosSchemeChangedNotification').at(-1).codingScheme;
    });
    document.body.prepend(button);
  });
  await frame.locator('var-coding .variable-details input').first().fill('Recovered and edited');
  await page.locator('#host-save').click();
  const saved = await page.evaluate(() => window.savedScheme);
  expect(JSON.parse(saved).variableCodings).toEqual(expect.arrayContaining([
    expect.objectContaining({
      id: 'current',
      label: 'Recovered and edited',
      codes: [
        expect.objectContaining({ score: 2, manualInstruction: '<p>Keep code instruction</p>' })
      ]
    }),
    expect.objectContaining({ id: 'derived', deriveSources: ['current'] })
  ]));
  expect(JSON.parse(saved).variableCodings).toHaveLength(2);
  const reopened = await loadEmbeddedSchemer(page, { ...start, codingScheme: saved });
  await expect(reopened.getByRole('dialog')).toHaveCount(0);
  await reopened.locator('.var-list-entry').filter({ hasText: '01' }).click();
  await expect(reopened.locator('var-coding .variable-details input').first()).toHaveValue('Recovered and edited');
});

[
  { decision: 'TRANSFER', button: 'Kodierung übernehmen' },
  { decision: 'START_EMPTY', button: 'Neu beginnen und alte Kodierung löschen' }
].forEach(({ decision, button }) => {
  test(
    `orphan recovery preserves shadowed SOLVER sources across Verona save and reopen with ${decision}`,
    async ({ page }) => {
      const start = makeOrphanStart();
      start.variables = [
        { ...makeVariable('current'), alias: 'response', type: 'number' },
        { ...makeVariable('response'), alias: 'Other', type: 'number' },
        { ...makeVariable('caption'), alias: 'Caption', type: 'no-value' }
      ];
      const scheme = JSON.parse(start.codingScheme);
      scheme.variableCodings[0].alias = 'Response';
      const calculation = scheme.variableCodings[1];
      calculation.deriveSources = ['old-radio', 'response'];
      // The two literal references identify different sources before recovery.
      // eslint-disable-next-line no-template-curly-in-string
      calculation.sourceParameters.solverExpression = '${Response} + 10 * ${response}';
      scheme.variableCodings.push({
        id: 'response', alias: 'Other', sourceType: 'BASE', codeModel: 'RULES_ONLY', codes: []
      }, {
        ...calculation,
        id: 'unrelated',
        alias: 'Unrelated',
        deriveSources: ['response'],
        // eslint-disable-next-line no-template-curly-in-string
        sourceParameters: { processing: [], solverExpression: '${response} + 1' }
      });
      start.codingScheme = JSON.stringify(scheme);
      const frame = await loadEmbeddedSchemer(page, start);
      await frame.getByRole('button', { name: button, exact: true }).click();
      await expect(frame.getByRole('dialog')).toHaveCount(0);
      const saved = await page.evaluate(() => window.received
        .filter(message => message.type === 'vosSchemeChangedNotification').at(-1).codingScheme);
      const persisted = JSON.parse(saved);
      expect(persisted.variableCodings.find(coding => coding.id === 'caption').sourceType).toBe('BASE_NO_VALUE');
      const unrelated = persisted.variableCodings.find(coding => coding.id === 'unrelated');
      // eslint-disable-next-line no-template-curly-in-string
      expect(unrelated.sourceParameters.solverExpression).toBe('${Other} + 1');
      expect(CodingSchemeFactory.deriveValue(persisted.variableCodings, unrelated, [
        { id: 'response', value: 5, status: 'VALUE_CHANGED' }
      ])).toMatchObject({ value: 6, status: 'VALUE_CHANGED' });
      const recovered = persisted.variableCodings.find(coding => coding.id === 'derived');
      if (decision === 'TRANSFER') {
        expect(CodingSchemeFactory.deriveValue(persisted.variableCodings, recovered, [
          { id: 'current', value: 2, status: 'VALUE_CHANGED' },
          { id: 'response', value: 5, status: 'VALUE_CHANGED' }
        ])).toMatchObject({ value: 52, status: 'VALUE_CHANGED' });
      } else {
        expect(recovered.deriveSources).toEqual(['old-radio', 'response']);
      }

      const reopened = await loadEmbeddedSchemer(page, { ...start, codingScheme: saved });
      await expect(reopened.getByRole('dialog')).toHaveCount(0);
      await reopened.locator('.var-list-entry').filter({ hasText: 'Unrelated' }).click();
      await expect(reopened.locator('.missing-source-notice')).toHaveCount(0);
      await reopened.locator('var-coding .variable-details button').first().click();
      const sourceDialog = reopened.getByRole('dialog');
      const sourceName = sourceDialog.getByRole('textbox', { name: 'Name', exact: true });
      // Wait for Material's delayed initial focus before typing into another field.
      await expect(sourceName).toBeFocused();
      const sourceValue = sourceDialog.getByRole('textbox', { name: 'Other', exact: true });
      await sourceValue.fill('5');
      await expect(sourceValue).toHaveValue('5');
      await expect(sourceName).toHaveValue('Unrelated');
      await sourceDialog.getByRole('button', { name: 'Testen', exact: true }).click();
      await expect(sourceDialog.locator('.solver-test-result-ok')).toContainText('6');
    }
  );
});

test('orphan recovery saves a converging aggregate source only once and keeps it after reopen', async ({ page }) => {
  const start = makeOrphanStart();
  const scheme = JSON.parse(start.codingScheme);
  Object.assign(scheme.variableCodings[1], {
    sourceType: 'SUM_SCORE', deriveSources: ['old-radio', 'current'], sourceParameters: { processing: [] }
  });
  start.codingScheme = JSON.stringify(scheme);
  const frame = await loadEmbeddedSchemer(page, start);
  await frame.getByRole('button', { name: 'Kodierung übernehmen', exact: true }).click();
  await expect(frame.getByRole('dialog')).toHaveCount(0);
  const saved = await page.evaluate(() => window.received
    .filter(message => message.type === 'vosSchemeChangedNotification').at(-1).codingScheme);
  const persisted = JSON.parse(saved);
  const calculation = persisted.variableCodings.find(coding => coding.id === 'derived');
  expect(calculation.deriveSources).toEqual(['current']);
  expect(CodingSchemeFactory.deriveValue(persisted.variableCodings, calculation, [
    {
      id: 'current', value: 2, code: 1, score: 2, status: 'CODING_COMPLETE'
    }
  ])).toMatchObject({ value: 2, status: 'VALUE_CHANGED' });
  const reopened = await loadEmbeddedSchemer(page, { ...start, codingScheme: saved });
  await expect(reopened.getByRole('dialog')).toHaveCount(0);
  await reopened.locator('.var-list-entry').filter({ hasText: 'sum' }).click();
  await expect(reopened.locator('.missing-source-notice')).toHaveCount(0);
});

test('starting empty preserves dependants and saves the manually repaired source', async ({ page }) => {
  const start = makeOrphanStart();
  const original = JSON.parse(start.codingScheme);
  // eslint-disable-next-line no-template-curly-in-string
  original.variableCodings[1].sourceParameters.solverExpression = '${old-radio} + 1';
  start.codingScheme = JSON.stringify(original);
  const frame = await loadEmbeddedSchemer(page, start);
  await frame.getByRole('button', { name: 'Neu beginnen und alte Kodierung löschen', exact: true }).click();
  await frame.locator('.var-list-entry').filter({ hasText: 'sum' }).click();
  await expect(frame.locator('.missing-source-notice')).toContainText('old-radio');
  await expect(frame.locator('.missing-source-notice')).toContainText('Formelausdruck');
  const reset = await page.evaluate(() => JSON.parse(window.received
    .filter(message => message.type === 'vosSchemeChangedNotification').at(-1).codingScheme));
  expect(reset.variableCodings).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: 'current', codes: [], manualInstruction: '' }),
    expect.objectContaining({ id: 'derived', deriveSources: ['old-radio'] })
  ]));
  expect(reset.variableCodings).toHaveLength(2);
  await frame.locator('var-coding .variable-details button').first().click();
  await frame.getByRole('combobox').first().click();
  await frame.getByRole('option', { name: '01', exact: true }).click();
  await page.keyboard.press('Escape');
  // eslint-disable-next-line no-template-curly-in-string
  await frame.locator('.solver-expression-field input').fill('${01} + 1');
  await frame.getByRole('textbox', { name: '01', exact: true }).fill('2');
  await frame.getByRole('button', { name: 'Testen', exact: true }).click();
  await expect(frame.locator('.solver-test-result-ok')).toContainText('3');
  await frame.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(frame.locator('.missing-source-notice')).toHaveCount(0);
  const saved = await page.evaluate(() => window.received
    .filter(message => message.type === 'vosSchemeChangedNotification').at(-1).codingScheme);
  expect(JSON.parse(saved).variableCodings.find(coding => coding.id === 'derived').deriveSources).toEqual(['current']);
  const persisted = JSON.parse(saved).variableCodings;
  expect(CodingSchemeFactory.deriveValue(persisted, persisted.find(coding => coding.id === 'derived'), [
    { id: 'current', value: 2, status: 'VALUE_CHANGED' }
  ])).toMatchObject({ value: 3, status: 'VALUE_CHANGED' });
  const reopened = await loadEmbeddedSchemer(page, { ...start, codingScheme: saved });
  await reopened.locator('.var-list-entry').filter({ hasText: 'sum' }).click();
  await expect(reopened.locator('.missing-source-notice')).toHaveCount(0);
});

test('multiple old codings support manual cleanup, cancellation and explicit transfer', async ({ page }) => {
  const start = makeOrphanStart();
  const scheme = JSON.parse(start.codingScheme);
  scheme.variableCodings.push({
    ...scheme.variableCodings[0], id: 'older-radio', manualInstruction: '<p>Selected older instructions</p>'
  });
  start.codingScheme = JSON.stringify(scheme);
  const frame = await loadEmbeddedSchemer(page, start);
  const transfer = frame.getByRole('button', { name: 'Kodierung übernehmen', exact: true });
  const old = frame.locator('.coding-summary').filter({ hasText: 'Alte technische ID: old-radio' });
  await expect(transfer).toBeDisabled();
  await expect(frame.locator('details, pre')).toHaveCount(0);
  await old.getByRole('button', { name: 'Alte Kodierung zum Löschen vormerken', exact: true }).click();
  await expect(transfer).toBeEnabled();
  await old.getByRole('button', { name: 'Rückgängig', exact: true }).click();
  await expect(transfer).toBeDisabled();
  await old.getByRole('button', { name: 'Alte Kodierung zum Löschen vormerken', exact: true }).click();
  await frame.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  expect(await page.evaluate(() => window.received
    .filter(message => message.type === 'vosSchemeChangedNotification'))).toEqual([]);
  await frame.getByRole('button', { name: 'Konflikte prüfen', exact: true }).click();
  await expect(transfer).toBeDisabled();
  await page.locator('iframe').evaluate(element => element.setAttribute('style', 'width:375px;height:600px'));
  await expect.poll(async () => (await frame.getByRole('dialog').boundingBox())?.width ?? Infinity)
    .toBeLessThanOrEqual(375);
  await old.getByRole('button', { name: 'Alte Kodierung zum Löschen vormerken', exact: true }).click();
  await transfer.click();
  await expect(frame.getByRole('dialog')).toHaveCount(0);
  const changes = await page.evaluate(() => window.received
    .filter(message => message.type === 'vosSchemeChangedNotification'));
  expect(changes).toHaveLength(1);
  const saved = changes[0].codingScheme;
  expect(JSON.parse(saved).variableCodings).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: 'current', manualInstruction: '<p>Selected older instructions</p>' }),
    expect.objectContaining({ id: 'derived', deriveSources: ['old-radio'] })
  ]));
  expect(JSON.parse(saved).variableCodings).toHaveLength(2);
  const reopened = await loadEmbeddedSchemer(page, { ...start, codingScheme: saved });
  await expect(reopened.getByRole('dialog')).toHaveCount(0);
  await reopened.locator('.var-list-entry').filter({ hasText: 'sum' }).click();
  await expect(reopened.locator('.missing-source-notice')).toContainText('old-radio');
});

test('embedded Schemer cancels an instruction dialog when the host changes task', async ({ page }) => {
  const frame = await loadEmbeddedSchemer(page);
  await expect(frame.locator('.var-list-entry')).toHaveCount(2);
  await frame.locator('var-coding .manual-instruction button').first().click();
  await frame.locator('.ProseMirror').fill('Instruction for previous task only');
  await page.evaluate(message => document.querySelector('iframe').contentWindow.postMessage(message, '*'), {
    ...makeStart([makeVariable('next_task')]), sessionId: 'next-task'
  });
  await expect(frame.locator('.var-list-entry')).toHaveText(['next_task']);
  await expect(frame.getByRole('dialog')).toHaveCount(0);
  await expect(frame.locator('var-coding .instructions')).not.toContainText('Instruction for previous task only');
  const label = frame.locator('var-coding .variable-details input').first();
  await label.fill('Next task remains editable');
  await expect.poll(() => page.evaluate(() => {
    const message = window.received.filter(m => m.type === 'vosSchemeChangedNotification').at(-1);
    return message && { sessionId: message.sessionId, codings: JSON.parse(message.codingScheme).variableCodings };
  })).toMatchObject({
    sessionId: 'next-task',
    codings: [{ id: 'next_task', label: 'Next task remains editable', manualInstruction: '' }]
  });
});

test('embedded Schemer cancels deactivation when the host changes task', async ({ page }) => {
  const frame = await loadEmbeddedSchemer(page);
  await expect(frame.locator('.var-list-entry')).toHaveCount(2);
  await frame.locator('.coding-actions button').filter({
    has: frame.locator('mat-icon').getByText('cancel', { exact: true })
  }).click();
  await expect(frame.getByRole('dialog')).toBeVisible();
  await page.evaluate(message => document.querySelector('iframe').contentWindow.postMessage(message, '*'), {
    ...makeStart([makeVariable('next_1'), makeVariable('next_2')]), sessionId: 'next-task'
  });
  await expect(frame.locator('.var-list-entry')).toHaveText(['next_1', 'next_2']);
  await expect(frame.getByRole('dialog')).toHaveCount(0);
  await frame.locator('var-coding .variable-details input').first().fill('Still active');
  await expect.poll(() => page.evaluate(() => {
    const message = window.received.filter(m => m.type === 'vosSchemeChangedNotification').at(-1);
    return message ? JSON.parse(message.codingScheme).variableCodings.map(coding => coding.sourceType) : [];
  })).toEqual(['BASE', 'BASE']);
});

test('embedded Schemer closes nested formula dialogs when their task is replaced', async ({ page }) => {
  const frame = await loadEmbeddedSchemer(page);
  await expect(frame.locator('.var-list-entry')).toHaveCount(2);
  await frame.locator('var-coding .manual-instruction button').first().click();
  await frame.locator('aspect-rich-text-editor button').filter({
    has: frame.locator('mat-icon').getByText('functions', { exact: true })
  }).click();
  await expect(frame.getByRole('dialog')).toHaveCount(2);
  await page.evaluate(message => document.querySelector('iframe').contentWindow.postMessage(message, '*'), {
    ...makeStart([makeVariable('next_task')]), sessionId: 'next-task'
  });
  await expect(frame.locator('.var-list-entry')).toHaveText(['next_task']);
  await expect(frame.getByRole('dialog')).toHaveCount(0);
});

test('embedded Schemer rejects pending dialog edits after the host revokes write access', async ({ page }) => {
  const frame = await loadEmbeddedSchemer(page);
  await expect(frame.locator('.var-list-entry')).toHaveCount(2);
  await frame.locator('var-coding .manual-instruction button').first().click();
  await frame.locator('.ProseMirror').fill('Must not be applied after read-only transition');
  await page.evaluate(
    message => document.querySelector('iframe').contentWindow.postMessage(message, '*'),
    makeStart([makeVariable('response_1'), makeVariable('response_2')], 'guest')
  );
  await expect(frame.getByRole('dialog')).toHaveCount(0);
  await expect(frame.locator('var-coding .variable-details input').first()).toBeDisabled();
  await expect(frame.locator('var-coding .instructions')).not.toContainText('Must not be applied');
});

test('embedded Schemer restores copied codes after reopening without interrupting rendering', async ({ page }) => {
  const frame = await loadEmbeddedSchemer(page);
  await expect(frame.locator('.var-list-entry')).toHaveCount(2);
  await frame.locator('.add-code-actions button').first().click();
  await expect(frame.locator('single-code')).toHaveCount(1);
  await frame.locator('single-code .copy-code').click();

  // Studio replaces the iframe when reopening the module; sessionStorage survives that navigation.
  await page.reload();
  await expect(frame.locator('.var-list-entry')).toHaveCount(2);
  await expect(frame.locator('codes-title h2')).toHaveText('Codes');
  const paste = frame.locator('codes-title button').filter({
    has: frame.locator('mat-icon').getByText('content_paste', { exact: true })
  });
  await expect(paste).toBeEnabled();
  await paste.click();
  await expect(frame.locator('single-code')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => {
    const changed = window.received.filter(message => message.type === 'vosSchemeChangedNotification').at(-1);
    return changed ? JSON.parse(changed.codingScheme).variableCodings[0].codes[0]?.type : null;
  })).toBe('FULL_CREDIT');

  const label = frame.locator('var-coding .variable-details input').first();
  await label.fill('Edited after clipboard restoration');
  await label.press('Tab');
  await expect.poll(() => page.evaluate(() => {
    const changed = window.received.filter(message => message.type === 'vosSchemeChangedNotification').at(-1);
    return changed ? JSON.parse(changed.codingScheme).variableCodings[0].label : null;
  })).toBe('Edited after clipboard restoration');
});

test('embedded Schemer preserves value and no-value variables from a Studio unit', async ({ page }) => {
  const variables = process.env.STUDIO_VARIABLES_FILE
    ? JSON.parse(await fs.readFile(process.env.STUDIO_VARIABLES_FILE, 'utf8'))
    : ['first', 'second'].flatMap(suffix => [
      { ...makeVariable(`text_${suffix}`), type: 'no-value' },
      {
        ...makeVariable(`radio_${suffix}`),
        type: 'integer',
        valuesComplete: true,
        values: [1, 2, 3, 4].map(value => ({ value, label: `Option ${value}` }))
      }
    ]);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const frame = await loadEmbeddedSchemer(page, makeStart(variables));
  const values = variables.filter(variable => variable.type !== 'no-value');
  await expect(frame.locator('.var-list-entry')).toHaveText(
    values.map(variable => variable.alias || variable.id).sort()
  );

  await frame.locator('var-coding .variable-details input').first().fill('Studio migration regression');
  await frame.locator('var-coding .variable-details input').first().press('Tab');
  await expect.poll(() => page.evaluate(() => {
    const changed = window.received.filter(message => message.type === 'vosSchemeChangedNotification').at(-1);
    return changed ? JSON.parse(changed.codingScheme).variableCodings.map(variable => ({
      id: variable.id, alias: variable.alias, sourceType: variable.sourceType
    })).sort((a, b) => a.id.localeCompare(b.id)) : [];
  })).toEqual(variables.map(variable => ({
    id: variable.id,
    alias: variable.alias || variable.id,
    sourceType: variable.type === 'no-value' ? 'BASE_NO_VALUE' : 'BASE'
  })).sort((a, b) => a.id.localeCompare(b.id)));
  expect(errors).toEqual([]);
});

test('embedded Schemer destroys rich text editors after save, cancel and Escape', async ({ page }) => {
  const frame = await loadEmbeddedSchemer(page);
  await expect(frame.locator('.var-list-entry')).toHaveCount(2);

  for (const action of ['Speichern', 'Abbrechen', 'Escape']) {
    await frame.locator('var-coding .manual-instruction button').first().click();
    const content = frame.locator('.ProseMirror');
    const editor = await content.evaluateHandle(element => element.editor);
    await content.fill(`Instruction closed with ${action}`);

    if (action === 'Escape') {
      await frame.getByRole('dialog').press('Escape');
    } else {
      await frame.getByRole('button', { name: action, exact: true }).click();
    }

    await expect(frame.getByRole('dialog')).toHaveCount(0);
    expect(await editor.evaluate(instance => instance.isDestroyed), action).toBe(true);
    await editor.dispose();
  }
});

test('embedded Schemer saves rich text and an asynchronous image and discards cancelled edits', async ({ page }) => {
  const frame = await loadEmbeddedSchemer(page);
  await expect(frame.locator('.var-list-entry')).toHaveCount(2);
  await frame.locator('var-coding .manual-instruction button').first().click();
  const editor = frame.locator('.ProseMirror');
  await editor.fill('Instruction before image');
  const pixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=';
  const chooser = page.waitForEvent('filechooser');
  await frame.locator('aspect-rich-text-editor button').filter({
    has: frame.locator('mat-icon').getByText('image', { exact: true })
  }).click();
  await (await chooser).setFiles({
    name: 'pixel.png',
    mimeType: 'image/png',
    buffer: Buffer.from(pixel, 'base64')
  });
  await expect(editor.locator('img[src^="data:image/png;base64,"]')).toHaveCount(1);
  await frame.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(frame.locator('var-coding .instructions img')).toHaveCount(1);
  await frame.locator('var-coding .manual-instruction button').first().click();
  await expect(editor.locator('img[src^="data:image/png;base64,"]')).toHaveCount(1);
  await editor.locator('p').first().click();
  await editor.press('Home');
  await frame.locator('aspect-rich-text-editor button').filter({
    has: frame.locator('mat-icon').getByText('functions', { exact: true })
  }).click();
  const formulaDialog = frame.getByRole('dialog').last();
  await formulaDialog.locator('math-field').pressSequentially('x+1');
  await expect(formulaDialog.locator('.preview .katex')).toBeVisible();
  await formulaDialog.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(editor.locator('.iqb-math-formula')).toHaveCount(1);
  await expect(editor.locator('img[src^="data:image/png;base64,"]')).toHaveCount(1);
  await frame.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(frame.locator('var-coding .instructions')).toContainText('Instruction before image');
  await expect(frame.locator('var-coding .instructions img')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => {
    const changed = window.received.filter(message => message.type === 'vosSchemeChangedNotification').at(-1);
    return changed ? JSON.parse(changed.codingScheme).variableCodings[0].manualInstruction : '';
  })).toContain('data:image/png;base64,');

  await frame.locator('var-coding .manual-instruction button').first().click();
  await editor.fill('Discard this change');
  await frame.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await expect(frame.locator('var-coding .instructions')).toContainText('Instruction before image');
  await expect(frame.locator('var-coding .instructions')).not.toContainText('Discard this change');
});

test('embedded Schemer safely dismisses a derived-variable dialog with Escape', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /ERROR|TypeError|ReferenceError/.test(message.text())) {
      errors.push(message.text());
    }
  });
  const frame = await loadEmbeddedSchemer(page);
  await expect(frame.locator('.var-list-entry')).toHaveCount(2);
  await frame.locator('.var-list-buttons button').first().click();
  await expect(frame.getByRole('dialog')).toBeVisible();
  await frame.getByRole('dialog').press('Escape');
  await expect(frame.getByRole('dialog')).toHaveCount(0);
  await expect(frame.locator('.var-list-entry')).toHaveText(['response_1', 'response_2']);
  await page.evaluate(() => new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  expect(errors).toEqual([]);
});

test('embedded Schemer keeps a base variable when its deactivation is dismissed', async ({ page }) => {
  const frame = await loadEmbeddedSchemer(page);
  await expect(frame.locator('.var-list-entry')).toHaveCount(2);
  await frame.locator('.coding-actions button').filter({
    has: frame.locator('mat-icon').getByText('cancel', { exact: true })
  }).click();
  await expect(frame.getByRole('dialog')).toBeVisible();
  await frame.getByRole('dialog').press('Escape');
  await expect(frame.getByRole('dialog')).toHaveCount(0);

  const label = frame.locator('var-coding .variable-details input').first();
  await label.fill('After cancelled deactivation');
  await label.press('Tab');
  await expect.poll(() => page.evaluate(() => {
    const changed = window.received.filter(message => message.type === 'vosSchemeChangedNotification').at(-1);
    return changed ? JSON.parse(changed.codingScheme).variableCodings.map(variable => ({
      id: variable.id, sourceType: variable.sourceType
    })).sort((a, b) => a.id.localeCompare(b.id)) : [];
  })).toEqual([
    { id: 'response_1', sourceType: 'BASE' },
    { id: 'response_2', sourceType: 'BASE' }
  ]);
  await expect(frame.locator('.var-list-entry')).toHaveCount(2);
});

test('embedded Schemer saves source selections in the migrated Material dialog', async ({ page }) => {
  const frame = await loadEmbeddedSchemer(page);
  await expect(frame.locator('.var-list-entry')).toHaveCount(2);
  await frame.locator('.var-list-buttons button').first().click();
  const dialog = frame.getByRole('dialog');
  await dialog.getByLabel('Name', { exact: true }).fill('DerivedSum');
  await dialog.getByRole('combobox', { name: 'Quell-Variablen' }).click();
  await frame.getByRole('option', { name: 'response_1', exact: true }).click();
  await frame.getByRole('option', { name: 'response_2', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(dialog.getByRole('combobox', { name: 'Quell-Variablen' })).toContainText('(2)');
  await dialog.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(frame.locator('.var-list-entry').filter({ hasText: 'DerivedSum' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const changed = window.received.filter(message => message.type === 'vosSchemeChangedNotification').at(-1);
    if (!changed) return null;
    const coding = JSON.parse(changed.codingScheme).variableCodings.find(variable => variable.alias === 'DerivedSum');
    return coding ? { sourceType: coding.sourceType, sources: coding.deriveSources } : null;
  })).toEqual({ sourceType: 'SUM_SCORE', sources: ['response_1', 'response_2'] });
});

// SOLVER references deliberately use literal ${...} tokens.
/* eslint-disable no-template-curly-in-string */
[
  { expression: 'sum([${response_1},1,2])', value: '3', result: '6' },
  { expression: 'abs(complex(${response_1},4))', value: '3', result: '5' },
  { expression: 'number(unit(${response_1},"cm"),"mm")', value: '3', result: '30' },
  { expression: 'number(bignumber("0.1")+bignumber("0.2"))', value: '3', result: '0.3' },
  { expression: 'ceil(${response_1})', value: '0.000000000000001', result: '0' },
  { expression: '${response_1}==0 ? 1:0', value: '0.000000000000001', result: '1' }
].forEach(({ expression, value, result }) => {
  test(`embedded Schemer preserves full SOLVER semantics: ${expression}`, async ({ page }) => {
    const frame = await loadEmbeddedSchemer(page);
    await expect(frame.locator('.var-list-entry')).toHaveCount(2);
    await frame.locator('.var-list-buttons button').first().click();
    const dialog = frame.getByRole('dialog');
    await dialog.getByLabel('Name', { exact: true }).fill('SolverCheck');
    await dialog.getByRole('combobox', { name: 'Quell-Variablen' }).click();
    await frame.getByRole('option', { name: 'response_1', exact: true }).click();
    await page.keyboard.press('Escape');
    await dialog.getByRole('combobox', { name: 'Ableitungsmethode' }).click();
    await frame.getByRole('option', { name: 'Mathematischer Ausdruck (Solver)', exact: true }).click();
    await dialog.getByLabel('Ausdruck für Solver', { exact: true }).fill(expression);
    await dialog.locator('.solver-test-values').getByLabel('response_1', { exact: true }).fill(value);
    await dialog.getByRole('button', { name: 'Testen', exact: true }).click();
    await expect(dialog.locator('.solver-test-result-ok')).toHaveText(`Ergebnis: ${result}`);
  });
});
/* eslint-enable no-template-curly-in-string */
