import { TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import deTranslations from './de.json';

export class SchemerTranslateLoader implements TranslateLoader {
  // eslint-disable-next-line class-methods-use-this,@typescript-eslint/no-unused-vars
  getTranslation(lang: string): Observable<Record<string, unknown>> {
    return of(deTranslations);
  }
}
