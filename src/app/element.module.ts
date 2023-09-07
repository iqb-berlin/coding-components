import {ApplicationRef, DoBootstrap, Injector, NgModule} from "@angular/core";
import {BrowserModule} from "@angular/platform-browser";
import {SchemerModule} from "./schemer/schemer.module";
import {createCustomElement} from "@angular/elements";
import {SchemerComponent} from "./schemer/schemer.component";

@NgModule({
    imports: [
        BrowserModule,
        SchemerModule
    ],
    providers: []
})
export class ElementModule implements DoBootstrap {
    constructor(
        private injector: Injector
    ) {}
    ngDoBootstrap(appRef: ApplicationRef) {
        if (!customElements.get('login-provider')) {
            const schemerComponent = createCustomElement(SchemerComponent, {
                injector: this.injector,    // This injector is used to load the component's factory
            });
            customElements.define('responses-schemer', schemerComponent);
        }
    }
}
