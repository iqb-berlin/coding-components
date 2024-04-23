import {enableProdMode, importProvidersFrom} from '@angular/core';
import { environment } from './environments/environment';
import {createApplication} from "@angular/platform-browser";
import {createCustomElement} from "@angular/elements";
import {AppComponent} from "./app/app.component";
import {TranslateLoader, TranslateModule} from "@ngx-translate/core";
import {SchemerTranslateLoader} from "../../ngx-coding-components/src/lib/translations/schemer-translate-loader";
import 'zone.js';



if (environment.production) {
  enableProdMode();
}
 // bootstrapApplication(AppComponent, appConfig)
 //   .catch((err) => console.error(err));


(async () => {
  const app = await createApplication({providers: [
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
