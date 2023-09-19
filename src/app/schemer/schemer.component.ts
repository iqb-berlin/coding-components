import {Component, EventEmitter, Input, Output, ViewEncapsulation} from '@angular/core';
import {ResponseScheme, VariableInfo} from "@iqb/responses";
import {VariableCodingData} from "@iqb/responses/src/response-scheme/response-scheme";
import {BehaviorSubject} from "rxjs";
import {SimpleInputDialogComponent, SimpleInputDialogData} from "./dialogs/simple-input-dialog.component";
import {MessageDialogComponent, MessageDialogData, MessageType} from "./dialogs/message-dialog.component";
import {ConfirmDialogComponent, ConfirmDialogData} from "./dialogs/confirm-dialog.component";
import {SelectVariableDialogComponent, SelectVariableDialogData} from "./dialogs/select-variable-dialog.component";
import {MatDialog} from "@angular/material/dialog";
import {TranslateService} from "@ngx-translate/core";

@Component({
  selector: 'iqb-schemer',
  templateUrl: './schemer.component.html',
  styleUrls: ['./schemer.component.scss'],
  encapsulation: ViewEncapsulation.ShadowDom
})
export class SchemerComponent {
  @Output() responseSchemeChanged = new EventEmitter<ResponseScheme | null>();

  _responseScheme: ResponseScheme | null = null;
  @Input()
  set responseScheme(value: any) {
      this._responseScheme = null;
      if (value) {
          if (typeof value === 'string') {
              this._responseScheme = value ? JSON.parse(value) : null;
          } else {
              this._responseScheme = value;
          }
      }
      this.updateVariableLists();
  }
  get responseScheme(): ResponseScheme | null {
    return this._responseScheme;
  }

  @Input() showChecker: boolean = false;
  @Input() showFileMenu: boolean = false;
  _varList: VariableInfo[] = [];
  @Input()
  set varList(value: any) {
    this._varList = [];
    console.log('#3');
    if (value) {
      if (typeof value === 'string') {
        this._varList = value ? JSON.parse(value) : [];
        console.log('#1');
      } else {
        this._varList = value;
        console.log('#2');
      }
      this._responseScheme = new ResponseScheme();
      this._responseScheme.variableCodings = [];
      this._varList.forEach(c => {
        if (this._responseScheme) {
          this._responseScheme.variableCodings.push(ResponseScheme.fromVariableInfo(c));
          console.log('#4');
        }
      });
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

  constructor(
    private translateService: TranslateService,
    private confirmDialog: MatDialog,
    private messageDialog: MatDialog,
    private selectVariableDialog: MatDialog,
    private inputDialog: MatDialog
  ) { }

  updateVariableLists() {
    this.basicVariables = this._responseScheme && this._responseScheme.variableCodings ?
      this._responseScheme?.variableCodings.filter(c => (c.sourceType === 'BASE'))
        .sort((a, b) => {
          const idA = a.id.toUpperCase();
          const idB = b.id.toUpperCase();
          if (idA < idB) return -1;
          if (idA > idB) return 1;
          return 0;
        }) : [];
    this.derivedVariables = this._responseScheme && this._responseScheme.variableCodings ?
      this._responseScheme?.variableCodings.filter(c => (c.sourceType !== 'BASE'))
        .sort((a, b) => {
          const idA = a.id.toUpperCase();
          const idB = b.id.toUpperCase();
          if (idA < idB) return -1;
          if (idA > idB) return 1;
          return 0;
        }) : [];
    this.allVariableIds = this._responseScheme ?
      this._responseScheme.variableCodings.map(c => c.id) : [];
    this.codingStatus = {};
    if (this._responseScheme && this._responseScheme.variableCodings) {
      this._responseScheme.variableCodings.forEach(v => {
        this.codingStatus[v.id] = this.getCodingStatus(v);
      })
    }
  }

  getCodingStatus(c: VariableCodingData): string {
    if (c.sourceType === 'BASE') {
      const myVarInfo = this._varList.find(v => v.id === c.id);
      if (myVarInfo) {
        return (c.codes.length > 0 || c.manualInstruction.length > 0) ? 'HAS_CODES' : 'EMPTY';
      } else {
        return 'INVALID_SOURCE';
      }
    } else if (c.deriveSources.length > 0) {
      const invalidSources = c.deriveSources.filter(cc => cc === c.id || this.allVariableIds.indexOf(cc) < 0);
      if (invalidSources.length > 0) {
        return 'INVALID_SOURCE';
      } else {
        return (c.codes.length > 0 || c.manualInstruction.length > 0) ? 'HAS_CODES' : 'EMPTY';
      }
    } else {
      return 'INVALID_SOURCE';
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
            if (this._responseScheme) {
                this._responseScheme.variableCodings.push(<VariableCodingData>{
                    id: result,
                    label: result,
                    sourceType: 'DERIVE_CONCAT',
                    deriveSources: [],
                    deriveSourceType: 'CODE',
                    valueTransformations: [],
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
        this.responseSchemeChanged.emit(this._responseScheme);
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
        if (result !== false && this._responseScheme) {
          this.selectedCoding$.next(null);
          this._responseScheme.variableCodings = this._responseScheme.variableCodings.filter(c => c.id !== selectedCoding.id);
          this.updateVariableLists();
          this.responseSchemeChanged.emit(this._responseScheme);
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
            const modifyiedVariableIds = this.allVariableIds.filter(v => v !== selectedCoding.id);
            const normalisedId = result.toUpperCase();
            const idAlreadyExists = modifyiedVariableIds.find(v => v.toUpperCase() === normalisedId);
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
            this.responseSchemeChanged.emit(this._responseScheme);
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
    if (selectedCoding && this._responseScheme) {
      const dialogData = <SelectVariableDialogData>{
        title: 'Kodierung kopieren',
        prompt: 'Bitte Zielvariable wählen! Achtung: Die Kodierungsdaten der Zielvariable werden komplett überschrieben.',
        variables: this._responseScheme.variableCodings.filter(c => c.id !== selectedCoding.id).map(c => c.id),
        okButtonLabel: 'Kopieren'
      };
      const dialogRef = this.selectVariableDialog.open(SelectVariableDialogComponent, {
        width: '400px',
        data: dialogData
      });
      dialogRef.afterClosed().subscribe(result => {
        if (result !== false && this._responseScheme) {
          const targetCoding = this._responseScheme.variableCodings.find(c => c.id === result);
          if (targetCoding) {
            const newCoding = ResponseScheme.copy(selectedCoding);
            newCoding.id = targetCoding.id;
            this._responseScheme.variableCodings = this._responseScheme.variableCodings.filter(c => c.id !== targetCoding.id);
            this._responseScheme.variableCodings.push(newCoding);
            this.updateVariableLists();
            this.responseSchemeChanged.emit(this._responseScheme);
          }
        }
      });
    }
  }
}

