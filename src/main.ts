import { importProvidersFrom, provideZonelessChangeDetection } from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { createCustomElement } from '@angular/elements';
import { provideAnimations } from '@angular/platform-browser/animations';
import { SchemerTranslateLoader } from '@ngx-coding-components/translations/schemer-translate-loader';
import { registerNgxCodingComponentsElements } from '@ngx-coding-components/elements/register-elements';
import { AppComponent } from './app/app.component';

(async () => {
  const app = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideAnimations(),
      provideHttpClient(),
      TranslateService,
      importProvidersFrom(
        TranslateModule.forRoot({
          defaultLanguage: 'de',
          loader: {
            provide: TranslateLoader, useClass: SchemerTranslateLoader
          }
        }))]
  });

  const translate = app.injector.get(TranslateService);
  translate.setDefaultLang('de');
  translate.use('de');

  if (!customElements.get('app-root')) {
    customElements.define('app-root', createCustomElement(AppComponent, {
      injector: app.injector
    }));
  }

  registerNgxCodingComponentsElements(app.injector, { prefix: 'ngx' });
})();
