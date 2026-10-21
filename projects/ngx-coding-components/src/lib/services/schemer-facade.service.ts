import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';
import { Subject } from 'rxjs';
import { DialogContext } from './dialog-context';
import { SchemerService } from './schemer.service';
import { ResolveIdentifierConflictsDialogComponent } from '../dialogs/resolve-identifier-conflicts-dialog.component';
import { analyzeVariableIdentifiers } from './schemer-identifier-validation';
import { ResolveOrphanCodingsDialogComponent } from '../dialogs/resolve-orphan-codings-dialog.component';
import { resolveDerivedCodingConflicts } from './derived-coding-conflict-resolution';
import {
  getOrphanCodingResolutionPlan,
  resolveOrphanCodings
} from './orphan-coding-resolution';

@Injectable({
  providedIn: 'root'
})
export class SchemerFacadeService {
  private resolvingIdentifierConflicts = false;
  private dismissedIdentifierConflictSignature: string | null = null;
  // Content snapshots are checked separately so in-place host updates can reopen recovery.
  private readonly dialogContext = new DialogContext(() => []);

  private readonly identifierConflictChanges = new Subject<boolean>();
  readonly identifierConflictChanges$ = this.identifierConflictChanges.asObservable();

  constructor(
    private schemerService: SchemerService,
    private dialog: MatDialog
  ) {}

  setVarList(value: VariableInfo[]): void {
    this.schemerService.setVarList(value);
  }

  resetIdentifierConflictResolutionState(): void {
    this.resolvingIdentifierConflicts = false;
    this.dismissedIdentifierConflictSignature = null;
    this.dialogContext.invalidate();
  }

  tryResolveIdentifierConflicts(): boolean {
    const analysis = analyzeVariableIdentifiers(
      this.schemerService.varList,
      this.schemerService.codingScheme?.variableCodings || []
    );

    if (!analysis.hasProblems) {
      if (this.resolvingIdentifierConflicts) {
        this.resetIdentifierConflictResolutionState();
      } else {
        this.dismissedIdentifierConflictSignature = null;
      }
      return false;
    }

    if (this.resolvingIdentifierConflicts) {
      return true;
    }

    if (this.dismissedIdentifierConflictSignature === analysis.signature) {
      return true;
    }

    this.resolvingIdentifierConflicts = true;

    const scheme = this.schemerService.codingScheme;
    const snapshot = JSON.stringify([this.schemerService.varList, scheme?.variableCodings]);
    const plan = getOrphanCodingResolutionPlan(this.schemerService.varList, scheme?.variableCodings || []);
    const canResolve = plan.conflicts.length > 0 && plan.problems.length === 0;
    const dialogRef = canResolve ? this.dialog.open(ResolveOrphanCodingsDialogComponent, {
      width: '850px',
      maxWidth: '95vw',
      maxHeight: '95vh',
      disableClose: true,
      data: {
        conflicts: structuredClone(plan.conflicts),
        canEdit: () => this.schemerService.userRole !== 'RO'
      }
    }) : this.dialog.open(
      ResolveIdentifierConflictsDialogComponent,
      {
        width: '850px',
        disableClose: true,
        data: {
          analysis,
          variables: structuredClone(this.schemerService.varList),
          variableCodings: structuredClone(scheme?.variableCodings || []),
          canEdit: () => this.schemerService.userRole !== 'RO',
          ...(plan.problems.length ? { recoveryProblems: plan.problems } : {})
        }
      }
    );
    this.dialogContext.afterClosed(dialogRef).subscribe(result => {
      this.resolvingIdentifierConflicts = false;
      const orphanResult = canResolve && result &&
        Array.isArray(result.decisions) && Array.isArray(result.discardedIds);
      const derivedResult = !canResolve && result && Array.isArray(result.derivedChanges);
      if (orphanResult || derivedResult) {
        const currentSnapshot = JSON.stringify([
          this.schemerService.varList, this.schemerService.codingScheme?.variableCodings
        ]);
        if (scheme !== this.schemerService.codingScheme || currentSnapshot !== snapshot) {
          this.dismissedIdentifierConflictSignature = null;
          this.identifierConflictChanges.next(false);
          return;
        }
        if (scheme && this.schemerService.userRole !== 'RO') {
          const resolved = orphanResult ? resolveOrphanCodings(
            this.schemerService.varList, scheme.variableCodings, result.decisions, result.discardedIds
          ) : resolveDerivedCodingConflicts(
            this.schemerService.varList, scheme.variableCodings, result.derivedChanges, result.confirmDeletion
          ).variableCodings;
          if (resolved) {
            scheme.variableCodings = resolved;
            this.dismissedIdentifierConflictSignature = null;
            this.identifierConflictChanges.next(true);
            return;
          }
        }
      }
      const currentAnalysis = analyzeVariableIdentifiers(
        this.schemerService.varList,
        this.schemerService.codingScheme?.variableCodings || []
      );
      this.dismissedIdentifierConflictSignature =
        currentAnalysis.hasProblems &&
        currentAnalysis.signature === analysis.signature ?
          analysis.signature :
          null;
    });

    return true;
  }
}
