import {
  Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import {
  CodeType, RuleMethod, VariableCodingData, VariableInfo
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
import { GenerateCodingDialogComponent, GeneratedCodingData } from '../dialogs/generate-coding-dialog.component';
import { ShowCodingDialogComponent } from '../dialogs/show-coding-dialog.component';
import { RichTextEditDialogComponent } from '../rich-text-editor/rich-text-edit-dialog.component';
import { CodesTitleComponent } from './codes-title.component';
import { CodeInstructionComponent } from './code-instruction.component';
import { CodeRulesComponent } from './code-rules/code-rules.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../dialogs/confirm-dialog.component';
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
  @Input() varCoding: VariableCodingData | null = null;
  lastChangeFrom$ = new BehaviorSubject<string>('init');
  lastChangeFromSubscription: Subscription | null = null;
  varInfo: VariableInfo | undefined;

  constructor(
    public schemerService: SchemerService,
    private sanitizer: DomSanitizer,
    private translateService: TranslateService,
    private editTextDialog: MatDialog,
    private showCodingDialog: MatDialog,
    private generateCodingDialog: MatDialog,
    private messageDialog: MatDialog,
    private confirmDialog: MatDialog,
    private editSourceParametersDialog: MatDialog
  ) { }

  ngOnInit() {
    this.lastChangeFromSubscription = this.lastChangeFrom$.pipe(
      debounceTime(500)
    ).subscribe(source => {
      if (source !== 'init') this.varCodingChanged.emit(this.varCoding);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ngOnChanges(changes: SimpleChanges) {
    this.updateVarInfo();
  }

  getNewSources(usedVars: string[]) {
    const returnSources: string[] = [];
    this.schemerService.allVariableIds.forEach(v => {
      if (this.varCoding && usedVars.indexOf(v) < 0 && v !== this.varCoding.id) returnSources.push(v);
    });
    returnSources.sort();
    return returnSources;
  }

  updateVarInfo() {
    this.varInfo = this.varCoding ? this.schemerService.getVarInfoByCoding(this.varCoding) : undefined;
  }

  deleteDeriveSource(source: string) {
    if (this.varCoding) {
      const sourcePos = this.varCoding.deriveSources.indexOf(source);
      if (sourcePos >= 0) this.varCoding.deriveSources.splice(sourcePos, 1);
      this.varCodingChanged.emit(this.varCoding);
      this.updateVarInfo();
    }
  }

  addDeriveSource(v: string) {
    if (this.varCoding) {
      this.varCoding.deriveSources.push(v);
      this.varCoding.deriveSources.sort();
      this.varCodingChanged.emit(this.varCoding);
      this.updateVarInfo();
    }
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
        data: this.varCoding
      });
      dialogRef.afterClosed().subscribe();
    }
  }

  smartSchemer(event: MouseEvent) {
    if (this.varCoding) {
      if (event.ctrlKey) {
        const dialogRef = this.confirmDialog.open(ConfirmDialogComponent, {
          width: '400px',
          data: <ConfirmDialogData>{
            title: 'Transformation Kodierschema',
            content: 'Das vorhandene Kodierschema wird nach Standard "Bista2024" geändert. Fortsetzen?',
            confirmButtonLabel: 'Weiter',
            showCancel: true
          }
        });
        dialogRef.afterClosed().subscribe(result => {
          if (result !== false && this.schemerService.codingScheme) {
            alert('coming soon.');
          }
        });
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
            // console.log(this.varCoding.codes);
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
      }
    }
  }

  hasRule(ruleCode: RuleMethod): boolean {
    if (this.varCoding && this.varCoding.codes) {
      const myRule = this.varCoding.codes.find(
        c => !!c.ruleSets.find(rs => !!rs.rules.find(r => r.method === ruleCode)));
      return !!myRule;
    }
    return false;
  }

  residualExists(): boolean {
    if (this.varCoding && this.varCoding.codes && this.varCoding.codes.length > 0) {
      const firstResidualCode = this.varCoding.codes
        .find(c => ['RESIDUAL', 'RESIDUAL_AUTO'].includes(c.type));
      return !!firstResidualCode;
    }
    return false;
  }

  editSourceParameters() {
    if (this.schemerService.userRole === 'RW_MAXIMAL' && this.varCoding) {
      const dialogRef = this.editSourceParametersDialog.open(EditSourceParametersDialog, {
        width: '600px',
        height: '400px',
        data: <EditSourceParametersDialogData>{
          sourceType: this.varCoding.sourceType,
          sourceParameters: this.varCoding.sourceParameters,
          deriveSources: this.varCoding.deriveSources
        }
      });
      dialogRef.afterClosed().subscribe(dialogResult => {
        if (dialogResult !== false && this.varCoding) {
          const dialogResultTyped: EditSourceParametersDialogData = dialogResult;
          this.varCoding.sourceType = dialogResultTyped.sourceType;
          this.varCoding.sourceParameters = dialogResultTyped.sourceParameters;
          this.varCoding.deriveSources = dialogResultTyped.deriveSources;
          // todo: refresh lists?
        }
      });
    }
  }

  ngOnDestroy(): void {
    if (this.lastChangeFromSubscription !== null) this.lastChangeFromSubscription.unsubscribe();
  }
}
