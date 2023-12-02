import { TranslateLoader } from '@ngx-translate/core';
import { from, Observable } from 'rxjs';
import { reduce } from 'rxjs/operators';

export class AppTranslateLoader implements TranslateLoader {
  // eslint-disable-next-line class-methods-use-this
  getTranslation = (lang: string): Observable<Record<string, string>> =>
    from(import(`../../assets/i18n/${lang}.json`))
  .pipe(
    reduce((
      merged: Record<string, string>,
      file: Record<string, string>
    ): Record<string, string> => ({ ...merged, ...file }), {})
  );
}
