import {
  Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import {CodeType, VariableCodingData, VariableInfo} from '@iqb/responses';
import { BehaviorSubject, debounceTime, Subscription } from 'rxjs';
import { MatCard, MatCardSubtitle, MatCardContent } from '@angular/material/card';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { MatChipListbox, MatChip, MatChipRemove } from '@angular/material/chips';
import { MatOption } from '@angular/material/core';
import { MatSelect } from '@angular/material/select';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatInput } from '@angular/material/input';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { VarCodesFullComponent } from './var-codes-full/var-codes-full.component';
import { SchemerService } from '../services/schemer.service';
import { GenerateCodingDialogComponent, GeneratedCodingData } from '../dialogs/generate-coding-dialog.component';
import { ShowCodingDialogComponent } from '../dialogs/show-coding-dialog.component';
import { RichTextEditDialogComponent } from '../rich-text-editor/rich-text-edit-dialog.component';
import {MatDivider} from "@angular/material/divider";

@Component({
  selector: 'var-coding',
  templateUrl: './var-coding.component.html',
  styleUrls: ['./var-coding.component.scss'],
  standalone: true,
  imports: [
    MatFormField, MatLabel, MatInput, ReactiveFormsModule, FormsModule, MatSelect, MatOption,
    MatChipListbox, MatChip, MatMenuTrigger, MatIcon, MatChipRemove, MatIconButton, MatMenu,
    MatMenuItem, MatTooltip, MatCard, MatCardSubtitle, MatCardContent,
    VarCodesFullComponent, TranslateModule, MatButtonToggleGroup, MatButtonToggle, MatDivider
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
    private generateCodingDialog: MatDialog
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

  setFragmenting(newFragmenting: string) {
    if (this.varCoding) {
      this.varCoding.fragmenting = newFragmenting;
      this.lastChangeFrom$.next('var-codes-full fragmenting');
    }
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

  smartSchemer() {
    if (this.varCoding) {
      const dialogRef = this.generateCodingDialog.open(GenerateCodingDialogComponent, {
        width: '1000px',
        data: this.varInfo
      });
      dialogRef.afterClosed().subscribe(dialogResult => {
        if (typeof dialogResult !== 'undefined' && dialogResult !== false && dialogResult !== null && this.varCoding) {
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

  addCode(codeType: CodeType) {

  }

  ngOnDestroy(): void {
    if (this.lastChangeFromSubscription !== null) this.lastChangeFromSubscription.unsubscribe();
  }
}
