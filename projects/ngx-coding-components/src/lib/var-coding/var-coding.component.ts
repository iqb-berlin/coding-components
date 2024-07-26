import {
  Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import {
  CodeType, CodingToTextMode, VariableCodingData, VariableInfo
} from '@iqb/responses';
import { BehaviorSubject, debounceTime, Subscription } from 'rxjs';
import { MatCard, MatCardSubtitle, MatCardContent } from '@angular/material/card';
import { MatTooltip } from '@angular/material/tooltip';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { MatChipListbox, MatChip, MatChipRemove } from '@angular/material/chips';
import { MatOption } from '@angular/material/core';
import { MatSelect } from '@angular/material/select';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatInput } from '@angular/material/input';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatDivider } from '@angular/material/divider';
import { SchemerService } from '../services/schemer.service';
import { GenerateCodingDialogComponent, GeneratedCodingData } from './dialogs/generate-coding-dialog.component';
import { ShowCodingData, ShowCodingDialogComponent } from '../dialogs/show-coding-dialog.component';
import { RichTextEditDialogComponent } from '../rich-text-editor/rich-text-edit-dialog.component';
import { CodesTitleComponent } from './codes-title.component';
import { CodeInstructionComponent } from './code-instruction.component';
import { CodeRulesComponent } from './code-rules/code-rules.component';
import { MessageDialogComponent, MessageDialogData, MessageType } from '../dialogs/message-dialog.component';
import { SingleCodeComponent } from './single-code.component';
import { VariableAliasPipe } from '../pipes/variable-alias.pipe';
import {
  EditSourceParametersDialog,
  EditSourceParametersDialogData
} from './dialogs/edit-source-parameters-dialog.component';

@Component({
  selector: 'var-coding',
  templateUrl: './var-coding.component.html',
  styleUrls: ['./var-coding.component.scss'],
  standalone: true,
  imports: [
    MatFormField, MatLabel, MatInput, ReactiveFormsModule, FormsModule, MatSelect, MatOption,
    MatChipListbox, MatChip, MatMenuTrigger, MatIcon, MatChipRemove, MatIconButton, MatMenu,
    MatMenuItem, MatTooltip, MatCard, MatCardSubtitle, MatCardContent,
    TranslateModule, MatButtonToggleGroup, MatButtonToggle, MatDivider,
    CodesTitleComponent, CodeInstructionComponent, CodeRulesComponent, MatButton, SingleCodeComponent, VariableAliasPipe
  ]
})
export class VarCodingComponent implements OnInit, OnDestroy, OnChanges {
  @Output() varCodingChanged = new EventEmitter<VariableCodingData | null>();
  _varCoding: VariableCodingData | null = null;
  @Input()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set varCoding(value: VariableCodingData | null) {
    this._varCoding = value;
    this.updateHasResidualAutoCode();
  }

  get varCoding(): VariableCodingData | null {
    return this._varCoding;
  }

  lastChangeFrom$ = new BehaviorSubject<string>('init');
  lastChangeFromSubscription: Subscription | null = null;
  varInfo: VariableInfo | undefined;
  hasResidualAutoCode = false;

  constructor(
    public schemerService: SchemerService,
    private sanitizer: DomSanitizer,
    private translateService: TranslateService,
    private editTextDialog: MatDialog,
    private showCodingDialog: MatDialog,
    private generateCodingDialog: MatDialog,
    private messageDialog: MatDialog,
    private editSourceParametersDialog: MatDialog
  ) { }

  ngOnInit() {
    this.lastChangeFromSubscription = this.lastChangeFrom$.pipe(
      debounceTime(500)
    ).subscribe(source => {
      if (source !== 'init') {
        this.updateHasResidualAutoCode();
        this.varCodingChanged.emit(this.varCoding);
      }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ngOnChanges(changes: SimpleChanges) {
    this.updateVarInfo();
  }

  updateVarInfo() {
    this.varInfo = this.varCoding ? this.schemerService.getVarInfoByCoding(this.varCoding) : undefined;
  }

  updateHasResidualAutoCode() {
    this.hasResidualAutoCode = this.varCoding ? !!this.varCoding.codes.find(c => c.type === 'RESIDUAL_AUTO') : false;
  }

  getSanitizedText(text: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(text);
  }

  editTextDialog_manualInstruction(): void {
    if (this.varCoding) {
      const dialogRef = this.editTextDialog.open(RichTextEditDialogComponent, {
        width: '1100px',
        data: {
          title: this.translateService.instant('manual-instruction.coding.prompt-edit'),
          content: this.varCoding.manualInstruction || '',
          defaultFontSize: 20,
          editorHeightPx: 400
        },
        autoFocus: false
      });
      dialogRef.afterClosed().subscribe(dialogResult => {
        if (typeof dialogResult !== 'undefined') {
          if (dialogResult !== false && this.varCoding) {
            this.varCoding.manualInstruction = dialogResult;
            this.varCodingChanged.emit(this.varCoding);
          }
        }
      });
    }
  }

  wipeInstructions() {
    if (this.varCoding) {
      this.varCoding.manualInstruction = '';
      this.varCodingChanged.emit(this.varCoding);
    }
  }

  codingAsText() {
    if (this.varCoding) {
      const dialogRef = this.showCodingDialog.open(ShowCodingDialogComponent, {
        width: '1000px',
        data: <ShowCodingData>{
          varCoding: this.varCoding,
          mode: this.schemerService.codingToTextMode
        }
      });
      dialogRef.afterClosed().subscribe(dialogResult => {
        if (typeof dialogResult === 'string') {
          this.schemerService.codingToTextMode = dialogResult as CodingToTextMode;
        }
      });
    }
  }

  smartSchemer(event: MouseEvent) {
    if (this.varCoding) {
      if (event.ctrlKey) {
        if (this.schemerService.codingScheme && this.varCoding) {
          this.varCoding?.codes.forEach(c => {
            if (!c.type || c.type === 'UNSET') {
              if (/teilw/i.exec(c.label)) {
                c.label = '';
                c.type = 'PARTIAL_CREDIT';
              } else if (/richtig/i.exec(c.label)) {
                c.label = '';
                c.type = 'FULL_CREDIT';
              } else if (/falsch/i.exec(c.label)) {
                c.label = '';
                c.type = 'NO_CREDIT';
              }
            }
          });
          this.schemerService.sortCodes(this.varCoding.codes, true);
          this.varCodingChanged.emit(this.varCoding);
        }
      } else {
        const dialogRef = this.generateCodingDialog.open(GenerateCodingDialogComponent, {
          width: '1000px',
          data: this.varInfo
        });
        dialogRef.afterClosed().subscribe(dialogResult => {
          if (typeof dialogResult !== 'undefined' &&
            dialogResult !== false && dialogResult !== null && this.varCoding) {
            const newCoding = dialogResult as GeneratedCodingData;
            this.varCoding.processing = newCoding.processing;
            this.varCoding.fragmenting = newCoding.fragmenting;
            this.varCoding.codeModel = newCoding.codeModel;
            // this.varCoding.codeModelParameters = newCoding.codeModelParameters;
            this.varCoding.codes = newCoding.codes;
            this.updateHasResidualAutoCode();
            this.varCodingChanged.emit(this.varCoding);
          }
        });
      }
    }
  }

  addCode(codeType: CodeType) {
    if (this.varCoding && this.varCoding.codes) {
      const addResult = this.schemerService.addCode(this.varCoding.codes, codeType);
      if (typeof addResult === 'string') {
        this.messageDialog.open(MessageDialogComponent, {
          width: '400px',
          data: <MessageDialogData>{
            title: this.translateService.instant('code.prompt.add'),
            content: this.translateService.instant(addResult),
            type: MessageType.error
          }
        });
      } else {
        this.updateHasResidualAutoCode();
        this.varCodingChanged.emit(this.varCoding);
      }
    }
  }

  editSourceParameters() {
    if (this.schemerService.userRole === 'RW_MAXIMAL' && this.varCoding) {
      const dialogRef = this.editSourceParametersDialog.open(EditSourceParametersDialog, {
        width: '600px',
        minHeight: '400px',
        data: <EditSourceParametersDialogData>{
          selfId: this.varCoding.id,
          selfAlias: this.varCoding.alias || this.varCoding.id,
          sourceType: this.varCoding.sourceType,
          sourceParameters: this.varCoding.sourceParameters,
          deriveSources: this.varCoding.deriveSources
        }
      });
      dialogRef.afterClosed().subscribe(dialogResult => {
        if (typeof dialogResult !== 'undefined' && dialogResult !== false && this.varCoding) {
          const dialogResultTyped: EditSourceParametersDialogData = dialogResult;
          this.varCoding.alias = dialogResultTyped.selfAlias;
          this.varCoding.sourceType = dialogResultTyped.sourceType;
          this.varCoding.sourceParameters = dialogResultTyped.sourceParameters;
          this.varCoding.deriveSources = dialogResultTyped.deriveSources;
          this.varCodingChanged.emit(this.varCoding);
        }
      });
    }
  }

  ngOnDestroy(): void {
    if (this.lastChangeFromSubscription !== null) this.lastChangeFromSubscription.unsubscribe();
  }
}
