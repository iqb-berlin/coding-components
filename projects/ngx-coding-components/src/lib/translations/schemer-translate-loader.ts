import { TranslateLoader } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { of, } from 'rxjs';
import deTranslations from './de.json';


export class SchemerTranslateLoader implements TranslateLoader {
  // eslint-disable-next-line class-methods-use-this
  public getTranslation(lang: string): Observable<any> {
    return of(deTranslations);
  }
}
