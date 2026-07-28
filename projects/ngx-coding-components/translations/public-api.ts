import { TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import deTranslations from './de.json';

export const NGX_CODING_COMPONENTS_DE_TRANSLATIONS:
Record<string, unknown> = deTranslations;

export class NgxCodingComponentsTranslateLoader implements TranslateLoader {
  // eslint-disable-next-line class-methods-use-this
  getTranslation(): Observable<Record<string, unknown>> {
    return of(NGX_CODING_COMPONENTS_DE_TRANSLATIONS);
  }
}
