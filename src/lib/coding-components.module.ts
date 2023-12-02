import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ResponseListComponent } from './response-list.component';

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    ResponseListComponent
  ],
  exports: [
    ResponseListComponent
  ]
})
export class CodingComponentsModule {}

export {
  ResponseListComponent
};
