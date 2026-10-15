import { image } from './codebook-synthetic.mjs';

// Invented error cases; no task content or user images are used.
export const inlineImageCases = [
  { id: 'corrupt', imageHtml: '<img src="data:image/png;base64,YQ==">' },
  { id: 'empty', imageHtml: '<img src="">' },
  { id: 'missing', imageHtml: '<img>' },
  { id: 'unsupported', imageHtml: '<img src="data:application/octet-stream;base64,aGVsbG8=">' },
].map(entry => ({ ...entry, errors: 1, images: 0, formulas: 0 }));
inlineImageCases.push({
  id: 'mixed',
  imageHtml: `<span><img src="data:image/png;base64,YQ=="><img src=""></span>` +
    `<img src="data:image/png;base64,${image}"><span class="iqb-math-formula" data-latex="x^2"></span>`,
  errors: 2, images: 1, formulas: 1,
});

export function inlineImageHtml(entry) {
  return `<p><strong>VOR</strong>${entry.imageHtml}<span style="color:#ff0000;font-size:18pt">NACH</span></p>` +
    '<p>WEITER</p>';
}

export function inlineImageUnits(entry, location) {
  const html = inlineImageHtml(entry);
  return [{ id: 101, key: 'INLINE_IMAGE', name: 'Synthetischer Bildfehler', scheme: JSON.stringify({
    version: '3.4', variableCodings: [{ id: 'V', sourceType: 'BASE',
      manualInstruction: location === 'general' ? html : '',
      codes: [{ id: 0, type: 'FULL_CREDIT', label: 'Code', score: 0,
        manualInstruction: location === 'code' ? html : 'CODE_UNCHANGED', ruleSets: [] }],
    }],
  }) }];
}
