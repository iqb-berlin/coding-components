import { build } from 'esbuild';
import { readFile, writeFile, copyFile } from 'node:fs/promises';

// Nest/webpack and Jest consumers also need a native CommonJS entry point.
const root = 'dist/ngx-coding-components';
await build({
  entryPoints: ['projects/ngx-coding-components/codebook-generator/public-api.ts'],
  outfile: `${root}/cjs/codebook-generator.cjs`, bundle: true, platform: 'node',
  format: 'cjs', target: 'node20', external: ['@iqb/responses', '@iqbspecs/coding-scheme', 'docx', 'cheerio', 'buffer', 'image-size', 'katex'], sourcemap: true
});
const manifest = JSON.parse(await readFile(`${root}/package.json`, 'utf8'));
const entry = manifest.exports['./codebook-generator'];
manifest.exports['./codebook-generator'] = {
  types: entry.types, require: './cjs/codebook-generator.cjs', default: entry.default
};
await writeFile(`${root}/package.json`, `${JSON.stringify(manifest, null, 2)}\n`);

await copyFile('node_modules/mathml2omml/LICENSE', `${root}/cjs/mathml2omml.LICENSE`);
