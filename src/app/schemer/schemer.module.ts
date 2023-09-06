import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SchemerComponent } from './schemer.component';



@NgModule({
  declarations: [
    SchemerComponent
  ],
  exports: [
    SchemerComponent
  ],
  imports: [
    CommonModule
  ]
})
export class SchemerModule { }
