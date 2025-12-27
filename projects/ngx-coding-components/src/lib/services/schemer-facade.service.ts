import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';
import { Observable, Subject } from 'rxjs';
import { SchemerService } from './schemer.service';
import {
  ResolveVarListDuplicatesDialogComponent,
  ResolveVarListDuplicatesDialogResult
} from '../dialogs/resolve-varlist-duplicates-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class SchemerFacadeService {
  private resolvingVarListDuplicates = false;
  private dismissedVarListDuplicateSignature: string | null = null;

  private readonly _varListDuplicatesResolved =
    new Subject<ResolveVarListDuplicatesDialogResult>();

  get varListDuplicatesResolved$(): Observable<ResolveVarListDuplicatesDialogResult> {
    return this._varListDuplicatesResolved.asObservable();
  }

  constructor(
    private schemerService: SchemerService,
    private dialog: MatDialog
  ) {}

  setVarList(value: VariableInfo[]): void {
    this.schemerService.setVarList(value);
  }

  tryResolveVarListDuplicates(): boolean {
    if (this.resolvingVarListDuplicates) {
      return false;
    }

    const varList = this.schemerService.varList || [];
    if (varList.length === 0) {
      return false;
    }

    const signature = varList
      .map(
        v => `${(v.id || '').trim().toUpperCase()}|${(v.alias || v.id || '')
          .trim()
          .toUpperCase()}`
      )
      .join(';;');

    if (this.dismissedVarListDuplicateSignature === signature) {
      return false;
    }

    const idCounts = new Map<string, number>();
    const aliasCounts = new Map<string, number>();

    varList.forEach(v => {
      const id = (v.id || '').trim();
      const aliasOrId = (v.alias || v.id || '').trim();

      if (id) {
        const key = id.toUpperCase();
        idCounts.set(key, (idCounts.get(key) || 0) + 1);
      }
      if (aliasOrId) {
        const key = aliasOrId.toUpperCase();
        aliasCounts.set(key, (aliasCounts.get(key) || 0) + 1);
      }
    });

    const hasDuplicateId = Array.from(idCounts.values()).some(c => c > 1);
    const hasDuplicateAlias = Array.from(aliasCounts.values()).some(c => c > 1);

    if (!hasDuplicateId && !hasDuplicateAlias) {
      return false;
    }

    this.resolvingVarListDuplicates = true;

    const reservedIds = this.schemerService.codingScheme?.variableCodings ?
      this.schemerService.codingScheme.variableCodings.map(c => c.id) :
      [];

    const dialogRef = this.dialog.open(
      ResolveVarListDuplicatesDialogComponent,
      {
        width: '850px',
        disableClose: true,
        data: {
          varList: this.schemerService.varList,
          reservedIds
        }
      }
    );

    dialogRef.afterClosed().subscribe(dialogResult => {
      this.resolvingVarListDuplicates = false;

      if (!dialogResult) {
        this.dismissedVarListDuplicateSignature = signature;
        return;
      }

      const result = dialogResult as ResolveVarListDuplicatesDialogResult;
      this.dismissedVarListDuplicateSignature = null;

      this.schemerService.setVarList((result.varList || []).map(v => ({
        ...v
      })));

      if (this.schemerService.codingScheme?.variableCodings) {
        const renameMap = result.idRenameMap || {};

        this.schemerService.codingScheme.variableCodings.forEach(vc => {
          const newId = renameMap[vc.id];
          if (newId) {
            vc.id = newId;
          }
          if (vc.deriveSources && vc.deriveSources.length > 0) {
            vc.deriveSources = vc.deriveSources.map(ds => renameMap[ds] || ds);
          }
        });
      }

      this._varListDuplicatesResolved.next(result);
    });

    return true;
  }
}
