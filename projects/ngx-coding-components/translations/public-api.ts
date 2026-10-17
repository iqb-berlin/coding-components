import { TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import deTranslations from './de.json';

export { mergeTranslations, selectTranslationsForLanguage } from './translation-utils';
export type { TranslationMap } from './translation-utils';

export const NGX_CODING_COMPONENTS_DE_TRANSLATIONS:
Record<string, unknown> = deTranslations;

export class NgxCodingComponentsTranslateLoader implements TranslateLoader {
  // eslint-disable-next-line class-methods-use-this
  getTranslation(): Observable<Record<string, unknown>> {
    return of(NGX_CODING_COMPONENTS_DE_TRANSLATIONS);
  }
}
