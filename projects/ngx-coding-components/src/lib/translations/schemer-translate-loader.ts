import { TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import {
  NGX_CODING_COMPONENTS_DE_TRANSLATIONS
} from '@iqb/ngx-coding-components/translations';

export class SchemerTranslateLoader implements TranslateLoader {
  // eslint-disable-next-line class-methods-use-this,@typescript-eslint/no-unused-vars
  getTranslation(lang: string): Observable<Record<string, unknown>> {
    return of(NGX_CODING_COMPONENTS_DE_TRANSLATIONS);
  }
}
