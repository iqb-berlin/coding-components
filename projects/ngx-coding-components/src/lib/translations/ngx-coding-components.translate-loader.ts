import { TranslateLoader } from '@ngx-translate/core';
import { of, Observable } from 'rxjs';
import deTranslations from './de.json';

export class NgxCodingComponentsTranslateLoader implements TranslateLoader {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any,class-methods-use-this,@typescript-eslint/no-unused-vars
  getTranslation(lang: string): Observable<any> {
    return of(deTranslations);
  }
}
