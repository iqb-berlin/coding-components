import { TranslateLoader } from '@ngx-translate/core';
import {from, merge, Observable} from 'rxjs';
import { reduce } from 'rxjs/operators';

export class AppTranslateLoader implements TranslateLoader {
  // eslint-disable-next-line class-methods-use-this
  getTranslation = (lang: string): Observable<Record<string, string>> => merge(
    from(import(`../../assets/i18n/${lang}.json`)),
    from(import(`../../assets/i18n/${lang}2.json`)),
    from(import(`../../assets/i18n/${lang}3.json`))
  )
  .pipe(
    reduce((
      merged: Record<string, string>,
      file: Record<string, string>
    ): Record<string, string> => ({ ...merged, ...file }), {})
  );
}
