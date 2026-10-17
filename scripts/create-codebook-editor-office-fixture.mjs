// Maintainer-only: regenerate the synthetic Office visual-acceptance fixture.
import { writeFile } from 'node:fs/promises';
import { CodebookDocxGenerator } from '../dist/ngx-coding-components/fesm2022/iqb-ngx-coding-components-codebook-generator.mjs';
import { editorMarkCases, editorMarkUnits } from './fixtures/codebook-editor-matrix.mjs';
import { defaults, image } from './fixtures/codebook-synthetic.mjs';
const entries = [...editorMarkCases()].filter(entry => entry.id.includes('-forward-') && entry.alignment === 'left');
const units = editorMarkUnits('');
units[0].variables[0].generalInstruction = '<p>Alle 48 gültigen Kombinationen aus vier Textmarkierungen und Grundlinie/Hoch-/Tiefstellung.</p>';
units[0].variables[0].codes = entries.map((entry, index) => ({
  id: String(index + 1), label: entry.id.replace('-forward-left', ''), score: '1', description: entry.html
}));
units[0].variables[0].codes.push(
  { id: '49', label: 'Formeln', score: '1', description: '<p><strong>Formel:</strong> [[iqb-math:x^2]] und <span class="iqb-math-formula" data-latex="a%3Cb"></span></p>' },
  { id: '50', label: 'Listen', score: '1', description: '<ul><li><p><strong><em>Liste 10&nbsp;kg</em></strong></p><ul><li><p>Unterpunkt</p></li></ul></li></ul>' },
  { id: '51', label: 'Bild', score: '1', description: `<p>vor Bild</p><img src="data:image/png;base64,${image}"><p>nach Bild</p>` }
);
const blob = await CodebookDocxGenerator.generateDocx(units, defaults);
await writeFile(new URL('./fixtures/word-acceptance/editor-combinations.docx', import.meta.url), Buffer.from(await blob.arrayBuffer()));
console.log('Generated 48 mark combinations plus formula/list/image cases from invented content.');
