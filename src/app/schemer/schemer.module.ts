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
import {CodeFullComponent} from "./var-coding/var-codes-full/code-full.component";
import {AppTranslateLoader} from "./app-translate-loader";
import {SchemeCheckerComponent} from "./scheme-checker/scheme-checker.component";
import {VarCodingComponent} from "./var-coding/var-coding.component";
import {ConfirmDialogComponent} from "./dialogs/confirm-dialog.component";
import {MessageDialogComponent} from "./dialogs/message-dialog.component";
import {SelectVariableDialogComponent} from "./dialogs/select-variable-dialog.component";
import {SimpleInputDialogComponent} from "./dialogs/simple-input-dialog.component";
import {ShowCodingResultsComponent} from "./scheme-checker/show-coding-results.component";
import {SchemerToolbarComponent} from "./schemer-toolbar.component";
import {VarCodesFullComponent} from "./var-coding/var-codes-full/var-codes-full.component";
import {ComboButtonComponent} from "./rich-text-editor/combo-button.component";
import {CdkConnectedOverlay, CdkOverlayOrigin} from "@angular/cdk/overlay";
import {VarCodesManualComponent} from "./var-coding/var-codes-manual/var-codes-manual.component";
import {CodeManualComponent} from "./var-coding/var-codes-manual/code-manual.component";
import {VarCodesValueListComponent} from "./var-coding/var-codes-value-list/var-codes-value-list.component";
import {CodeValueListComponent} from "./var-coding/var-codes-value-list/code-value-list.component";
import {VarCodesNumberComponent} from "./var-coding/var-codes-number/var-codes-number.component";
import {CodeNumberComponent} from "./var-coding/var-codes-number/code-number.component";
import {ShowCodingDialogComponent} from "./dialogs/show-coding-dialog.component";



@NgModule({
  declarations: [
    SchemerComponent,
    CodeFullComponent,
    RichTextEditDialogComponent,
    ShowCodingDialogComponent,
    RichTextEditorComponent,
    SchemeCheckerComponent,
    VarCodingComponent,
    ConfirmDialogComponent,
    MessageDialogComponent,
    SelectVariableDialogComponent,
    SimpleInputDialogComponent,
    ShowCodingResultsComponent,
    VarCodesFullComponent,
    VarCodesManualComponent,
    CodeManualComponent,
    VarCodesValueListComponent,
    CodeValueListComponent,
    ComboButtonComponent,
    VarCodesNumberComponent,
    CodeNumberComponent,
    SchemerToolbarComponent
  ],
  exports: [
    SchemerComponent,
    SchemeCheckerComponent,
    SchemerToolbarComponent
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
    }),
    CdkConnectedOverlay,
    CdkOverlayOrigin
  ]
})
export class SchemerModule { }
