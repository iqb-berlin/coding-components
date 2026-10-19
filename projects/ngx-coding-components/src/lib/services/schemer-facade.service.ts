import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';
import { Subject } from 'rxjs';
import { SchemerService } from './schemer.service';
import { ResolveIdentifierConflictsDialogComponent } from '../dialogs/resolve-identifier-conflicts-dialog.component';
import { analyzeVariableIdentifiers } from './schemer-identifier-validation';
import { ResolveOrphanCodingsDialogComponent } from '../dialogs/resolve-orphan-codings-dialog.component';
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
  private identifierConflictResolutionGeneration = 0;
  private identifierConflictDialogRef: MatDialogRef<ResolveIdentifierConflictsDialogComponent> |
  MatDialogRef<ResolveOrphanCodingsDialogComponent> | null = null;

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
    this.identifierConflictResolutionGeneration += 1;
    this.resolvingIdentifierConflicts = false;
    this.dismissedIdentifierConflictSignature = null;
    const dialogRef = this.identifierConflictDialogRef;
    this.identifierConflictDialogRef = null;
    dialogRef?.close?.();
  }

  tryResolveIdentifierConflicts(): boolean {
    const analysis = analyzeVariableIdentifiers(
      this.schemerService.varList,
      this.schemerService.codingScheme?.variableCodings || []
    );

    if (!analysis.hasProblems) {
      if (
        this.resolvingIdentifierConflicts ||
        this.identifierConflictDialogRef
      ) {
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

    const generation = this.identifierConflictResolutionGeneration;
    const scheme = this.schemerService.codingScheme;
    const snapshot = JSON.stringify([this.schemerService.varList, scheme?.variableCodings]);
    const plan = getOrphanCodingResolutionPlan(this.schemerService.varList, scheme?.variableCodings || []);
    const canResolve = plan.conflicts.length > 0 && plan.problems.length === 0;
    const dialogRef = canResolve ? this.dialog.open(ResolveOrphanCodingsDialogComponent, {
      width: '850px',
      maxWidth: '95vw',
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
          ...(plan.problems.length ? { recoveryProblems: plan.problems } : {})
        }
      }
    );
    this.identifierConflictDialogRef = dialogRef;

    dialogRef.afterClosed().subscribe(result => {
      if (generation !== this.identifierConflictResolutionGeneration) return;

      this.identifierConflictDialogRef = null;
      this.resolvingIdentifierConflicts = false;
      if (canResolve && Array.isArray(result)) {
        const currentSnapshot = JSON.stringify([
          this.schemerService.varList, this.schemerService.codingScheme?.variableCodings
        ]);
        if (scheme !== this.schemerService.codingScheme || currentSnapshot !== snapshot) {
          this.dismissedIdentifierConflictSignature = null;
          this.identifierConflictChanges.next(false);
          return;
        }
        if (scheme && this.schemerService.userRole !== 'RO') {
          const resolved = resolveOrphanCodings(this.schemerService.varList, scheme.variableCodings, result);
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
