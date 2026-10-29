import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  signal,
  ViewChild
} from '@angular/core';
import {
  BehaviorSubject,
  firstValueFrom,
  Subscription
} from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { CodingFactory } from '@iqb/responses/coding-factory';
import { normalizeVariableInfoType } from '@iqb/responses';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatNavList, MatListItem, MatDivider } from '@angular/material/list';
import { AsyncPipe } from '@angular/common';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import {
  CodingScheme,
  CodingSchemeVersionMajor,
  CodingSchemeVersionMinor
} from '@iqbspecs/coding-scheme';
import { VariableCodingData } from '@iqbspecs/coding-scheme/coding-scheme.interface';
import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';
import { CodingSchemeDialogComponent } from '../dialogs/coding-scheme-dialog.component';
import { SchemerService, UserRoleType } from '../services/schemer.service';
import { DialogContext } from '../services/dialog-context';
import { FileService } from '../services/file.service';
import { ShowCodingProblemsDialogComponent } from '../dialogs/show-coding-problems-dialog.component';
import { VarCodingComponent } from '../var-coding/var-coding.component';
import {
  SelectVariableDialogComponent,
  SelectVariableDialogData
} from '../dialogs/select-variable-dialog.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData
} from '../dialogs/confirm-dialog.component';
import {
  MessageDialogComponent,
  MessageDialogData,
  MessageType
} from '../dialogs/message-dialog.component';
import {
  SimpleInputDialogComponent,
  SimpleInputDialogData
} from '../dialogs/simple-input-dialog.component';
import { ShowDependencyTreeDialogComponent } from '../dialogs/show-dependency-tree-dialog.component';
import {
  EditSourceParametersDialog,
  EditSourceParametersDialogData
} from '../var-coding/dialogs/edit-source-parameters-dialog.component';
import { SchemerFacadeService } from '../services/schemer-facade.service';
import { parseVarListInput } from '../services/schemer-varlist-utils';
import { SchemerInfoDialogComponent } from '../dialogs/schemer-info-dialog.component';
import {
  CodingSchemeValidationProblem,
  validateCodingScheme
} from '../services/coding-scheme-validation';
import { validateVariableCodingChange } from '../services/schemer-identifier-validation';
import { getRemovableOrphanBaseCodings } from '../services/base-coding-cleanup';

@Component({
  selector: 'iqb-schemer',
  templateUrl: './schemer.component.html',
  styleUrls: ['./schemer.component.scss'], // ,    // encapsulation: ViewEncapsulation.ShadowDom

  standalone: true,
  imports: [
    MatNavList,
    MatTooltipModule,
    MatListItem,
    MatButton,
    MatIcon,
    VarCodingComponent,
    AsyncPipe,
    TranslateModule,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    MatDivider
  ]
})
export class SchemerComponent implements OnDestroy {
  private readonly dialogContext = new DialogContext(() => [
    this.schemerService.codingScheme, this.schemerService.userRole, this.selectedCoding$.value
  ]);

  @ViewChild(VarCodingComponent)
  set varCodingElement(value: VarCodingComponent | undefined) {
    this.varCodingChangedSubscription?.unsubscribe();
    this.varCodingChangedSubscription = null;

    if (!value) return;

    this.varCodingChangedSubscription = value.varCodingChanged
      .subscribe(() => {
        this.changeDetector.markForCheck();
        this.updateVariableLists();
        if (!this.hasIdentifierConflict) {
          this.codingSchemeChanged.emit(this.schemerService.codingScheme);
        }
      });
  }

  @Output() codingSchemeChanged = new EventEmitter<CodingScheme | null>();

  @Input()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set codingScheme(value: CodingScheme | null) {
    if (value !== this.codingScheme) {
      this.dialogContext.invalidate();
      this.schemerFacade.resetIdentifierConflictResolutionState();
    }
    this.schemerService.setCodingScheme(value);
    this.updateVariableLists();
  }

  get codingScheme(): CodingScheme | null {
    return this.schemerService.codingScheme;
  }

  @Input()
  set userRole(value: UserRoleType) {
    if (value !== this.schemerService.userRole) this.dialogContext.invalidate();
    this.schemerService.setUserRole(value);
  }

  @Input()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set varList(value: any) {
    this.dialogContext.invalidate();
    this.schemerFacade.resetIdentifierConflictResolutionState();
    this.schemerService.setVarList([]);
    if (value) {
      this.schemerService.setVarList(parseVarListInput(value));
      this.updateVariableLists();
    }
  }

  get varList(): VariableInfo[] {
    return this.schemerService.varList;
  }

  basicVariables: VariableCodingData[] = [];
  derivedVariables: VariableCodingData[] = [];
  codingStatus: { [id: string]: string } = {};
  selectedCoding$ = new BehaviorSubject<VariableCodingData | null>(null);
  problems: CodingSchemeValidationProblem[] = [];
  private readonly validationSucceeded = signal(false);
  hasIdentifierConflict = false;
  varCodingChangedSubscription: Subscription | null = null;
  private identifierConflictSubscription: Subscription;

  constructor(
    private translateService: TranslateService,
    public schemerService: SchemerService,
    private schemerFacade: SchemerFacadeService,
    private messageDialog: MatDialog,
    private showCodingProblemsDialog: MatDialog,
    private showCodingSchemeDialog: MatDialog,
    private selectVariableDialog: MatDialog,
    private editSourceParametersDialog: MatDialog,
    private inputDialog: MatDialog,
    private changeDetector: ChangeDetectorRef
  ) {
    this.identifierConflictSubscription = this.schemerFacade.identifierConflictChanges$.subscribe(changed => {
      this.updateVariableLists();
      if (changed && !this.hasIdentifierConflict) this.codingSchemeChanged.emit(this.schemerService.codingScheme);
    });
  }

  resolveIdentifierConflicts(): void {
    this.schemerFacade.resetIdentifierConflictResolutionState();
    this.updateVariableLists();
  }

  private tr(
    key: string, // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params?: any
  ): string {
    return this.translateService.instant(key, params);
  }

  showSchemerInfo(): void {
    this.messageDialog.open(SchemerInfoDialogComponent, {
      width: '650px'
    });
  }

  updateVariableLists() {
    this.changeDetector.markForCheck();
    this.validationSucceeded.set(false);
    this.problems = [];
    const previousSelectedId = this.selectedCoding$.value?.id;

    if (this.schemerFacade.tryResolveIdentifierConflicts()) {
      this.hasIdentifierConflict = true;
      this.selectVarScheme();
      this.basicVariables = [];
      this.derivedVariables = [];
      this.codingStatus = {};
      this.problems = [];
      return;
    }
    this.hasIdentifierConflict = false;

    if (
      this.schemerService.varList &&
      this.schemerService.varList.length > 0 &&
      this.schemerService.codingScheme &&
      this.schemerService.codingScheme.variableCodings
    ) {
      // remove orphan+empty base variables
      const variableCodings =
        this.schemerService.codingScheme.variableCodings;
      const varCodingsToDelete = getRemovableOrphanBaseCodings(
        this.schemerService.varList, variableCodings
      );
      if (varCodingsToDelete.size > 0) {
        varCodingsToDelete.forEach(vc => {
          const varCodingIndexToDelete = variableCodings.indexOf(vc);
          if (varCodingIndexToDelete >= 0) {
            variableCodings.splice(varCodingIndexToDelete, 1);
          }
        });
      }
      // add new base variables
      const allBaseVariableIds =
        this.schemerService.codingScheme.variableCodings
          .filter(v => v.sourceType === 'BASE')
          .map(bv => bv.id);
      this.schemerService.varList
        .filter(
          vi => allBaseVariableIds.indexOf(vi.id) < 0 && normalizeVariableInfoType(vi.type) !== 'NO_VALUE'
        )
        .forEach(vi => {
          const found = this.schemerService.codingScheme?.variableCodings.find(
            v => v.id === vi.id
          );
          if (!found) {
            const newBaseVariable = CodingFactory.createCodingVariable(vi.id);
            newBaseVariable.alias = vi.alias || vi.id;
            if (this.schemerService.codingScheme) {
              this.schemerService.codingScheme.variableCodings.push(
                newBaseVariable
              );
            }
          }
        });
    }
    // update aliases
    this.schemerService.varList.forEach(vi => {
      if (
        this.schemerService.codingScheme &&
        this.schemerService.codingScheme.variableCodings
      ) {
        const coding = this.schemerService.codingScheme.variableCodings.find(
          vc => vc.id === vi.id
        );
        if (coding) coding.alias = vi.alias || vi.id;
      }
    });
    this.basicVariables =
      this.schemerService.codingScheme &&
      this.schemerService.codingScheme.variableCodings ?
        this.schemerService.codingScheme?.variableCodings
          .filter(c => c.sourceType === 'BASE')
          .sort((a, b) => {
            const idA = (a.alias || a.id).toUpperCase();
            const idB = (b.alias || b.id).toUpperCase();
            if (idA < idB) return -1;
            if (idA > idB) return 1;
            return 0;
          }) :
        [];
    this.derivedVariables =
      this.schemerService.codingScheme &&
      this.schemerService.codingScheme.variableCodings ?
        this.schemerService.codingScheme?.variableCodings
          .filter(
            c => c.sourceType !== 'BASE' && c.sourceType !== 'BASE_NO_VALUE'
          )
          .sort((a, b) => {
            const idA = (a.alias || a.id).toUpperCase();
            const idB = (b.alias || b.id).toUpperCase();
            if (idA < idB) return -1;
            if (idA > idB) return 1;
            return 0;
          }) :
        [];
    this.schemerService.allVariableIds = this.schemerService.codingScheme ?
      this.schemerService.codingScheme.variableCodings.map(c => c.id) :
      [];
    this.codingStatus = {};
    if (
      this.schemerService.codingScheme &&
      this.schemerService.codingScheme.variableCodings
    ) {
      try {
        this.problems = validateCodingScheme(
          this.schemerService.varList,
          this.schemerService.codingScheme.variableCodings
        );
        this.validationSucceeded.set(true);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('validateCodingScheme failed', e);
        this.problems = [];
      }
      this.schemerService.codingScheme.variableCodings.forEach(v => {
        if (!this.validationSucceeded()) {
          this.codingStatus[v.id] = 'UNCHECKED';
          return;
        }
        this.codingStatus[v.id] = 'OK';
        const breakingProblem = this.problems.find(
          p => p.variableId === (v.alias || v.id) && p.breaking
        );
        if (breakingProblem) {
          this.codingStatus[v.id] = 'ERROR';
        } else {
          const minorProblem = this.problems.find(
            p => p.variableId === (v.alias || v.id) && !p.breaking
          );
          if (minorProblem) this.codingStatus[v.id] = 'WARNING';
        }
      });
    }

    const availableVariables = [
      ...this.basicVariables,
      ...this.derivedVariables
    ];
    const nextSelection =
      availableVariables.find(variable => variable.id === previousSelectedId) ??
      this.derivedVariables[0] ??
      this.basicVariables[0] ??
      null;
    this.selectVarScheme(nextSelection);
  }

  selectVarScheme(coding: VariableCodingData | null = null) {
    if (coding !== this.selectedCoding$.value) this.dialogContext.invalidate();
    this.selectedCoding$.next(coding);
  }

  async exportVariable(): Promise<void> {
    if (
      !this.schemerService.codingScheme ||
      this.schemerService.codingScheme.variableCodings.length === 0
    ) {
      this.messageDialog.open(MessageDialogComponent, {
        width: '400px',
        data: <MessageDialogData>{
          title: this.tr('schemer.export.title'),
          content: this.tr('schemer.export.no-scheme'),
          type: MessageType.info
        }
      });
      return;
    }

    const dialogRef = this.selectVariableDialog.open(
      SelectVariableDialogComponent,
      {
        width: '600px',
        data: <SelectVariableDialogData>{
          title: this.tr('schemer.export.select.title'),
          prompt: this.tr('schemer.export.select.prompt'),
          variables: this.schemerService.codingScheme.variableCodings,
          selectedVariable: this.selectedCoding$.getValue(),
          codingStatus: this.codingStatus,
          okButtonLabel: this.tr('schemer.export.select.ok')
        }
      }
    );

    const selectedAliases = await firstValueFrom(
      this.dialogContext.afterClosed(dialogRef), { defaultValue: undefined }
    );
    const selectedAlias =
      Array.isArray(selectedAliases) && selectedAliases.length > 0 ?
        selectedAliases[0] :
        null;
    if (!selectedAlias) return;

    const selectedVar = this.schemerService.codingScheme.variableCodings.find(
      v => (v.alias || v.id) === selectedAlias
    );
    if (!selectedVar) return;

    const payload = {
      type: 'iqb-variable-export',
      version: 1,
      variableId: selectedVar.id,
      variableCoding: selectedVar
    };

    FileService.saveToFile(
      JSON.stringify(payload, null, 2),
      `${selectedVar.id}.variable.json`
    );
  }

  async importVariable(): Promise<void> {
    if (this.schemerService.userRole === 'RO') return;
    if (!this.schemerService.codingScheme) {
      this.messageDialog.open(MessageDialogComponent, {
        width: '400px',
        data: <MessageDialogData>{
          title: this.tr('schemer.import.title'),
          content: this.tr('schemer.import.no-scheme'),
          type: MessageType.error
        }
      });
      return;
    }

    const isCurrent = this.dialogContext.capture();
    try {
      const parsed = JSON.parse(await FileService.loadFile(['.json']));
      if (!isCurrent()) return;
      if (
        !parsed ||
        parsed.type !== 'iqb-variable-export' ||
        parsed.version !== 1 ||
        !parsed.variableCoding
      ) {
        throw new Error(this.tr('schemer.import.invalid-format'));
      }

      const importedVar: VariableCodingData = parsed.variableCoding;
      if (!importedVar.id) {
        throw new Error(this.tr('schemer.import.missing-id'));
      }

      const existingIndex =
        this.schemerService.codingScheme.variableCodings.findIndex(
          v => v.id === importedVar.id
        );
      const identifierAnalysis = validateVariableCodingChange(
        this.schemerService.varList,
        this.schemerService.codingScheme.variableCodings,
        {
          coding: importedVar,
          replacedCodingId: existingIndex >= 0 ? importedVar.id : undefined
        }
      );
      if (identifierAnalysis.hasProblems) {
        throw new Error(this.tr('schemer.import.invalid-identifiers'));
      }

      if (existingIndex >= 0) {
        const confirmRef = this.messageDialog.open(ConfirmDialogComponent, {
          width: '450px',
          data: <ConfirmDialogData>{
            title: this.tr('schemer.import.overwrite.title'),
            content: this.tr('schemer.import.overwrite.content', {
              variable: importedVar.alias || importedVar.id
            }),
            confirmButtonLabel: this.tr('schemer.import.overwrite.confirm'),
            showCancel: true
          }
        });
        const confirmed = await firstValueFrom(this.dialogContext.afterClosed(confirmRef), { defaultValue: undefined });
        if (!confirmed || !isCurrent()) return;
        this.schemerService.codingScheme.variableCodings.splice(
          existingIndex,
          1,
          importedVar
        );
      } else {
        this.schemerService.codingScheme.variableCodings.push(importedVar);
      }

      this.updateVariableLists();
      this.codingSchemeChanged.emit(this.schemerService.codingScheme);
    } catch (e) {
      if (!isCurrent()) return;
      this.messageDialog.open(MessageDialogComponent, {
        width: '450px',
        data: <MessageDialogData>{
          title: this.tr('schemer.import.error.title'),
          content:
            e instanceof Error ?
              e.message :
              this.tr('schemer.import.error.unknown'),
          type: MessageType.error
        }
      });
    }
  }

  addVarScheme() {
    if (
      this.schemerService.userRole !== 'RO' &&
      this.schemerService.codingScheme
    ) {
      const dialogRef = this.editSourceParametersDialog.open(
        EditSourceParametersDialog,
        {
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
        }
      );
      this.dialogContext.afterClosed(dialogRef).subscribe(dialogResult => {
        this.changeDetector.markForCheck();
        if (dialogResult && typeof dialogResult === 'object' && this.schemerService.codingScheme) {
          const timestamp = new Date().getTime();
          const dialogResultTyped: EditSourceParametersDialogData =
            dialogResult;
          const newVarScheme = <VariableCodingData>{
            id: `d_${timestamp}`,
            alias: dialogResultTyped.selfAlias,
            label: '',
            sourceType: dialogResultTyped.sourceType,
            sourceParameters: dialogResultTyped.sourceParameters,
            deriveSources: dialogResultTyped.deriveSources,
            processing: [],
            codeModel: 'MANUAL_AND_RULES',
            manualInstruction: '',
            codes: [],
            page: ''
          };
          const identifierAnalysis = validateVariableCodingChange(
            this.schemerService.varList,
            this.schemerService.codingScheme.variableCodings,
            { coding: newVarScheme }
          );
          let errorMessage = '';
          if (identifierAnalysis.hasProblems) {
            errorMessage = 'data-error.variable-id.double';
          } else {
            this.schemerService.codingScheme.variableCodings.push(newVarScheme);
            this.selectVarScheme(newVarScheme);
          }
          if (errorMessage) {
            this.messageDialog.open(MessageDialogComponent, {
              width: '400px',
              data: <MessageDialogData>{
                title: this.tr('schemer.add.error.title'),
                content: this.translateService.instant(errorMessage),
                type: MessageType.error
              }
            });
          } else {
            this.updateVariableLists();
            this.codingSchemeChanged.emit(this.schemerService.codingScheme);
          }
        }
      });
    }
  }

  deleteVarScheme() {
    if (this.schemerService.codingScheme) {
      const dialogData = <SelectVariableDialogData>{
        title: this.tr('schemer.delete.title'),
        prompt: this.tr('schemer.delete.prompt'),
        variables: this.schemerService.codingScheme.variableCodings.filter(
          c => c.sourceType !== 'BASE_NO_VALUE' &&
            !this.schemerService.isProtectedBaseVariable(c)
        ),
        selectedVariable: this.selectedCoding$.getValue(),
        codingStatus: this.codingStatus,
        okButtonLabel: this.tr('schemer.delete.ok')
      };
      const dialogRef = this.selectVariableDialog.open(
        SelectVariableDialogComponent,
        {
          width: '400px',
          data: dialogData
        }
      );
      this.dialogContext.afterClosed(dialogRef).subscribe((variables: string[]) => {
        this.changeDetector.markForCheck();
        let changed = false;
        if (variables && variables.length > 0) {
          if (this.schemerService && this.schemerService.codingScheme) {
            const oldLength =
              this.schemerService.codingScheme.variableCodings.length;
            this.schemerService.codingScheme.variableCodings =
              this.schemerService.codingScheme.variableCodings.filter(
                c => this.schemerService.isProtectedBaseVariable(c) ||
                  !variables.includes(c.alias || c.id)
              );
            changed =
              this.schemerService.codingScheme.variableCodings.length !==
              oldLength;
          }
          if (changed) {
            this.updateVariableLists();
            this.codingSchemeChanged.emit(this.schemerService.codingScheme);
          }
        }
      });
    }
  }

  renameVarScheme() {
    const selectedCoding = this.selectedCoding$.getValue();
    if (selectedCoding && selectedCoding.sourceType !== 'BASE') {
      const dialogData = <SimpleInputDialogData>{
        title: this.tr('schemer.rename.title'),
        prompt: this.tr('schemer.rename.prompt', {
          variable: selectedCoding.alias
        }),
        placeholder: this.tr('schemer.rename.placeholder'),
        value: selectedCoding.alias,
        saveButtonLabel: this.tr('schemer.rename.save'),
        showCancel: true
      };
      const dialogRef = this.inputDialog.open(SimpleInputDialogComponent, {
        width: '400px',
        data: dialogData
      });
      this.dialogContext.afterClosed(dialogRef).subscribe(result => {
        this.changeDetector.markForCheck();
        if (typeof result === 'string') {
          const variableCodings =
            this.schemerService.codingScheme?.variableCodings;
          const identifierAnalysis = variableCodings ?
            validateVariableCodingChange(
              this.schemerService.varList,
              variableCodings,
              {
                coding: { ...selectedCoding, alias: result },
                replacedCodingId: selectedCoding.id
              }
            ) :
            null;
          if (!identifierAnalysis || identifierAnalysis.hasProblems) {
            const errorMessage = identifierAnalysis?.hasInvalid ?
              'data-error.variable-id.character' :
              'data-error.variable-id.double';
            this.messageDialog.open(MessageDialogComponent, {
              width: '400px',
              data: <MessageDialogData>{
                title: this.tr('schemer.rename.error.title'),
                content: this.translateService.instant(errorMessage),
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
          title: this.tr('schemer.rename.title'),
          content: this.tr('schemer.rename.select-derived-first'),
          type: MessageType.error
        }
      });
    }
  }

  activateBaseNoValueVars() {
    if (this.schemerService.codingScheme) {
      const dialogData = <SelectVariableDialogData>{
        title: this.tr('schemer.activate-base-no-value.title'),
        prompt: this.tr('schemer.activate-base-no-value.prompt'),
        variables: this.schemerService.codingScheme.variableCodings.filter(
          c => c.sourceType === 'BASE_NO_VALUE'
        ),
        okButtonLabel: this.tr('schemer.activate-base-no-value.ok')
      };
      const dialogRef = this.selectVariableDialog.open(
        SelectVariableDialogComponent,
        {
          width: '400px',
          data: dialogData
        }
      );
      this.dialogContext.afterClosed(dialogRef).subscribe((variables: string[]) => {
        this.changeDetector.markForCheck();
        let changed = false;
        if (variables && variables.length > 0) {
          variables.forEach(v => {
            if (this.schemerService && this.schemerService.codingScheme) {
              const targetCoding =
                this.schemerService.codingScheme.variableCodings.find(
                  c => (c.alias || c.id) === v
                );
              if (targetCoding) {
                targetCoding.sourceType = 'BASE';
                this.schemerService.codingScheme.variableCodings =
                  this.schemerService.codingScheme.variableCodings.filter(
                    c => c.id !== targetCoding.id
                  );
                this.schemerService.codingScheme.variableCodings.push(
                  targetCoding
                );
                const existingVariableInfo = this.schemerService.varList.find(
                  vi => vi.id === targetCoding.id
                );
                const referenceType = existingVariableInfo?.type || this.schemerService.varList[0]?.type;
                // Preserve the entry's spelling; the public VariableInfo type still describes 1.x.
                const stringType = (
                  referenceType && referenceType === referenceType.toUpperCase() ? 'STRING' : 'string'
                ) as VariableInfo['type'];
                if (existingVariableInfo && normalizeVariableInfoType(existingVariableInfo.type) === 'NO_VALUE') {
                  existingVariableInfo.alias =
                    targetCoding.alias || targetCoding.id;
                  existingVariableInfo.type = stringType;
                  existingVariableInfo.format = '';
                  existingVariableInfo.multiple = true;
                  existingVariableInfo.nullable = true;
                  existingVariableInfo.values = [];
                  existingVariableInfo.valuePositionLabels = [];
                } else if (!existingVariableInfo) {
                  this.schemerService.varList.push({
                    id: targetCoding.id,
                    alias: targetCoding.alias || targetCoding.id,
                    type: stringType,
                    format: '',
                    multiple: true,
                    nullable: true,
                    values: [],
                    valuePositionLabels: []
                  });
                }
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

  copyVarScheme() {
    const selectedCoding = this.selectedCoding$.getValue();
    if (selectedCoding && this.schemerService.codingScheme) {
      const dialogData = <SelectVariableDialogData>{
        title: this.tr('schemer.copy.title', {
          variable: selectedCoding.alias || selectedCoding.id
        }),
        prompt: this.tr('schemer.copy.prompt'),
        variables: this.schemerService.codingScheme.variableCodings.filter(
          c => c.id !== selectedCoding.id && c.sourceType !== 'BASE_NO_VALUE'
        ),
        selectedVariable: this.selectedCoding$.getValue(),
        codingStatus: this.codingStatus,
        okButtonLabel: this.tr('schemer.copy.ok')
      };
      const dialogRef = this.selectVariableDialog.open(
        SelectVariableDialogComponent,
        {
          width: '400px',
          data: dialogData
        }
      );
      this.dialogContext.afterClosed(dialogRef).subscribe((variables: string[]) => {
        this.changeDetector.markForCheck();
        let changed = false;
        if (variables && variables.length > 0) {
          variables.forEach(v => {
            if (this.schemerService && this.schemerService.codingScheme) {
              const targetCoding =
                this.schemerService.codingScheme.variableCodings.find(
                  c => (c.alias || c.id) === v
                );
              if (targetCoding) {
                const stringifiedCoding = JSON.stringify(selectedCoding);
                const newCoding = JSON.parse(
                  stringifiedCoding
                ) as VariableCodingData;
                newCoding.id = targetCoding.id;
                newCoding.alias = targetCoding.alias;
                this.schemerService.codingScheme.variableCodings =
                  this.schemerService.codingScheme.variableCodings.filter(
                    c => c.id !== targetCoding.id
                  );
                if (
                  newCoding.sourceType !== 'BASE' ||
                  targetCoding.sourceType !== 'BASE'
                ) {
                  newCoding.sourceType = targetCoding.sourceType;
                  newCoding.sourceParameters = targetCoding.sourceParameters;
                  newCoding.deriveSources = targetCoding.deriveSources;
                }
                this.schemerService.codingScheme.variableCodings.push(
                  newCoding
                );
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
    if (!this.validationSucceeded()) {
      this.messageDialog.open(MessageDialogComponent, {
        width: '600px',
        data: {
          type: MessageType.error,
          title: this.tr('varList.validation.title'),
          content: this.tr('varList.validation.failed'),
          closeButtonLabel: this.tr('dialog-close')
        } satisfies MessageDialogData
      });
      return;
    }
    if (this.problems) {
      const dialogRef = this.showCodingProblemsDialog.open(
        ShowCodingProblemsDialogComponent,
        {
          width: '1000px',
          data: this.problems
        }
      );
      this.dialogContext.afterClosed(dialogRef).subscribe();
    }
  }

  showCodingScheme(): void {
    if (!this.codingScheme) {
      return;
    }
    const payload = {
      variableCodings: this.codingScheme.variableCodings,
      version: `${CodingSchemeVersionMajor}.${CodingSchemeVersionMinor}`
    };
    this.showCodingSchemeDialog.open(CodingSchemeDialogComponent, {
      width: '600px',
      data: { codingScheme: payload }
    });
  }

  variableDependencyTree() {
    this.showCodingProblemsDialog
      .open(ShowDependencyTreeDialogComponent, {
        width: '1000px',
        data: this.codingScheme
      })
      .afterClosed()
      .subscribe();
  }

  ngOnDestroy(): void {
    this.dialogContext.destroy();
    this.identifierConflictSubscription.unsubscribe();
    if (this.varCodingChangedSubscription !== null) this.varCodingChangedSubscription.unsubscribe();
    this.schemerFacade.resetIdentifierConflictResolutionState();
  }
}
