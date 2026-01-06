import 'zone.js';
import { enableProdMode, importProvidersFrom } from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { createCustomElement } from '@angular/elements';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MatDialogModule } from '@angular/material/dialog';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { SchemerTranslateLoader } from '@ngx-coding-components/translations/schemer-translate-loader';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

(async () => {
  const app = await createApplication({
    providers: [
      provideAnimations(),
      provideHttpClient(),
      importProvidersFrom(
        MatDialogModule,
        TranslateModule.forRoot({
          defaultLanguage: 'de',
          loader: {
            provide: TranslateLoader,
            useClass: SchemerTranslateLoader
          }
        }))]
  });

  const translate = app.injector.get(TranslateService);
  translate.setDefaultLang('de');
  translate.use('de');

  const schemer = createCustomElement(AppComponent, { injector: app.injector });
  customElements.define('app-root', schemer);
})();
