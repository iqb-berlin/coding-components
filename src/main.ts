import { importProvidersFrom, provideZonelessChangeDetection } from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { createCustomElement } from '@angular/elements';
import { provideAnimations } from '@angular/platform-browser/animations';
import { SchemerTranslateLoader } from '@ngx-coding-components/translations/schemer-translate-loader';
import { SchemeCheckerComponent } from '@ngx-coding-components/scheme-checker/scheme-checker.component';
import { SchemerComponent } from '@ngx-coding-components/schemer/schemer.component';
import { SchemerStandaloneMenuComponent } from '@ngx-coding-components/schemer-standalone-menu.component';
import { VarCodingComponent } from '@ngx-coding-components/var-coding/var-coding.component';
import { CodesTitleComponent } from '@ngx-coding-components/var-coding/codes-title.component';
import { SingleCodeComponent } from '@ngx-coding-components/var-coding/single-code.component';
import { CodeInstructionComponent } from '@ngx-coding-components/var-coding/code-instruction.component';
import { CodeRulesComponent } from '@ngx-coding-components/var-coding/code-rules/code-rules.component';
import { CodeRuleListComponent } from '@ngx-coding-components/var-coding/code-rules/code-rule-list.component';
import { RichTextEditorComponent } from '@ngx-coding-components/rich-text-editor/rich-text-editor.component';
import { ComboButtonComponent } from '@ngx-coding-components/rich-text-editor/combo-button.component';
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

  const defineElement = (tagName: string, elementConstructor: CustomElementConstructor) => {
    if (!customElements.get(tagName)) {
      customElements.define(tagName, elementConstructor);
    }
  };

  defineElement('app-root', createCustomElement(AppComponent, { injector: app.injector }));
  defineElement(
    'ngx-scheme-checker',
    createCustomElement(SchemeCheckerComponent, { injector: app.injector })
  );
  defineElement(
    'ngx-schemer',
    createCustomElement(SchemerComponent, { injector: app.injector })
  );
  defineElement(
    'ngx-schemer-standalone-menu',
    createCustomElement(SchemerStandaloneMenuComponent, { injector: app.injector })
  );
  defineElement(
    'ngx-var-coding',
    createCustomElement(VarCodingComponent, { injector: app.injector })
  );
  defineElement(
    'ngx-codes-title',
    createCustomElement(CodesTitleComponent, { injector: app.injector })
  );
  defineElement(
    'ngx-single-code',
    createCustomElement(SingleCodeComponent, { injector: app.injector })
  );
  defineElement(
    'ngx-code-instruction',
    createCustomElement(CodeInstructionComponent, { injector: app.injector })
  );
  defineElement(
    'ngx-code-rules',
    createCustomElement(CodeRulesComponent, { injector: app.injector })
  );
  defineElement(
    'ngx-code-rule-list',
    createCustomElement(CodeRuleListComponent, { injector: app.injector })
  );
  defineElement(
    'ngx-rich-text-editor',
    createCustomElement(RichTextEditorComponent, { injector: app.injector })
  );
  defineElement(
    'ngx-combo-button',
    createCustomElement(ComboButtonComponent, { injector: app.injector })
  );
})();
