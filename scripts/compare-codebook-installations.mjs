// Runs real host preparation and adapters against in-memory persistence boundaries.
// Does not replace an HTTP/browser/Redis acceptance run.
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { load } from 'cheerio';
import { optionMatrix, selectionCorpus, missingCases, expectedSelection, defaults, referenceCorpus, referenceOptions } from './fixtures/codebook-synthetic.mjs';
import { whitespaceReferenceCases, whitespaceReferenceUnits } from './fixtures/codebook-whitespace.mjs';
import { docxParts, partHashes, originalStudioCompatibleParts } from './codebook-docx-test-utils.mjs';

const [studioPath, boxPath, outputPath] = process.argv.slice(2);
if (!studioPath || !boxPath || !outputPath) throw new Error('Usage: node scripts/compare-codebook-installations.mjs STUDIO_ROOT BOX_ROOT OUTPUT_DIR');
const localRequire = createRequire(import.meta.url);
const ts = localRequire('typescript');
async function hostModule(root, path, overrides = {}) {
  const filename = join(root, path);
  const require = createRequire(filename);
  const source = await readFile(filename, 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS, esModuleInterop: true, experimentalDecorators: true } }).outputText;
  const mod = new Module(filename);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(root);
  mod.require = name => overrides[name] || require(name);
  mod._compile(output, filename);
  return mod.exports;
}
const studio = resolve(studioPath);
const box = resolve(boxPath);
const output = resolve(outputPath);
await mkdir(output, { recursive: true });
const Studio = (await hostModule(studio, 'apps/api/src/app/classes/download-workspaces.class.ts', {
  '@studio-lite/shared-code': { isCurrentFromOrder: order => order === 0 } // unrelated metadata reports, never called here
})).DownloadWorkspacesClass;
const boxAdapter = await hostModule(box, 'apps/backend/src/app/admin/code-book/codebook-generator.class.ts');
// Entity constructors are DI tokens only. Repositories/profiles supply source
// records in host format; the production service, scope handling and adapters run.
const Service = (await hostModule(box, 'apps/backend/src/app/database/services/coding/codebook-generation.service.ts', {
  '../../entities/file_upload.entity': { default: class FileUpload {} },
  '../../entities/job-definition.entity': { JobDefinition: class JobDefinition {} },
  '../../entities/variable-bundle.entity': { VariableBundle: class VariableBundle {} },
  './missings-profiles.service': { MissingsProfilesService: class MissingsProfilesService {} },
  '../../../admin/code-book/codebook-generator.class': boxAdapter
})).CodebookGenerationService;
const corpus = selectionCorpus();
const rows = corpus.rows.filter(({ variable }) => variable.sourceType === 'BASE' ||
  (variable.id.endsWith('_MIXED') && ['SUM_SCORE', 'BASE_NO_VALUE'].includes(variable.sourceType)));
const rawUnits = [{ ...corpus.units[1], scheme: JSON.stringify({ version: '3.4', variableCodings: rows.map(r => r.variable).reverse() }),
  metadata: { items: rows.map(({ variable }) => ({ id: `ITEM_${variable.id}`, variableId: variable.id })) } }];
let currentUnits = rawUnits;
const service = new Service({ find: async query => {
  assert.equal(query.where.workspace_id, 42);
  return currentUnits.map(unit => ({ id: unit.id, file_id: `${unit.key}.VOCS`, filename: `${unit.name}.vocs`, data: unit.scheme,
    structured_data: { metadata: unit.metadata } }));
} }, { findOne: async () => { throw new Error('Unexpected job definition lookup'); } },
{ find: async () => { throw new Error('Unexpected bundle lookup'); } },
{ getMissingsProfileDetails: async (workspace, id) => {
  assert.equal(workspace, 42); assert.equal(id, 7);
  return { missings: currentMissings };
} });
// The logger is not part of generation; keep the 2304-case comparison readable.
service.logger = { log() {}, warn() {}, error(...args) { throw new Error(args.join(' ')); } };
let currentMissings = [];
let comparisons = 0;
const wordCases = [];
async function compare(options, missings, save = false, suffix = '', reference = null) {
  currentMissings = missings;
  const current = { ...options, missingsProfile: missings.length ? 'Synthetic profile' : '' };
  const ids = currentUnits.map(unit => unit.id);
  const a = await Studio.getWorkspaceCodingBook(42, { findAllWithProperties: async () => currentUnits },
    { findMissingsProfiles: async () => [{ id: 7, label: 'Synthetic profile', missings: JSON.stringify(missings) }] }, current, ids);
  const b = await service.generateCodebook(42, missings.length ? 7 : 0, current, ids);
  assert.ok(b, 'Box service must return a file');
  if (current.exportFormat === 'json') {
    assert.deepEqual(JSON.parse(a.toString()), JSON.parse(b.toString()), 'Studio preparation vs Box service + adapter');
    if (reference) assert.deepEqual(JSON.parse(a.toString()), reference.json, 'installed host vs original Studio JSON');
    else assert.deepEqual(JSON.parse(a.toString())[0].variables.map(({ id, codes }) => ({ id, codes: codes.map(c => c.id) })), expectedSelection(rows, options));
  } else {
    const aParts = await docxParts(a);
    const bParts = await docxParts(b);
    assert.deepEqual(partHashes(aParts), partHashes(bParts), 'complete DOCX parts including images/relationships/footer/styles');
    if (reference) assert.deepEqual(partHashes(originalStudioCompatibleParts(aParts)), reference.docxParts, 'installed host vs original Studio DOCX');
    const $ = load(aParts['word/document.xml'], { xml: true });
    assert.equal($('w\\:body').children('w\\:p').toArray().some(p => /^\s+$/.test($(p).find('w\\:t').text())), false);
    if (save) {
      wordCases.push({ suffix, columns: options.showScore ? 4 : 3, tables: $('w\\:tbl').length,
        hasMissingZero: missings.some(m => String(m.code) === '0'),
        images: $('w\\:drawing').length, formulas: $('m\\:oMath').length,
        variableHeadings: $('w\\:pStyle').filter((_, e) => $(e).attr('w:val') === 'Heading2').length });
    }
  }
  if (save) {
    await writeFile(join(output, `studio${suffix}.${current.exportFormat}`), a);
    await writeFile(join(output, `kodierbox${suffix}.${current.exportFormat}`), b);
  }
  comparisons += 1;
}
for (const options of optionMatrix()) {
  for (const missings of missingCases) for (const exportFormat of ['json', 'docx']) await compare({ ...options, exportFormat }, missings);
  if (comparisons % 600 === 0) console.log(`${comparisons} host export pairs compared`);
}
for (const exportFormat of ['json', 'docx']) await compare({ ...defaults, hideItemVarRelation: false, exportFormat }, missingCases[1], true);
currentUnits = referenceCorpus();
const references = JSON.parse(await readFile(new URL('./fixtures/studio-codebook/synthetic-reference.json', import.meta.url), 'utf8')).cases;
for (const showScore of [false, true]) {
  const options = { ...[...referenceOptions()].at(-1), showScore };
  const reference = references.find(entry => JSON.stringify(entry.options) === JSON.stringify(options));
  assert.ok(reference, 'original Studio reference must exist');
  for (const exportFormat of ['json', 'docx']) await compare({ ...options, exportFormat },
    [{ code: 99, label: 'Missing', description: 'Keine Antwort' }], true, showScore ? '-rich-scores' : '-rich-no-scores', reference);
}
const whitespaceReferences = JSON.parse(await readFile(new URL('./fixtures/studio-codebook/whitespace-reference.json', import.meta.url), 'utf8')).cases;
let whitespaceCases = 0;
for (const entry of whitespaceReferenceCases()) {
  const reference = whitespaceReferences[whitespaceCases++];
  assert.deepEqual({ id: reference.id, html: reference.html, text: reference.text, options: reference.options }, entry);
  currentUnits = whitespaceReferenceUnits(entry.html);
  for (const exportFormat of ['json', 'docx']) await compare({ ...entry.options, exportFormat }, [], false, '', reference);
}
assert.equal(whitespaceCases, whitespaceReferences.length);
await writeFile(join(output, 'word-expectations.json'), JSON.stringify({ cases: wordCases }, null, 2));
const roots = [studio, box];
const artifacts = await Promise.all(roots.map(async root => {
  const lock = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'));
  return lock.packages['node_modules/@iqb/ngx-coding-components'].integrity;
}));
assert.equal(artifacts[0], artifacts[1], 'both installed artifacts must have the same integrity');
await writeFile(join(output, 'installation-comparison.json'), JSON.stringify({ hostExportPairs: comparisons, optionCombinations: 768,
  missingCases: 3, formats: 2, originalStudioWhitespaceCases: whitespaceCases,
  identicalJson: true, identicalAllDocxParts: true, artifactIntegrity: artifacts[0],
  realHostAdapters: true, inMemoryRepositories: true, httpBrowserRedis: false, windowsWord: false }, null, 2));
console.log(`PASS: ${comparisons} export pairs through real Studio and Box preparation/adapters.`);
