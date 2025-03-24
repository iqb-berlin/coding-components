import {
  AfterViewInit, Component, EventEmitter, Input, OnDestroy, Output, ViewChild
} from '@angular/core';
import { CodingSchemeFactory, CodingSchemeProblem } from '@iqb/responses';
import { BehaviorSubject, debounceTime, Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { CodingFactory } from '@iqb/responses/coding-factory';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatNavList, MatListItem } from '@angular/material/list';
import { AsyncPipe } from '@angular/common';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { CodingScheme, VariableCodingData } from '@iqbspecs/coding-scheme/coding-scheme.interface';
import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';
import { CodingSchemeDialogComponent } from '../dialogs/coding-scheme-dialog.component';
import { SchemerService, UserRoleType } from '../services/schemer.service';
import { ShowCodingProblemsDialogComponent } from '../dialogs/show-coding-problems-dialog.component';
import { VarCodingComponent } from '../var-coding/var-coding.component';
import {
  SelectVariableDialogComponent,
  SelectVariableDialogData
} from '../dialogs/select-variable-dialog.component';
import { MessageDialogComponent, MessageDialogData, MessageType } from '../dialogs/message-dialog.component';
import { SimpleInputDialogComponent, SimpleInputDialogData } from '../dialogs/simple-input-dialog.component';
import { ShowDependencyTreeDialogComponent } from '../dialogs/show-dependency-tree-dialog.component';
import {
  EditSourceParametersDialog,
  EditSourceParametersDialogData
} from '../var-coding/dialogs/edit-source-parameters-dialog.component';

@Component({
  selector: 'iqb-schemer',
  templateUrl: './schemer.component.html',
  styleUrls: ['./schemer.component.scss'], // ,    // encapsulation: ViewEncapsulation.ShadowDom

  standalone: true,
  imports: [MatNavList,
    MatTooltipModule,
    MatListItem,
    MatButton,
    MatIcon,
    VarCodingComponent,
    AsyncPipe,
    TranslateModule,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger]
})

export class SchemerComponent implements OnDestroy, AfterViewInit {
  @ViewChild(VarCodingComponent) varCodingElement: VarCodingComponent | undefined;
  @Output() codingSchemeChanged = new EventEmitter<CodingScheme | null>();

  @Input()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set codingScheme(value: CodingScheme | null) {
    this.schemerService.codingScheme = value;
    this.updateVariableLists();
  }

  get codingScheme(): CodingScheme | null {
    return this.schemerService.codingScheme;
  }

  @Input()
  set userRole(value: UserRoleType) {
    this.schemerService.userRole = value;
  }

  @Input()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set varList(value: any) {
    this.schemerService.varList = [];
    if (value) {
      if (typeof value === 'string') {
        this.schemerService.varList = value ? JSON.parse(value) : [];
      } else {
        this.schemerService.varList = value;
      }
      this.selectVarScheme();
      this.updateVariableLists();
    }
  }

  get varList(): VariableInfo[] {
    return this.schemerService.varList;
  }

  basicVariables: VariableCodingData[] = [];
  derivedVariables: VariableCodingData[] = [];
  codingStatus: { [id: string]: string; } = {};
  selectedCoding$ = new BehaviorSubject<VariableCodingData | null>(null);
  problems: CodingSchemeProblem[] = [];
  varCodingChangedSubscription: Subscription | null = null;

  constructor(
    private translateService: TranslateService,
    public schemerService: SchemerService,
    private messageDialog: MatDialog,
    private showCodingProblemsDialog: MatDialog,
    private showCodingSchemeDialog:MatDialog,
    private selectVariableDialog: MatDialog,
    private editSourceParametersDialog: MatDialog,
    private inputDialog: MatDialog
  ) {
  }

  ngAfterViewInit() {
    if (this.varCodingElement) {
      this.varCodingChangedSubscription = this.varCodingElement.varCodingChanged.pipe(
        debounceTime(300)
      ).subscribe(() => {
        this.updateVariableLists();
        this.codingSchemeChanged.emit(this.schemerService.codingScheme);
      });
    }
  }

  updateVariableLists() {
    if (this.schemerService.varList && this.schemerService.varList.length > 0 &&
      this.schemerService.codingScheme && this.schemerService.codingScheme.variableCodings) {
      // remove orphan+empty base variables
      const varListIds = this.schemerService.varList.map(v => v.id);
      const varCodingsToDelete = [...this.schemerService.codingScheme.variableCodings
        .filter(bv => bv.sourceType === 'BASE' && varListIds.indexOf(bv.id) < 0 && SchemerComponent.isEmptyCoding(bv))
        .map(bv => bv.id)];
      if (varCodingsToDelete.length > 0) {
        varCodingsToDelete.forEach(vc => {
          if (this.schemerService.codingScheme) {
            const varCodingIndexToDelete = this.schemerService.codingScheme.variableCodings
              .findIndex(vcd => vcd.id === vc);
            if (varCodingIndexToDelete >= 0) {
              this.schemerService.codingScheme.variableCodings.splice(varCodingIndexToDelete, 1);
            }
          }
        });
      }
      // add new base variables
      const allBaseVariableIds = this.schemerService.codingScheme.variableCodings
        .filter(v => v.sourceType === 'BASE').map(bv => bv.id);
      this.schemerService.varList
        .filter(vi => allBaseVariableIds.indexOf(vi.id) < 0 && vi.type !== 'no-value')
        .forEach(vi => {
          const found = this.schemerService.codingScheme?.variableCodings
            .find(v => v.id === vi.id);
          if (!found) {
            const newBaseVariable = CodingFactory.createCodingVariable(vi.id);
            newBaseVariable.alias = vi.alias || vi.id;
            if (this.schemerService.codingScheme) {
              this.schemerService.codingScheme.variableCodings
                .push(newBaseVariable);
            }
          }
        });
    }
    // update aliases
    this.schemerService.varList.forEach(vi => {
      if (this.schemerService.codingScheme && this.schemerService.codingScheme.variableCodings) {
        const coding = this.schemerService.codingScheme.variableCodings.find(vc => vc.id === vi.id);
        if (coding) coding.alias = vi.alias || vi.id;
      }
    });
    this.basicVariables = this.schemerService.codingScheme && this.schemerService.codingScheme.variableCodings ?
      this.schemerService.codingScheme?.variableCodings.filter(c => (c.sourceType === 'BASE'))
        .sort((a, b) => {
          const idA = (a.alias || a.id).toUpperCase();
          const idB = (b.alias || b.id).toUpperCase();
          if (idA < idB) return -1;
          if (idA > idB) return 1;
          return 0;
        }) : [];
    this.derivedVariables = this.schemerService.codingScheme && this.schemerService.codingScheme.variableCodings ?
      this.schemerService.codingScheme?.variableCodings
        .filter(c => (c.sourceType !== 'BASE' && c.sourceType !== 'BASE_NO_VALUE'))
        .sort((a, b) => {
          const idA = (a.alias || a.id).toUpperCase();
          const idB = (b.alias || b.id).toUpperCase();
          if (idA < idB) return -1;
          if (idA > idB) return 1;
          return 0;
        }) : [];
    this.schemerService.allVariableIds = this.schemerService.codingScheme ?
      this.schemerService.codingScheme.variableCodings.map(c => c.id) : [];
    this.codingStatus = {};
    if (this.schemerService.codingScheme && this.schemerService.codingScheme.variableCodings) {
      this.problems =
        CodingSchemeFactory.validate(this.schemerService.varList, this.schemerService.codingScheme.variableCodings);
      this.schemerService.codingScheme.variableCodings.forEach(v => {
        this.codingStatus[v.id] = 'OK';
        const breakingProblem = this.problems
          .find(p => p.variableId === (v.alias || v.id) && p.breaking);
        if (breakingProblem) {
          this.codingStatus[v.id] = 'ERROR';
        } else {
          const minorProblem = this.problems
            .find(p => p.variableId === (v.alias || v.id) && !p.breaking);
          if (minorProblem) this.codingStatus[v.id] = 'WARNING';
        }
      });
    }
  }

  selectVarScheme(coding: VariableCodingData | null = null) {
    this.selectedCoding$.next(coding);
  }

  private static isEmptyCoding(coding: VariableCodingData): boolean {
    if (coding.label && coding.label !== coding.id) return false;
    if (coding.processing.length > 0 || coding.fragmenting || coding.codes.length > 0) return false;
    return !(coding.manualInstruction.length > 0 || coding.codeModel !== 'NONE');
  }

  addVarScheme() {
    if (this.schemerService.userRole !== 'RO' && this.schemerService.codingScheme) {
      const dialogRef = this.editSourceParametersDialog.open(EditSourceParametersDialog, {
        width: '600px',
        minHeight: '400px',
        data: <EditSourceParametersDialogData>{
          selfId: '',
          selfAlias: '',
          sourceType: 'SUM_SCORE',
          sourceParameters: {
            processing: [],
            solverExpression: ''
          },
          deriveSources: []
        }
      });
      dialogRef.afterClosed().subscribe(dialogResult => {
        if (dialogResult !== false && this.schemerService.codingScheme) {
          const timestamp = new Date().getTime();
          const dialogResultTyped: EditSourceParametersDialogData = dialogResult;
          let errorMessage = '';
          if (!this.schemerService.checkRenamedVarAliasOk(dialogResultTyped.selfAlias)) {
            errorMessage = 'data-error.variable-id.double';
          } else {
            const newVarScheme = <VariableCodingData>{
              id: `d_${timestamp}`,
              alias: dialogResultTyped.selfAlias,
              label: '',
              sourceType: dialogResultTyped.sourceType,
              sourceParameters: dialogResultTyped.sourceParameters,
              deriveSources: dialogResultTyped.deriveSources,
              processing: [],
              codeModel: 'NONE',
              manualInstruction: '',
              codes: [],
              page: ''
            };
            this.schemerService.codingScheme.variableCodings.push(newVarScheme);
            this.selectVarScheme(newVarScheme);
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
            this.codingSchemeChanged.emit(this.schemerService.codingScheme);
            this.updateVariableLists();
          }
        }
      });
    }
  }

  deleteVarScheme() {
    if (this.schemerService.codingScheme) {
      const dialogData = <SelectVariableDialogData>{
        title: 'Variable/Kodierung löschen',
        prompt: 'Abgeleitete Variablen oder verwaiste Basisvariablen werden komplett gelöscht. ' +
          'Bei Basisvariablen wird die Kodierung gelöscht.',
        variables: this.schemerService.codingScheme.variableCodings
          .filter(c => c.sourceType !== 'BASE_NO_VALUE'),
        selectedVariable: this.selectedCoding$.getValue(),
        codingStatus: this.codingStatus,
        okButtonLabel: 'Löschen'
      };
      const dialogRef = this.selectVariableDialog.open(SelectVariableDialogComponent, {
        width: '400px',
        data: dialogData
      });
      dialogRef.afterClosed().subscribe((variables: string[]) => {
        let changed = false;
        if (variables && variables.length > 0) {
          if (this.schemerService && this.schemerService.codingScheme) {
            this.schemerService.codingScheme.variableCodings = this.schemerService.codingScheme.variableCodings
              .filter(c => !variables.includes(c.alias || c.id));
            changed = true;
            this.selectedCoding$.next(null);
            this.updateVariableLists();
            this.codingSchemeChanged.emit(this.schemerService.codingScheme);
          }
          if (changed) {
            this.updateVariableLists();
            this.codingSchemeChanged.emit(this.schemerService.codingScheme);
            this.selectedCoding$.next(null);
          }
        }
      });
    }
  }

  renameVarScheme() {
    const selectedCoding = this.selectedCoding$.getValue();
    if (selectedCoding && selectedCoding.sourceType !== 'BASE') {
      const dialogData = <SimpleInputDialogData>{
        title: 'Variable umbenennen',
        prompt: `Bitte neue Kennung der Variablen '${selectedCoding.alias}' eingeben.`,
        placeholder: 'Variablen-Kennung',
        value: selectedCoding.alias,
        saveButtonLabel: 'Speichern',
        showCancel: true
      };
      const dialogRef = this.inputDialog.open(SimpleInputDialogComponent, {
        width: '400px',
        data: dialogData
      });
      dialogRef.afterClosed().subscribe(result => {
        if (result !== false) {
          if (!this.schemerService.checkRenamedVarAliasOk(result, selectedCoding.id)) {
            this.messageDialog.open(MessageDialogComponent, {
              width: '400px',
              data: <MessageDialogData>{
                title: 'Variable umbenennen - Fehler',
                content: this.translateService.instant('data-error.variable-id.double'),
                type: MessageType.error
              }
            });
          } else {
            selectedCoding.alias = result;
            this.updateVariableLists();
            this.codingSchemeChanged.emit(this.schemerService.codingScheme);
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

  activateBaseNoValueVars() {
    if (this.schemerService.codingScheme) {
      const dialogData = <SelectVariableDialogData>{
        title: 'Basisvariable ohne Wert aktivieren',
        prompt: 'Bitte Variable wählen!',
        variables: this.schemerService.codingScheme.variableCodings
          .filter(c => c.sourceType === 'BASE_NO_VALUE'),
        okButtonLabel: 'Aktivieren'
      };
      const dialogRef = this.selectVariableDialog.open(SelectVariableDialogComponent, {
        width: '400px',
        data: dialogData
      });
      dialogRef.afterClosed().subscribe((variables: string[]) => {
        let changed = false;
        if (variables && variables.length > 0) {
          variables.forEach(v => {
            if (this.schemerService && this.schemerService.codingScheme) {
              const targetCoding = this.schemerService.codingScheme.variableCodings
                .find(c => (c.alias || c.id) === v);
              if (targetCoding) {
                targetCoding.sourceType = 'BASE';
                this.schemerService.codingScheme.variableCodings = this.schemerService.codingScheme.variableCodings
                  .filter(c => c.id !== targetCoding.id);
                this.schemerService.codingScheme.variableCodings.push(targetCoding);
                this.schemerService.varList.push({
                  id: targetCoding.id,
                  alias: targetCoding.alias || targetCoding.id,
                  type: 'string',
                  format: '',
                  multiple: true,
                  nullable: true,
                  values: [],
                  valuePositionLabels: []
                });
                changed = true;
              }
            }
          });
          if (changed) {
            this.updateVariableLists();
            this.codingSchemeChanged.emit(this.schemerService.codingScheme);
            this.selectedCoding$.next(null);
          }
        }
      });
    }
  }

  copyVarScheme() {
    const selectedCoding = this.selectedCoding$.getValue();
    if (selectedCoding && this.schemerService.codingScheme) {
      const dialogData = <SelectVariableDialogData>{
        title: `Kodierung von "${selectedCoding.alias || selectedCoding.id}" kopieren `,
        prompt: 'Die Kodierung der Zielvariable(n) wird überschrieben!',
        variables: this.schemerService.codingScheme.variableCodings
          .filter(c => c.id !== selectedCoding.id && c.sourceType !== 'BASE_NO_VALUE'),
        selectedVariable: this.selectedCoding$.getValue(),
        codingStatus: this.codingStatus,
        okButtonLabel: 'Kopieren'
      };
      const dialogRef = this.selectVariableDialog.open(SelectVariableDialogComponent, {
        width: '400px',
        data: dialogData
      });
      dialogRef.afterClosed().subscribe((variables: string[]) => {
        let changed = false;
        if (variables && variables.length > 0) {
          variables.forEach(v => {
            if (this.schemerService && this.schemerService.codingScheme) {
              const targetCoding = this.schemerService.codingScheme.variableCodings
                .find(c => (c.alias || c.id) === v);
              if (targetCoding) {
                const stringifiedCoding = JSON.stringify(selectedCoding);
                const newCoding = JSON.parse(stringifiedCoding) as VariableCodingData;
                newCoding.id = targetCoding.id;
                newCoding.alias = targetCoding.alias;
                this.schemerService.codingScheme.variableCodings = this.schemerService.codingScheme.variableCodings
                  .filter(c => c.id !== targetCoding.id);
                if (newCoding.sourceType !== 'BASE' || targetCoding.sourceType !== 'BASE') {
                  newCoding.sourceType = targetCoding.sourceType;
                  newCoding.sourceParameters = targetCoding.sourceParameters;
                  newCoding.deriveSources = targetCoding.deriveSources;
                }
                this.schemerService.codingScheme.variableCodings.push(newCoding);
                changed = true;
              }
            }
          });
          if (changed) {
            this.updateVariableLists();
            this.codingSchemeChanged.emit(this.schemerService.codingScheme);
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

  showCodingScheme(): void {
    if (!this.codingScheme) {
      return;
    }
    this.showCodingSchemeDialog.open(CodingSchemeDialogComponent, {
      width: '600px',
      data: { codingScheme: this.codingScheme }
    });
  }

  variableDependencyTree() {
    this.showCodingProblemsDialog.open(ShowDependencyTreeDialogComponent, {
      width: '1000px',
      data: this.codingScheme
    }).afterClosed().subscribe();
  }

  ngOnDestroy(): void {
    if (this.varCodingChangedSubscription !== null) this.varCodingChangedSubscription.unsubscribe();
  }
}
