// Run with: node scripts/analyze-mathjs-bundle.mjs
// Probes are isolated; installed packages and production build settings stay unchanged.
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = await mkdtemp(join(tmpdir(), 'schemer-mathjs-'));
const sizes = {};
const responsesManifest = createRequire(import.meta.url)('@iqb/responses/package.json');

async function bundle(name, contents, plugins = []) {
  const result = await build({
    stdin: { contents, resolveDir: root, sourcefile: `${name}.js` },
    bundle: true, minify: true, platform: 'browser', format: 'esm',
    target: 'es2022', write: false, plugins
  });
  sizes[name] = result.outputFiles[0].contents.length;
  const path = join(directory, `${name}.mjs`);
  await writeFile(path, result.outputFiles[0].contents);
  return import(pathToFileURL(path).href);
}

const expressions = [
  '1+2*3', '2^10', 'round(1.2345,2)', 'ceil(1e-15)', 'floor(-1.2)',
  'sqrt(3^2+4^2)', 'sin(pi/2)', 'cos(0)', 'log(100,10)', 'exp(1)',
  'abs(-5)', 'min(3,1,2)', 'max(3,1,2)', 'sum([1,2,3])', 'mean([1,2,3])',
  'median([1,2,9])', 'std([1,2,3])', 'factorial(5)', 'combinations(5,2)',
  'gcd(24,18)', 'mod(-5,3)', '1e-15==0 ? 1:0', '3>2 ? 7:0', 'null',
  '1/0', 'sqrt(-4)', 'abs(complex(3,4))', 're(sqrt(-4))',
  'number(bignumber("0.1")+bignumber("0.2"))', 'number(fraction(1,3))',
  'number(unit(2,"cm"),"mm")', 'det([[1,2],[3,4]])', 'size([1,2,3],1)',
  'sin(', 'unknownFunction(2)'
];

function evaluate(evaluator, expression) {
  try {
    const value = evaluator(expression);
    return JSON.stringify({ type: typeof value, value });
  } catch (error) {
    return JSON.stringify({ error: error.message });
  }
}

try {
  const commonjs = await bundle('commonjs', 'const { evaluate } = require("mathjs"); export { evaluate };');
  const esm = await bundle('esm', 'export { evaluate } from "mathjs";');
  const number = await bundle('number', 'export { evaluate } from "mathjs/number";');
  const numberDifferences = [];
  for (const expression of expressions) {
    const expected = evaluate(commonjs.evaluate, expression);
    assert.equal(evaluate(esm.evaluate, expression), expected, expression);
    const reduced = evaluate(number.evaluate, expression);
    if (reduced !== expected) numberDifferences.push({ expression, expected, reduced });
  }

  const entry = 'const { CodingSchemeFactory } = require("@iqb/responses"); export { CodingSchemeFactory };';
  const original = await bundle('responsesCommonjs', entry);
  const native = await bundle('responsesNativeImport', 'export { CodingSchemeFactory } from "@iqb/responses";');
  let redirects = 0;
  const redirected = await bundle('responsesEsmMath', entry, [{
    name: 'probe-esm-math',
    setup(builder) {
      builder.onResolve({ filter: /^mathjs$/ }, args =>
        args.importer.replaceAll('\\', '/').endsWith('/@iqb/responses/derive/derive-value.js')
          ? { path: 'mathjs-evaluate', namespace: 'probe' } : undefined);
      builder.onLoad({ filter: /.*/, namespace: 'probe' }, () => {
        redirects += 1;
        return { contents: 'export { evaluate } from "mathjs";', resolveDir: root, loader: 'js' };
      });
    }
  }]);
  assert.equal(redirects, 1, 'probe must redirect precisely the installed SOLVER math import');

  const source = { id: 'a', alias: 'A', sourceType: 'BASE', codes: [] };
  const solverExpressions = [
    '${A}+1', 'round(${A}/3,2)', 'ceil(${A})', '${A}==0 ? 1:0',
    'abs(complex(${A},4))', 'number(unit(${A},"cm"),"mm")',
    'sum([${A},1,2])', 'null', '${A}/0', '${A}+'
  ];
  let responseDerivationPairs = 0;
  const statuses = {};
  for (const expression of solverExpressions) {
    for (const value of [0, 1e-15, 3, -5, null, 'abc']) {
      for (const status of ['VALUE_CHANGED', 'CODING_COMPLETE', 'INVALID']) {
        const target = { id: 'd', alias: 'D', sourceType: 'SOLVER', deriveSources: ['a'],
          sourceParameters: { processing: [], solverExpression: expression } };
        const args = [[source, target], target, [{ id: 'a', status, value }]];
        const result = redirected.CodingSchemeFactory.deriveValue(...structuredClone(args));
        statuses[result.status] = (statuses[result.status] || 0) + 1;
        assert.deepEqual(
          result,
          original.CodingSchemeFactory.deriveValue(...structuredClone(args)),
          JSON.stringify({ expression, value, status })
        );
        assert.deepEqual(native.CodingSchemeFactory.deriveValue(...structuredClone(args)),
          result, `native ESM: ${expression}`);
        responseDerivationPairs += 1;
      }
    }
  }
  assert.ok(statuses.VALUE_CHANGED > 0);
  assert.ok(statuses.DERIVE_ERROR > 0);
  console.log(JSON.stringify({
    responses: { version: responsesManifest.version,
      nativeEsm: Boolean(responsesManifest.exports?.['.']?.import) },
    sizes, expressionParity: expressions.length, responseDerivationPairs, statuses, numberDifferences
  }, null, 2));
} finally {
  await rm(directory, { recursive: true, force: true });
}
