import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SchemerComponent } from "./schemer/schemer.component";
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
import {CodeRulesComponent} from "./var-coding/code-rules/code-rules.component";
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
import {VarCodesNumberComponent} from "./var-coding/var-codes-number/var-codes-number.component";
import {ShowCodingDialogComponent} from "./dialogs/show-coding-dialog.component";
import {ShowCodingProblemsDialogComponent} from "./dialogs/show-coding-problems-dialog.component";
import {TranslateLoader, TranslateModule} from "@ngx-translate/core";
import {NgxCodingComponentsTranslateLoader} from "./translations/ngx-coding-components.translate-loader";
import {GenerateCodingDialogComponent} from "./dialogs/generate-coding-dialog.component";
import {MatRadioModule} from "@angular/material/radio";
import {VarCodesChoiceComponent} from "./var-coding/var-codes-choice/var-codes-choice.component";
import {CodeHeaderComponent} from "./var-coding/code-header.component";
import {CodeInstructionComponent} from "./var-coding/code-instruction.component";
import {PossibleNewRulesPipe} from "./pipes/possible-new-rules.pipe";
import {MatTabsModule} from "@angular/material/tabs";
import {MatButtonToggleModule} from "@angular/material/button-toggle";
import {SelectCodeRuleReferenceDialogComponent} from "./dialogs/select-code-rule-reference-dialog.component";
import {RuleReferencePipe} from "./pipes/rule-reference.pipe";
import {HasRulePipe} from "./pipes/has-rule.pipe";
import {VarCodesValueListComponent} from "./var-coding/var-codes-value-list/var-codes-value-list.component";
import {CdkDrag, CdkDropList} from "@angular/cdk/drag-drop";

@NgModule({
  declarations: [
    SchemerComponent,
    CodeRulesComponent,
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
    PossibleNewRulesPipe,
    HasRulePipe,
    RuleReferencePipe,
    VarCodesChoiceComponent,
    SelectCodeRuleReferenceDialogComponent,
    CodeHeaderComponent,
    VarCodesManualComponent,
    VarCodesValueListComponent,
    CodeInstructionComponent,
    ShowCodingProblemsDialogComponent,
    GenerateCodingDialogComponent,
    ComboButtonComponent,
    VarCodesNumberComponent,
    SchemerToolbarComponent
  ],
  exports: [
    SchemerComponent,
    SchemeCheckerComponent,
    SchemerToolbarComponent,
    VarCodingComponent,
    ConfirmDialogComponent,
    GenerateCodingDialogComponent,
    MessageDialogComponent,
    SelectVariableDialogComponent,
    ShowCodingDialogComponent,
    ShowCodingProblemsDialogComponent,
    SimpleInputDialogComponent
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
        useClass: NgxCodingComponentsTranslateLoader
      }
    }),
    CdkConnectedOverlay,
    CdkOverlayOrigin,
    MatRadioModule,
    MatTabsModule,
    MatButtonToggleModule,
    CdkDrag,
    CdkDropList
  ]
})
export class NgxCodingComponentsModule { }
