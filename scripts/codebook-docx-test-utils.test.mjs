import assert from 'node:assert/strict';
import { test } from 'node:test';
import JSZip from 'jszip';
import { docxParts } from './codebook-docx-test-utils.mjs';

test('document comparison normalizes the footer date across days without changing user content', async () => {
  const document = '<w:p><w:r><w:t>IQB-Studio Codebook 1/2/2020</w:t></w:r></w:p>';
  for (const date of ['1/2/2020', '13.10.2026', '2026-10-14']) {
    for (const text of [`<w:r><w:t>IQB-Studio Codebook ${date}</w:t></w:r>`,
      `<w:r><w:t>IQB-Studio Codebook </w:t></w:r><w:r><w:t>${date}</w:t></w:r>`]) {
      const zip = new JSZip();
      zip.file('word/document.xml', document);
      zip.file('word/footer1.xml', `<w:ftr><w:p>${text}</w:p></w:ftr>`);
      const parts = await docxParts(await zip.generateAsync({ type: 'nodebuffer' }));
      assert.equal(parts['word/document.xml'], document);
      assert.ok(parts['word/footer1.xml'].includes('{{DATE}}'));
      assert.ok(!parts['word/footer1.xml'].includes(date));
    }
  }
});
