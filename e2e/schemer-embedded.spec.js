const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');

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

async function loadEmbeddedSchemer(page) {
  if (process.env.SCHEMER_ARTIFACT) {
    const artifact = await fs.readFile(process.env.SCHEMER_ARTIFACT, 'utf8');
    await page.route('**/schemer-artifact.html', route => route.fulfill({
      contentType: 'text/html', body: artifact
    }));
  }
  const src = process.env.SCHEMER_ARTIFACT ? '/schemer-artifact.html' : '/';
  const start = makeStart([makeVariable('response_1'), makeVariable('response_2')]);
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
            setTimeout(() => frame.contentWindow.postMessage(${JSON.stringify(start)}, '*'), 100);
          }
        });
      </script>
    </body></html>`
  }));
  await page.goto('/studio-host.html');
  return page.frameLocator('iframe');
}

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
