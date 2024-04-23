import { importProvidersFrom } from '@angular/core';
import { AppComponent } from './app/app.component';
import {createApplication} from '@angular/platform-browser';
import {TranslateLoader, TranslateModule} from "@ngx-translate/core";
import {SchemerTranslateLoader} from "../projects/ngx-coding-components/src/lib/translations/schemer-translate-loader";
import {createCustomElement} from "@angular/elements";
import {provideAnimations} from "@angular/platform-browser/animations";
import 'zone.js';


(async () => {
  const app = await createApplication({providers: [
      provideAnimations(),
      importProvidersFrom(
        TranslateModule.forRoot({
          defaultLanguage: 'de',
          loader: {
            provide: TranslateLoader,
            useClass: SchemerTranslateLoader
          }
        }),)]});

  const schemer = createCustomElement(AppComponent, {injector: app.injector});
  customElements.define('app-root', schemer);
})();
