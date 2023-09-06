import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { SchemerModule } from './schemer/schemer.module';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    SchemerModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
