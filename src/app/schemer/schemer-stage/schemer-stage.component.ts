import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { MainDataService } from '../../services/main-data.service';
import { Coding } from '../../classes/coding.class';
import { ConfirmDialogComponent, ConfirmDialogData } from '../dialogs/confirm-dialog.component';
import { MessageDialogComponent, MessageDialogData, MessageType } from '../dialogs/message-dialog.component';
import { SimpleInputDialogComponent, SimpleInputDialogData } from '../dialogs/simple-input-dialog.component';
import { SelectVariableDialogComponent, SelectVariableDialogData } from '../dialogs/select-variable-dialog.component';

@Component({
  selector: 'schemer-stage',
  templateUrl: './schemer-stage.component.html',
  styleUrls: ['./schemer-stage.component.scss']
})
export class SchemerStageComponent implements OnInit {
  constructor(
    public mainDataService: MainDataService,
    private newVarSchemeDialog: MatDialog,
    private translateService: TranslateService,
    private confirmDialog: MatDialog,
    private messageDialog: MatDialog,
    private selectVariableDialog: MatDialog,
    private inputDialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.mainDataService.syncVariables();
  }

  selectVarScheme(coding: Coding | null = null) {
    this.mainDataService.selectedCoding$.next(coding);
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
      if (result !== false) {
        const errorMessage = this.mainDataService.addCoding(result);
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
          this.mainDataService.updateCodingsStatus();
        }
      }
    });
  }

  resetScheme() {
    this.mainDataService.selectedCoding$.next(null);
    this.mainDataService.invalidDataFormat = '';
    this.mainDataService.setCodingSchemesChanged();
  }

  deleteVarScheme() {
    const selectedCoding = this.mainDataService.selectedCoding$.getValue();
    if (selectedCoding && (selectedCoding.sourceType !== 'BASE' || selectedCoding.status === 'INVALID_SOURCE')) {
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
        if (result !== false) {
          this.mainDataService.removeCoding(selectedCoding);
          this.mainDataService.updateCodingsStatus();
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
    const selectedCoding = this.mainDataService.selectedCoding$.getValue();
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
          const errorMessage = this.mainDataService.renameCoding(selectedCoding.id, result);
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
            this.mainDataService.updateCodingsStatus();
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
    const selectedCoding = this.mainDataService.selectedCoding$.getValue();
    if (selectedCoding) {
      const dialogData = <SelectVariableDialogData>{
        title: 'Kodierung kopieren',
        prompt: 'Bitte Zielvariable wählen! Achtung: Die Kodierungsdaten der Zielvariable werden komplett überschrieben.',
        variables: this.mainDataService.codings.filter(c => c.id !== selectedCoding.id).map(c => c.id),
        okButtonLabel: 'Kopieren'
      };
      const dialogRef = this.selectVariableDialog.open(SelectVariableDialogComponent, {
        width: '400px',
        data: dialogData
      });
      dialogRef.afterClosed().subscribe(result => {
        if (result !== false) {
          this.mainDataService.copyCoding(selectedCoding.id, result);
        }
      });
    }
  }
}
