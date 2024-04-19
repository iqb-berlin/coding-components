import { importProvidersFrom } from '@angular/core';
import { AppComponent } from './app/app.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import {NoopAnimationsModule} from "@angular/platform-browser/animations";
import {TranslateLoader, TranslateModule} from "@ngx-translate/core";
import {HttpClient, HttpClientModule} from "@angular/common/http";
import {
  createTranslateLoader
} from "../projects/ngx-coding-components/src/lib/translations/ngx-coding-components.translate-loader";


bootstrapApplication(AppComponent, {
    providers: [importProvidersFrom(
      TranslateModule.forRoot({
        defaultLanguage: 'de',
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader,
        deps: [HttpClient],
      },
    }),
      HttpClientModule,NoopAnimationsModule,BrowserModule, MatMenuModule, MatDividerModule, MatIconModule, MatButtonModule, MatTooltipModule, MatSidenavModule, MatToolbarModule)]
})
  .catch(err => console.error(err));
