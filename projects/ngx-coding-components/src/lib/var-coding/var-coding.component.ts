import {Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges} from '@angular/core';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {MatDialog} from '@angular/material/dialog';
import {TranslateService} from '@ngx-translate/core';
import {RichTextEditDialogComponent} from '../rich-text-editor/rich-text-edit-dialog.component';
import {VariableCodingData, VariableInfo} from "@iqb/responses";
import {BehaviorSubject, debounceTime, Subscription} from "rxjs";
import {ShowCodingDialogComponent} from "../dialogs/show-coding-dialog.component";
import {GenerateCodingDialogComponent, GeneratedCodingData} from "../dialogs/generate-coding-dialog.component";
import {SchemerService} from "../services/schemer.service";

@Component({
  selector: 'var-coding',
  templateUrl: './var-coding.component.html',
  styleUrls: ['./var-coding.component.scss']
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
      this.lastChangeFrom$.next('var-codes-full fragmenting')
    }
  }

  updateVarInfo() {
    console.log('#');
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
          title: this.translateService.instant('manual-instruction.prompt-general'),
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
          this.varCoding.codeModelParameters = newCoding.codeModelParameters;
          this.varCoding.codes = newCoding.codes;
          console.log(this.varCoding.codes);
          this.varCodingChanged.emit(this.varCoding);
        }
      });
    }
  }

  ngOnDestroy(): void {
    if (this.lastChangeFromSubscription !== null) this.lastChangeFromSubscription.unsubscribe();
  }
}
