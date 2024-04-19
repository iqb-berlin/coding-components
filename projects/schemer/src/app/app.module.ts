import {DoBootstrap, Injector} from '@angular/core';
import { AppComponent } from './app.component';
import {createCustomElement} from "@angular/elements";

export class AppModule implements DoBootstrap {
  constructor(private injector: Injector) {}
  ngDoBootstrap(): void {
    const schemer = createCustomElement(AppComponent, { injector: this.injector });
    customElements.define('app-root', schemer);
  }
}
