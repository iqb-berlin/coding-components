import { load } from 'cheerio';

/** Rich-text instructions may consist entirely of an image or a formula. */
export function hasCodebookManualInstruction(instruction?: string | null): boolean {
  if (!instruction) return false;
  const $ = load(instruction);
  $('script,style').remove();
  const text = $.root().text().replace(/[\s\u200b-\u200d\ufeff]/g, '');
  if (text) return true;
  return $('img').toArray().some(element => /^data:image\/(png|jpeg|jpg|gif|bmp);base64,\S+$/i.test($(element).attr('src') || '')) ||
    $('span.iqb-math-formula').toArray().some(element => !!$(element).attr('data-latex')?.trim());
}
