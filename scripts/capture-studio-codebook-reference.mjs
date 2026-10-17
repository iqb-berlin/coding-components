// Explicit maintainer operation, never run by CI. Requires a Studio checkout with
// the immutable pre-harmonisation commit; generates only invented fixture data.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire, Module } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { referenceCorpus, referenceOptions } from './fixtures/codebook-synthetic.mjs';
import { whitespaceReferenceCases, whitespaceReferenceUnits } from './fixtures/codebook-whitespace.mjs';
import { docxParts, partHashes } from './codebook-docx-test-utils.mjs';

const studio = process.argv[2];
if (!studio) throw new Error('Usage: node scripts/capture-studio-codebook-reference.mjs /path/to/studio-checkout');
const ref = '2504265721a59c7c65425072951ce82ab16f0fb8';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = path => execFileSync('git', ['show', `${ref}:${path}`], { cwd: studio, encoding: 'utf8' });
const baselineLock = JSON.parse(source('package-lock.json'));
for (const name of ['docx', '@iqb/responses', 'mathml2omml', 'cheerio', '@iqbspecs/coding-scheme']) {
  const installed = JSON.parse(await readFile(new URL(`../node_modules/${name}/package.json`, import.meta.url), 'utf8'));
  assert.equal(installed.version, baselineLock.packages[`node_modules/${name}`].version,
    `Reference capture requires the original Studio dependency version: ${name}`);
}
const math = await import('mathml2omml');
function compile(code, overrides = {}) {
  const output = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const mod = new Module(import.meta.filename);
  mod.filename = import.meta.filename;
  mod.paths = Module._nodeModulePaths(new URL('..', import.meta.url).pathname);
  mod.require = name => overrides[name] || require(name);
  mod._compile(output, mod.filename);
  return mod.exports;
}
const colors = compile(source('apps/api/src/app/utils/web-colors.ts'));
const renderer = compile(source('apps/api/src/app/classes/download-docx.class.ts'), {
  mathml2omml: math, '../utils/web-colors': colors
}).DownloadDocx;
const dataSource = source('apps/api/src/app/classes/download-workspaces.class.ts');
const ast = ts.createSourceFile('baseline.ts', dataSource, ts.ScriptTarget.Latest, true);
const cls = ast.statements.find(node => ts.isClassDeclaration(node) && node.name.text === 'DownloadWorkspacesClass');
const names = new Set(['isClosed', 'isManual', 'getCodeInfo', 'getCodeInfoFromCodeAsText', 'getRulesDescription',
  'getBaseOrDerivedBookVariable', 'getCodes', 'getManualOrClosedCodedBookVariable', 'getBookVariable',
  'getCodeBookDataForUnit', 'getBookVariables', 'getSortedBookVariables']);
const methods = cls.members.filter(node => node.name && names.has(node.name.getText(ast))).map(node => node.getText(ast));
assert.equal(methods.length, names.size);
const adapter = compile(`import { ToTextFactory } from '@iqb/responses'; import { CodingScheme } from '@iqbspecs/coding-scheme';
  export class DownloadWorkspacesClass { ${methods.join('\n')} }`).DownloadWorkspacesClass;
const cases = [];
for (const options of referenceOptions()) {
  const data = referenceCorpus().map(unit => adapter.getCodeBookDataForUnit(unit, options,
    [{ code: 99, label: 'Missing', description: 'Keine Antwort' }]));
  const json = data.map(({ key, name, variables, missings }) => ({ key, name, variables, missings }));
  const parts = await docxParts(await renderer.getDocXCodebook(data, options));
  cases.push({ options, json, docxParts: partHashes(parts) });
}
const fixture = { source: `iqb-berlin/studio-lite@${ref}`, docx: '8.5.0', responses: '5.2.2',
  normalization: ['footer date', 'IQB-Studio Codebook -> IQB Codebook', 'exclude docProps/core.xml timestamps',
    'random media filenames in first-reference order; image bytes and relationships preserved'], cases };
await writeFile(new URL('./fixtures/studio-codebook/synthetic-reference.json', import.meta.url), `${JSON.stringify(fixture, null, 2)}\n`);
console.log(`Captured ${cases.length} original Studio JSON/DOCX cases from raw invented schemas.`);

const whitespaceCases = [];
for (const entry of whitespaceReferenceCases()) {
  const data = whitespaceReferenceUnits(entry.html).map(unit => adapter.getCodeBookDataForUnit(unit, entry.options, []));
  const json = data.map(({ key, name, variables, missings }) => ({ key, name, variables, missings }));
  const parts = await docxParts(await renderer.getDocXCodebook(data, entry.options));
  whitespaceCases.push({ ...entry, json, docxParts: partHashes(parts) });
}
await writeFile(new URL('./fixtures/studio-codebook/whitespace-reference.json', import.meta.url),
  `${JSON.stringify({ ...fixture, cases: whitespaceCases }, null, 2)}\n`);
console.log(`Captured ${whitespaceCases.length} original Studio spacing cases for code and general instructions.`);
