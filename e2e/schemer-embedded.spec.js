const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const veronaSchema = require('./fixtures/verona/schemer-3.2.0.json');
const variableSchema = require('./fixtures/verona/variable-info-1.3.json');
const studioStart = require('./fixtures/verona/studio-start-command.json');

const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv, ['date-time']);
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

async function loadEmbeddedSchemer(page, start = makeStart([makeVariable('response_1'), makeVariable('response_2')])) {
  expectVeronaMessage(start);
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
