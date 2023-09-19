import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SchemerComponent } from "./schemer.component";
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { NgxTiptapModule } from "ngx-tiptap";
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
import {CodeDataComponent} from "./code/code-data.component";
import {AppTranslateLoader} from "./app-translate-loader";
import {SchemeCheckerComponent} from "./scheme-checker/scheme-checker.component";
import {VarCodingClassicComponent} from "./var-coding/var-coding-classic.component";
import {ConfirmDialogComponent} from "./dialogs/confirm-dialog.component";
import {MessageDialogComponent} from "./dialogs/message-dialog.component";
import {SelectVariableDialogComponent} from "./dialogs/select-variable-dialog.component";
import {SimpleInputDialogComponent} from "./dialogs/simple-input-dialog.component";
import {ShowCodingResultsComponent} from "./scheme-checker/show-coding-results.component";
import {SchemerToolbarComponent} from "./schemer-toolbar.component";



@NgModule({
  declarations: [
    SchemerComponent,
    CodeDataComponent,
    RichTextEditDialogComponent,
    RichTextEditorComponent,
    SchemeCheckerComponent,
    VarCodingClassicComponent,
    ConfirmDialogComponent,
    SchemerToolbarComponent,
    MessageDialogComponent,
    SelectVariableDialogComponent,
    SimpleInputDialogComponent,
    ShowCodingResultsComponent
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
    MatListModule,
    MatMenuModule,
    MatDialogModule,
    MatFormFieldModule,
    MatChipsModule,
    ReactiveFormsModule,
    MatTooltipModule,
    MatInputModule,
    FormsModule,
    MatSelectModule,
    MatChipsModule,
    MatCheckboxModule,
    MatCardModule,
    MatSidenavModule,
    NgxTiptapModule,
    TranslateModule.forRoot({
      defaultLanguage: 'de',
      loader: {
        provide: TranslateLoader,
        useClass: AppTranslateLoader
      }
    })
  ]
})
export class SchemerModule { }
