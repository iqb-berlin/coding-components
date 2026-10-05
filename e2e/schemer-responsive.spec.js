/* Browser interactions in a scenario must run sequentially. */
/* eslint-disable no-await-in-loop, no-restricted-syntax */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');

const variables = Array.from({ length: 30 }, (_, i) => ({
  id: `v_${i + 1}`,
  type: 'string',
  format: '',
  multiple: true,
  nullable: false,
  values: [],
  valuePositionLabels: []
}));

const scheme = {
  version: '3.4',
  variableCodings: [{
    id: 'v_1',
    alias: 'v_1',
    label: 'Testvariable',
    page: '',
    sourceType: 'BASE',
    processing: [],
    codeModel: 'MANUAL_AND_RULES',
    manualInstruction: '<p>Allgemeine Kodieranweisung</p>',
    codes: [{
      id: 1,
      type: 'FULL_CREDIT',
      score: 1,
      label: '',
      manualInstruction: '<p>Richtige Antwort</p>',
      ruleSetOperatorAnd: false,
      ruleSets: [0, 1].map(valueArrayPos => ({
        valueArrayPos,
        ruleOperatorAnd: false,
        rules: [
          { method: 'MATCH', parameters: ['richtig'] },
          { method: 'NUMERIC_FULL_RANGE', parameters: ['1', '5'] }
        ]
      }))
    }]
  }]
};

async function loadJson(page, menuLabel, name, data) {
  await page.locator('schemer-standalone-menu button').click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('menuitem', { name: menuLabel, exact: true }).click();
  await (await chooser).setFiles({
    name,
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(data))
  });
}

async function loadEditor(page) {
  await page.goto('/');
  await loadJson(page, 'Variablenliste laden', 'variables.json', variables);
  await expect(page.locator('.var-list-entry')).toHaveCount(30);
  await loadJson(page, 'Antwortschema laden', 'scheme.json', scheme);
  await expect(page.locator('single-code')).toHaveCount(1);
}

async function expectContained(page) {
  const overflow = await page.locator('iqb-schemer').evaluate(root => {
    const bounds = root.getBoundingClientRect();
    return [...root.querySelectorAll('button, mat-form-field, mat-card, mat-button-toggle-group')]
      .filter(element => element.getClientRects().length > 0)
      .map(element => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName,
          text: element.textContent.trim(),
          left: rect.left,
          right: rect.right
        };
      })
      .filter(rect => rect.left < bounds.left - 1 || rect.right > bounds.right + 1);
  });
  expect(overflow).toEqual([]);
  const clippedToggles = await page.locator('mat-button-toggle-group').evaluateAll(groups => groups
    .filter(group => group.getClientRects().length > 0)
    .map(group => ({
      text: group.textContent.trim(),
      width: group.clientWidth,
      contentWidth: group.scrollWidth
    }))
    .filter(group => group.contentWidth > group.width + 1));
  expect(clippedToggles).toEqual([]);
  const editorOverflow = await page.locator('var-coding')
    .evaluate(element => element.scrollWidth - element.clientWidth);
  expect(editorOverflow).toBeLessThanOrEqual(1);
  const documentOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(documentOverflow).toBeLessThanOrEqual(1);
}

async function expectActionReachable(locator) {
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeInViewport();
  await locator.click({ trial: true });
}

for (const width of [320, 375, 768, 1011, 1024, 1440]) {
  test(`navigation, editor and actions remain usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await loadEditor(page);
    await expectContained(page);

    const nav = await page.locator('.navi-bar').boundingBox();
    const editor = await page.locator('var-coding').boundingBox();
    if (width <= 650) {
      expect(nav.y + nav.height).toBeLessThanOrEqual(editor.y + 1);
    } else {
      expect(nav.x + nav.width).toBeLessThanOrEqual(editor.x + 1);
    }

    await page.locator('.var-list-entry').filter({ hasText: /^\s*v_9\s*$/ }).click();
    await expect(page.locator('single-code')).toHaveCount(0);
    await page.locator('.var-list-entry').filter({ hasText: /^\s*v_1\s*$/ }).click();
    await expect(page.locator('single-code')).toHaveCount(1);
    await expectActionReachable(page.locator('.var-list-buttons button').last());
    await expectActionReachable(page.locator('.coding-actions button').last());
    await expectActionReachable(page.locator('.add-code-actions button').last());
    await expectActionReachable(page.locator('single-code .delete-code'));
    await expectActionReachable(page.locator('code-instruction button').first());
    const andOperator = page.locator('code-rule-list').first().getByRole('radio', { name: 'UND', exact: true });
    await andOperator.click();
    await expect(andOperator).toBeChecked();

    // Each code model must fit, including returning to the two-card view.
    for (const modelIndex of [1, 2, 0]) {
      await page.locator('.coding-actions mat-button-toggle').nth(modelIndex).click();
      await expectContained(page);
    }

    // Exercise actions that used to be clipped, and confirm the result can be saved.
    await page.locator('single-code .copy-code').click();
    await page.locator('codes-title button').first().click();
    await page.getByRole('button', { name: 'Trotzdem einfügen', exact: true }).click();
    await expect(page.locator('single-code')).toHaveCount(2);
    await page.locator('single-code .delete-code').last().click();
    await expect(page.locator('single-code')).toHaveCount(1);

    await page.locator('schemer-standalone-menu button').click();
    const download = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: 'Antwortschema speichern', exact: true }).click();
    const savedFile = await download;
    expect(savedFile.suggestedFilename()).toBe('coding-scheme.json');
    const savedScheme = JSON.parse(await fs.readFile(await savedFile.path(), 'utf8'));
    const savedVariable = savedScheme.variableCodings.find(variable => variable.id === 'v_1');
    expect(savedVariable.codeModel).toBe('MANUAL_AND_RULES');
    expect(savedVariable.codes).toHaveLength(1);
    expect(savedVariable.codes[0].ruleSets).toHaveLength(2);
    expect(savedVariable.codes[0].ruleSets[0].ruleOperatorAnd).toBe(true);
  });
}

test('a narrow container reflows inside a wide host and after resizing', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loadEditor(page);
  for (const width of [375, 768, 1011, 1024, 1440]) {
    await page.locator('iqb-schemer').evaluate((element, containerWidth) => {
      element.style.setProperty('width', `${containerWidth}px`);
    }, width);
    await expectContained(page);
    const nav = await page.locator('.navi-bar').boundingBox();
    const editor = await page.locator('var-coding').boundingBox();
    if (width === 375) {
      expect(nav.y + nav.height).toBeLessThanOrEqual(editor.y + 1);
    } else {
      expect(nav.x + nav.width).toBeLessThanOrEqual(editor.x + 1);
    }
    await expectActionReachable(page.locator('single-code .delete-code'));
  }
});
