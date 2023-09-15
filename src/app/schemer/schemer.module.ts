import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SchemerComponent } from './schemer.component';
import { NgxTiptapModule } from 'ngx-tiptap';
import {MatSelectModule} from "@angular/material/select";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatMenuModule} from "@angular/material/menu";
import {MatButtonModule} from "@angular/material/button";
import {RichTextEditDialogComponent} from "./rich-text-editor/rich-text-edit-dialog.component";
import {RichTextEditorComponent} from "./rich-text-editor/rich-text-editor.component";
import {MatDialogModule} from "@angular/material/dialog";
import {MatIconModule} from "@angular/material/icon";
import {MatTooltipModule} from "@angular/material/tooltip";
import {MatInputModule} from "@angular/material/input";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatCardModule} from "@angular/material/card";
import {MatSidenavModule} from "@angular/material/sidenav";
import {MatListModule} from "@angular/material/list";
import {MatToolbarModule} from "@angular/material/toolbar";
import {MatChipsModule} from "@angular/material/chips";
import {BrowserModule} from "@angular/platform-browser";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";



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
    BrowserModule,
    BrowserAnimationsModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatListModule,
    MatMenuModule,
    MatDialogModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatInputModule,
    FormsModule,
    MatSelectModule,
    MatChipsModule,
    MatCheckboxModule,
    MatCardModule,
    MatSidenavModule,
    NgxTiptapModule
  ]
})
export class SchemerModule { }
