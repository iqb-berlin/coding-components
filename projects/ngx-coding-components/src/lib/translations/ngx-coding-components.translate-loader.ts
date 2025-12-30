import { TranslateLoader } from '@ngx-translate/core';
import { of, Observable } from 'rxjs';
import deTranslations from './de.json';

export class NgxCodingComponentsTranslateLoader implements TranslateLoader {
  // eslint-disable-next-line class-methods-use-this
  getTranslation(): Observable<Record<string, unknown>> {
    return of(deTranslations);
  }
}
