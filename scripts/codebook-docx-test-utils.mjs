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
      (await file.async('string')).replaceAll(new Date().toLocaleDateString(), '{{DATE}}')
        .replaceAll('IQB-Studio Codebook', 'IQB Codebook') :
      await file.async('nodebuffer');
    if (typeof result[stableName] === 'string') {
      for (const [random, stable] of mediaNames) result[stableName] = result[stableName].replaceAll(random, stable);
    }
  }
  return result;
}
export function partHashes(parts) {
  return Object.fromEntries(Object.entries(parts).map(([name, content]) => [name, createHash('sha256').update(content).digest('hex')]));
}
