import { enableProdMode, importProvidersFrom } from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { provideAnimations } from '@angular/platform-browser/animations';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { SchemerTranslateLoader } from '@ngx-coding-components/translations/schemer-translate-loader';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';
import 'zone.js';

if (environment.production) {
  enableProdMode();
}

(async () => {
  const app = await createApplication({
    providers: [
      provideAnimations(),
      importProvidersFrom(
        TranslateModule.forRoot({
          defaultLanguage: 'de',
          loader: {
            provide: TranslateLoader,
            useClass: SchemerTranslateLoader
          }
        }))]
  });

  const schemer = createCustomElement(AppComponent, { injector: app.injector });
  customElements.define('app-root', schemer);
})();
