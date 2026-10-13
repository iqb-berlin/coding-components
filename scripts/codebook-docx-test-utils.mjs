import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import JSZip from 'jszip';

export async function docxParts(output) {
  const zip = await JSZip.loadAsync(output instanceof Blob ? await output.arrayBuffer() : output);
  // docx assigns random media filenames. Preserve each relationship and each image
  // byte, replacing only that random name in first-reference order.
  const mediaNames = new Map();
  for (const [name, file] of Object.entries(zip.files).sort(([a], [b]) => a.localeCompare(b))) {
    if (!name.endsWith('.rels')) continue;
    for (const match of (await file.async('string')).matchAll(/Target="media\/([^"]+)"/g)) {
      if (!mediaNames.has(match[1])) {
        const bytes = await zip.file(`word/media/${match[1]}`).async('nodebuffer');
        mediaNames.set(match[1], `image-${mediaNames.size}-${createHash('sha256').update(bytes).digest('hex')}.${match[1].split('.').pop()}`);
      }
    }
  }
  const result = {};
  for (const [name, file] of Object.entries(zip.files).sort(([a], [b]) => a.localeCompare(b))) {
    if (file.dir || name === 'docProps/core.xml') continue; // creation/modification timestamps, not document layout
    const stableName = name.startsWith('word/media/') ? `word/media/${mediaNames.get(name.slice(11)) || name.slice(11)}` : name;
    result[stableName] = name.endsWith('.xml') || name.endsWith('.rels') ?
      await file.async('string') :
      await file.async('nodebuffer');
    if (typeof result[stableName] === 'string') {
      if (/^word\/footer\d+\.xml$/.test(name)) {
        result[stableName] = result[stableName].replaceAll('IQB-Studio Codebook', 'IQB Codebook')
          .replace(/(<w:t[^>]*>IQB Codebook <\/w:t>[\s\S]*?<w:t[^>]*>)[\d./-]+(<\/w:t>)/g, '$1{{DATE}}$2')
          .replace(/(IQB Codebook )[\d./-]+(?=<\/w:t>)/g, '$1{{DATE}}');
      }
      for (const [random, stable] of mediaNames) result[stableName] = result[stableName].replaceAll(random, stable);
    }
  }
  return result;
}
export function partHashes(parts) {
  return Object.fromEntries(Object.entries(parts).map(([name, content]) => [name, createHash('sha256').update(content).digest('hex')]));
}

// Undo only the independently specified correction in the old synthetic Farb-para
// before hashing against the immutable Studio oracle. All other parts stay exact.
export function originalStudioCompatibleParts(parts) {
  const result = { ...parts };
  result['word/document.xml'] = result['word/document.xml'].replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, paragraph => {
    if (!paragraph.includes('>Farbe</w:t>')) return paragraph;
    assert.match(paragraph, /<w:sz w:val="36"\/>/, 'authored 18pt must become 36 Word half-points');
    assert.match(paragraph, /<w:color w:val="234567"\/>/);
    assert.match(paragraph, /w:fill="FFFF00"/);
    return paragraph.replace('<w:sz w:val="36"/>', '<w:sz w:val="18"/>')
      .replace('<w:szCs w:val="36"/>', '<w:szCs w:val="18"/>')
      .replace('w:fill="FFFF00"', 'w:fill="ffff00"');
  });
  return result;
}
