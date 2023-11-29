import {AfterViewInit, Component, EventEmitter, Input, OnDestroy, Output, ViewChild} from '@angular/core';
import {CodingScheme, CodingSchemeProblem, VariableCodingData, VariableInfo} from "@iqb/responses";
import {BehaviorSubject, debounceTime, Subscription} from "rxjs";
import {SimpleInputDialogComponent, SimpleInputDialogData} from "./dialogs/simple-input-dialog.component";
import {MessageDialogComponent, MessageDialogData, MessageType} from "./dialogs/message-dialog.component";
import {ConfirmDialogComponent, ConfirmDialogData} from "./dialogs/confirm-dialog.component";
import {SelectVariableDialogComponent, SelectVariableDialogData} from "./dialogs/select-variable-dialog.component";
import {MatDialog} from "@angular/material/dialog";
import {TranslateService} from "@ngx-translate/core";
import {VarCodingComponent} from "./var-coding/var-coding.component";
import {CodingFactory} from "@iqb/responses/coding-factory";
import {ShowCodingProblemsDialogComponent} from "./dialogs/show-coding-problems-dialog.component";

@Component({
  selector: 'iqb-schemer',
  templateUrl: './schemer.component.html',
  styleUrls: ['./schemer.component.scss'] //,
  // encapsulation: ViewEncapsulation.ShadowDom
})
export class SchemerComponent implements OnDestroy, AfterViewInit {
  @ViewChild(VarCodingComponent) varCodingElement: VarCodingComponent | undefined;
  @Output() codingSchemeChanged = new EventEmitter<CodingScheme | null>();

  _codingScheme: CodingScheme | null = null;
  @Input()
  set codingScheme(value: any) {
      this._codingScheme = null;
      if (value) {
          if (typeof value === 'string') {
              this._codingScheme = value ? JSON.parse(value) : null;
          } else {
              this._codingScheme = value;
          }
      }
      this.updateVariableLists();
  }
  get codingScheme(): CodingScheme | null {
    return this._codingScheme;
  }

  _varList: VariableInfo[] = [];
  @Input()
  set varList(value: any) {
    this._varList = [];
    if (value) {
      if (typeof value === 'string') {
        this._varList = value ? JSON.parse(value) : [];
      } else {
        this._varList = value;
      }
      const variableCodings: VariableCodingData[] = [];
      this._varList.forEach(c => {
        if (this._codingScheme) {
          variableCodings.push(CodingFactory.createCodingVariableFromVarInfo(c));
        }
      });
      this._codingScheme = new CodingScheme(variableCodings);
      this.updateVariableLists();
    }
  }
  get varList(): VariableInfo[] {
    return this._varList;
  }
  basicVariables: VariableCodingData[] = [];
  derivedVariables: VariableCodingData[] = [];
  allVariableIds: string[] = [];
  codingStatus: { [id: string] : string; } = {};
  selectedCoding$ = new BehaviorSubject<VariableCodingData | null>(null);
  problems: CodingSchemeProblem[] = [];
  varCodingChangedSubscription: Subscription | null = null;

  constructor(
    private translateService: TranslateService,
    private confirmDialog: MatDialog,
    private messageDialog: MatDialog,
    private showCodingProblemsDialog: MatDialog,
    private selectVariableDialog: MatDialog,
    private inputDialog: MatDialog
  ) { }

  ngAfterViewInit() {
    if (this.varCodingElement) {
      this.varCodingChangedSubscription = this.varCodingElement.varCodingChanged.pipe(
        debounceTime(500)
      ).subscribe(() => {
        this.updateVariableLists();
      });
    }
  }
  updateVariableLists() {
    this.basicVariables = this._codingScheme && this._codingScheme.variableCodings ?
      this._codingScheme?.variableCodings.filter(c => (c.sourceType === 'BASE'))
        .sort((a, b) => {
          const idA = a.id.toUpperCase();
          const idB = b.id.toUpperCase();
          if (idA < idB) return -1;
          if (idA > idB) return 1;
          return 0;
        }) : [];
    this.derivedVariables = this._codingScheme && this._codingScheme.variableCodings ?
      this._codingScheme?.variableCodings.filter(c => (c.sourceType !== 'BASE'))
        .sort((a, b) => {
          const idA = a.id.toUpperCase();
          const idB = b.id.toUpperCase();
          if (idA < idB) return -1;
          if (idA > idB) return 1;
          return 0;
        }) : [];
    this.allVariableIds = this._codingScheme ?
      this._codingScheme.variableCodings.map(c => c.id) : [];
    this.codingStatus = {};
    if (this._codingScheme && this._codingScheme.variableCodings) {
      this.problems = this._codingScheme?.validate(this._varList);
      this._codingScheme.variableCodings.forEach(v => {
        this.codingStatus[v.id] = 'OK';
        const breakingProblem = this.problems
          .find(p => p.variableId === v.id && p.breaking);
        if (breakingProblem) {
          this.codingStatus[v.id] = 'ERROR';
        } else {
          const minorProblem = this.problems
            .find(p => p.variableId === v.id && !p.breaking);
          if (minorProblem) this.codingStatus[v.id] = 'WARNING';
        }
      });
    }
  }

  selectVarScheme(coding: VariableCodingData | null = null) {
    this.selectedCoding$.next(coding);
  }

  addVarScheme() {
    const dialogData = <SimpleInputDialogData>{
      title: 'Neue abgeleitete Variable',
      prompt: 'Bitte Kennung der Variablen eingeben.',
      placeholder: 'Variablen-Kennung',
      value: '',
      saveButtonLabel: 'Speichern',
      showCancel: true
    };
    const dialogRef = this.inputDialog.open(SimpleInputDialogComponent, {
      width: '400px',
      data: dialogData
    });
    dialogRef.afterClosed().subscribe(result => {
      let errorMessage = '';
      if (result !== false) {
        const checkPattern = /^[a-zA-Z0-9_]+$/;
        if (checkPattern.exec(result)) {
          const normalisedId = result.toUpperCase();
          const idAlreadyExists = this.allVariableIds.find(v => v.toUpperCase() === normalisedId);
          if (idAlreadyExists) {
            errorMessage = 'data-error.variable-id.double';
          } else {
            if (this._codingScheme) {
                this._codingScheme.variableCodings.push(<VariableCodingData>{
                  id: result,
                  label: result,
                  sourceType: 'SUM_CODE',
                  deriveSources: [],
                  processing: [],
                  manualInstruction: '',
                  codes: []
                });
            }
          }
        } else {
          errorMessage = 'data-error.variable-id.character';
        }
      }
      if (errorMessage) {
        this.messageDialog.open(MessageDialogComponent, {
          width: '400px',
          data: <MessageDialogData>{
            title: 'Neue Variable - Fehler',
            content: this.translateService.instant(errorMessage),
            type: MessageType.error
          }
        });
      } else {
        this.codingSchemeChanged.emit(this._codingScheme);
        this.updateVariableLists();
      }
    });
  }

  deleteVarScheme() {
    const selectedCoding = this.selectedCoding$.getValue();
    if (selectedCoding && (selectedCoding.sourceType !== 'BASE' || (this.codingStatus[selectedCoding.id] && this.codingStatus[selectedCoding.id] === 'INVALID_SOURCE'))) {
      const dialogRef = this.confirmDialog.open(ConfirmDialogComponent, {
        width: '400px',
        data: <ConfirmDialogData>{
          title: 'Löschen Variable',
          content: `Die Variable "${selectedCoding.id}" wird gelöscht. Fortsetzen?`,
          confirmButtonLabel: 'Löschen',
          showCancel: true
        }
      });
      dialogRef.afterClosed().subscribe(result => {
        if (result !== false && this._codingScheme) {
          this.selectedCoding$.next(null);
          this._codingScheme.variableCodings = this._codingScheme.variableCodings.filter(c => c.id !== selectedCoding.id);
          this.updateVariableLists();
          this.codingSchemeChanged.emit(this._codingScheme);
        }
      });
    } else {
      this.messageDialog.open(MessageDialogComponent, {
        width: '400px',
        data: <MessageDialogData>{
          title: 'Löschen Variable',
          content: 'Bitte erst eine abgeleitete oder verwaiste Variable auswählen!',
          type: MessageType.error
        }
      });
    }
  }

  renameVarScheme() {
    const selectedCoding = this.selectedCoding$.getValue();
    if (selectedCoding && selectedCoding.sourceType !== 'BASE') {
      const dialogData = <SimpleInputDialogData>{
        title: 'Variable umbenennen',
        prompt: `Bitte neue Kennung der Variablen '${selectedCoding.id}' eingeben.`,
        placeholder: 'Variablen-Kennung',
        value: selectedCoding.id,
        saveButtonLabel: 'Speichern',
        showCancel: true
      };
      const dialogRef = this.inputDialog.open(SimpleInputDialogComponent, {
        width: '400px',
        data: dialogData
      });
      dialogRef.afterClosed().subscribe(result => {
        if (result !== false) {
          let errorMessage = '';
          const checkPattern = /^[a-zA-Z0-9_]+$/;
          if (checkPattern.exec(result)) {
            const modifiedVariableIds = this.allVariableIds.filter(v => v !== selectedCoding.id);
            const normalisedId = result.toUpperCase();
            const idAlreadyExists = modifiedVariableIds.find(v => v.toUpperCase() === normalisedId);
            if (idAlreadyExists) {
              errorMessage = 'data-error.variable-id.double';
            } else {
              selectedCoding.id = result;
            }
          } else {
            errorMessage = 'data-error.variable-id.character';
          }
          if (errorMessage) {
            this.messageDialog.open(MessageDialogComponent, {
              width: '400px',
              data: <MessageDialogData>{
                title: 'Variable umbenennen - Fehler',
                content: this.translateService.instant(errorMessage),
                type: MessageType.error
              }
            });
          } else {
            this.updateVariableLists();
            this.codingSchemeChanged.emit(this._codingScheme);
          }
        }
      });
    } else {
      this.messageDialog.open(MessageDialogComponent, {
        width: '400px',
        data: <MessageDialogData>{
          title: 'Variable umbenennen',
          content: 'Bitte erst eine abgeleitete Variable auswählen!',
          type: MessageType.error
        }
      });
    }
  }

  copyVarScheme() {
    const selectedCoding = this.selectedCoding$.getValue();
    if (selectedCoding && this._codingScheme) {
      const dialogData = <SelectVariableDialogData>{
        title: 'Kodierung kopieren',
        prompt: 'Bitte Zielvariable wählen! Achtung: Die Kodierungsdaten der Zielvariable werden komplett überschrieben.',
        variables: this._codingScheme.variableCodings.filter(c => c.id !== selectedCoding.id).map(c => c.id),
        okButtonLabel: 'Kopieren'
      };
      const dialogRef = this.selectVariableDialog.open(SelectVariableDialogComponent, {
        width: '400px',
        data: dialogData
      });
      dialogRef.afterClosed().subscribe(result => {
        if (result !== false && this._codingScheme) {
          const targetCoding = this._codingScheme.variableCodings.find(c => c.id === result);
          if (targetCoding) {
            const stringifiedCoding = JSON.stringify(selectedCoding)
            const newCoding = JSON.parse(stringifiedCoding) as VariableCodingData;
            newCoding.id = targetCoding.id;
            this._codingScheme.variableCodings = this._codingScheme.variableCodings.filter(c => c.id !== targetCoding.id);
            this._codingScheme.variableCodings.push(newCoding);
            this.updateVariableLists();
            this.codingSchemeChanged.emit(this._codingScheme);
          }
        }
      });
    }
  }

  checkVarScheme() {
    if (this.problems) {
      const dialogRef = this.showCodingProblemsDialog.open(ShowCodingProblemsDialogComponent, {
        width: '1000px',
        data: this.problems
      });
      dialogRef.afterClosed().subscribe();
    }
  }

  ngOnDestroy(): void {
    if (this.varCodingChangedSubscription !== null) this.varCodingChangedSubscription.unsubscribe();
  }
}
