import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';
import { SchemerService } from './schemer.service';
import { ResolveVarListDuplicatesDialogComponent } from '../dialogs/resolve-varlist-duplicates-dialog.component';
import { getVarListConflictAnalysis } from './schemer-varlist-validation';

@Injectable({
  providedIn: 'root'
})
export class SchemerFacadeService {
  private resolvingVarListDuplicates = false;
  private dismissedVarListDuplicateSignature: string | null = null;

  constructor(
    private schemerService: SchemerService,
    private dialog: MatDialog
  ) {}

  setVarList(value: VariableInfo[]): void {
    this.schemerService.setVarList(value);
  }

  tryResolveVarListDuplicates(): boolean {
    if (this.resolvingVarListDuplicates) {
      return true;
    }

    const varList = this.schemerService.varList || [];
    if (varList.length === 0) {
      return false;
    }

    const analysis = getVarListConflictAnalysis(varList);

    if (!analysis.hasProblems) {
      this.dismissedVarListDuplicateSignature = null;
      return false;
    }

    if (this.dismissedVarListDuplicateSignature === analysis.signature) {
      return true;
    }

    this.resolvingVarListDuplicates = true;

    const dialogRef = this.dialog.open(
      ResolveVarListDuplicatesDialogComponent,
      {
        width: '850px',
        disableClose: true,
        data: {
          varList: this.schemerService.varList
        }
      }
    );

    dialogRef.afterClosed().subscribe(() => {
      this.resolvingVarListDuplicates = false;
      this.dismissedVarListDuplicateSignature = analysis.signature;
    });

    return true;
  }
}
