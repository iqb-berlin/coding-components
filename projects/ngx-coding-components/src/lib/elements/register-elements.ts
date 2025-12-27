import { Injector } from '@angular/core';
import { createCustomElement } from '@angular/elements';
import { SchemeCheckerComponent } from '../scheme-checker/scheme-checker.component';
import { SchemerComponent } from '../schemer/schemer.component';
import { SchemerStandaloneMenuComponent } from '../schemer-standalone-menu.component';
import { VarCodingComponent } from '../var-coding/var-coding.component';
import { CodesTitleComponent } from '../var-coding/codes-title.component';
import { SingleCodeComponent } from '../var-coding/single-code.component';
import { CodeInstructionComponent } from '../var-coding/code-instruction.component';
import { CodeRulesComponent } from '../var-coding/code-rules/code-rules.component';
import { CodeRuleListComponent } from '../var-coding/code-rules/code-rule-list.component';
import { RichTextEditorComponent } from '../rich-text-editor/rich-text-editor.component';
import { ComboButtonComponent } from '../rich-text-editor/combo-button.component';

export type NgxCodingComponentsElementTagName =
  | 'ngx-scheme-checker'
  | 'ngx-schemer'
  | 'ngx-schemer-standalone-menu'
  | 'ngx-var-coding'
  | 'ngx-codes-title'
  | 'ngx-single-code'
  | 'ngx-code-instruction'
  | 'ngx-code-rules'
  | 'ngx-code-rule-list'
  | 'ngx-rich-text-editor'
  | 'ngx-combo-button';

export const NGX_CODING_COMPONENTS_ELEMENT_TAGS: Record<
NgxCodingComponentsElementTagName,
NgxCodingComponentsElementTagName
> = {
  'ngx-scheme-checker': 'ngx-scheme-checker',
  'ngx-schemer': 'ngx-schemer',
  'ngx-schemer-standalone-menu': 'ngx-schemer-standalone-menu',
  'ngx-var-coding': 'ngx-var-coding',
  'ngx-codes-title': 'ngx-codes-title',
  'ngx-single-code': 'ngx-single-code',
  'ngx-code-instruction': 'ngx-code-instruction',
  'ngx-code-rules': 'ngx-code-rules',
  'ngx-code-rule-list': 'ngx-code-rule-list',
  'ngx-rich-text-editor': 'ngx-rich-text-editor',
  'ngx-combo-button': 'ngx-combo-button'
};

export type RegisterNgxCodingComponentsElementsOptions = {
  prefix?: string;
};

export const registerNgxCodingComponentsElements = (
  injector: Injector,
  options: RegisterNgxCodingComponentsElementsOptions = {}
): void => {
  const prefix = (options.prefix || 'ngx').replace(/-+$/g, '');
  const tag = (name: string) => `${prefix}-${name}`.replace(/--+/g, '-');

  const defineElement = (
    tagName: string,
    elementConstructor: CustomElementConstructor
  ) => {
    if (!customElements.get(tagName)) {
      customElements.define(tagName, elementConstructor);
    }
  };

  defineElement(
    tag('scheme-checker'),
    createCustomElement(SchemeCheckerComponent, { injector })
  );
  defineElement(tag('schemer'), createCustomElement(SchemerComponent, { injector }));
  defineElement(
    tag('schemer-standalone-menu'),
    createCustomElement(SchemerStandaloneMenuComponent, { injector })
  );
  defineElement(
    tag('var-coding'),
    createCustomElement(VarCodingComponent, { injector })
  );
  defineElement(
    tag('codes-title'),
    createCustomElement(CodesTitleComponent, { injector })
  );
  defineElement(
    tag('single-code'),
    createCustomElement(SingleCodeComponent, { injector })
  );
  defineElement(
    tag('code-instruction'),
    createCustomElement(CodeInstructionComponent, { injector })
  );
  defineElement(
    tag('code-rules'),
    createCustomElement(CodeRulesComponent, { injector })
  );
  defineElement(
    tag('code-rule-list'),
    createCustomElement(CodeRuleListComponent, { injector })
  );
  defineElement(
    tag('rich-text-editor'),
    createCustomElement(RichTextEditorComponent, { injector })
  );
  defineElement(
    tag('combo-button'),
    createCustomElement(ComboButtonComponent, { injector })
  );
};
