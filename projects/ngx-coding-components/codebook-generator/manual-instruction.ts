import { load } from 'cheerio';

/** Escape generated plain text without changing authored rich-text markup. */
export function escapeCodebookHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Only legacy tokens contain URI-encoded LaTeX; current editor attributes do not. */
export function normalizeCodebookMathTokens(html: string): string {
  return html.replace(/\[\[iqb-math:([\s\S]*?)]]/g, (_, encodedFormula: string) => {
    let latex = encodedFormula;
    try {
      latex = decodeURIComponent(encodedFormula);
    } catch {
      // Older content can contain literal percent signs rather than encoded text.
    }
    if (!latex.trim()) return '';
    const attribute = escapeCodebookHtml(latex).replace(/"/g, '&quot;');
    return `<span class="iqb-math-formula" data-latex="${attribute}"></span>`;
  });
}

/** Rich-text instructions may consist entirely of an image or a formula. */
export function hasCodebookManualInstruction(instruction?: string | null): boolean {
  if (!instruction) return false;
  const $ = load(normalizeCodebookMathTokens(instruction));
  $('script,style').remove();
  const text = $.root().text().replace(/[\s\p{Default_Ignorable_Code_Point}]/gu, '');
  if (text) return true;
  const hasImage = $('img').toArray().some(element => (
    /^data:image\/[^;,]+(?:;[^,]*)?;base64,\S+$/i.test($(element).attr('src') || '')
  ));
  return hasImage ||
    $('span.iqb-math-formula').toArray().some(element => !!$(element).attr('data-latex')?.trim()) ||
    $('aspect-nodeview-math-formula').toArray().some(element => !!$(element).attr('formula')?.trim());
}
