import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SchemerComponent } from './schemer.component';
import { NgxTiptapModule } from 'ngx-tiptap';
import {MatSelectModule} from "@angular/material/select";
import {ReactiveFormsModule} from "@angular/forms";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatMenuModule} from "@angular/material/menu";
import {MatButtonModule} from "@angular/material/button";
import {RichTextEditDialogComponent} from "./rich-text-editor/rich-text-edit-dialog.component";
import {RichTextEditorComponent} from "./rich-text-editor/rich-text-editor.component";
import {MatDialogModule} from "@angular/material/dialog";



@NgModule({
  declarations: [
    SchemerComponent,
    RichTextEditDialogComponent,
    RichTextEditorComponent
  ],
  exports: [
    SchemerComponent
  ],
  imports: [
    CommonModule,
    NgxTiptapModule,
    MatSelectModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatMenuModule,
    MatButtonModule,
    MatDialogModule
  ]
})
export class SchemerModule { }
