import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';
import { SchemerService } from './schemer.service';
import { ResolveIdentifierConflictsDialogComponent } from '../dialogs/resolve-identifier-conflicts-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class SchemerFacadeService {
  private resolvingIdentifierConflicts = false;
  private dismissedIdentifierConflictSignature: string | null = null;
  private identifierConflictResolutionGeneration = 0;
  private identifierConflictDialogRef: MatDialogRef<ResolveIdentifierConflictsDialogComponent> | null = null;

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
    const analysis = this.schemerService.getIdentifierAnalysis();

    if (!analysis.hasProblems) {
      this.dismissedIdentifierConflictSignature = null;
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
    const dialogRef = this.dialog.open(
      ResolveIdentifierConflictsDialogComponent,
      {
        width: '850px',
        disableClose: true,
        data: {
          analysis
        }
      }
    );
    this.identifierConflictDialogRef = dialogRef;

    dialogRef.afterClosed().subscribe(() => {
      if (generation !== this.identifierConflictResolutionGeneration) return;

      this.identifierConflictDialogRef = null;
      this.resolvingIdentifierConflicts = false;
      const currentAnalysis = this.schemerService.getIdentifierAnalysis();
      this.dismissedIdentifierConflictSignature =
        currentAnalysis.hasProblems &&
        currentAnalysis.signature === analysis.signature ?
          analysis.signature :
          null;
    });

    return true;
  }
}
