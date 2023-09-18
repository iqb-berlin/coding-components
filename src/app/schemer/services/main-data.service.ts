import { EventEmitter, Injectable, Output } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {ResponseScheme, VariableInfo} from "@iqb/responses";
import {CoderVariable} from "@iqb/responses/dist/response-scheme/coder-variable";

@Injectable({
  providedIn: 'root'
})
export class MainDataService {
  invalidDataFormat = '';
  varList: VariableInfo[] = [];
  varIdList: string[] = [];
  responseScheme: ResponseScheme | null = null;
  selectedCoding$ = new BehaviorSubject<CoderVariable | null>(null);

  syncVariables() {
    this.codings = this.varList
      .reduce((accumulator, current) => {
        if (!this.getCodingById(current.id)) {
          accumulator.push(ResponseScheme.fromVariableInfo(current));
        }
        return accumulator;
      }, this.codings);
    MainDataService.sortByID(this.codings);
    this.updateCodingsStatus();
  }

  addCoding(newCodingId: string): string {
    const errorMessage = this.checkVariableId(newCodingId);
    if (errorMessage) return errorMessage;
    this.codings.push(new Coding({
      id: newCodingId,
      label: newCodingId,
      sourceType: 'DERIVE_CONCAT',
      deriveSources: [],
      deriveSourceType: 'CODE',
      valueTransformations: [],
      manualInstruction: '',
      codes: []
    }));
    MainDataService.sortByID(this.codings);
    this.setCodingSchemesChanged();
    return '';
  }

  setSortedVarList(variables: VariableInfo[]): void {
    this.varList = MainDataService.sortByID(variables);
    this.varIdList = this.varList.map(v => v.id);
  }

  private static sortByID<T>(array: Array<T & { id: string }>): Array<T & { id: string }> {
    return array.sort((a, b) => {
      const idA = a.id.toUpperCase();
      const idB = b.id.toUpperCase();
      if (idA < idB) return -1;
      if (idA > idB) return 1;
      return 0;
    });
  }

  setCodingSchemesChanged(): void {
    this.codingSchemeChanged.emit(this.codings);
  }

  filteredCodings(codings: Coding[], checkForBase: boolean): Coding[] {
    return codings
      .filter(c => (c.sourceType === 'BASE' && checkForBase) ||
        (c.sourceType !== 'BASE' && !checkForBase));
  }

  allCodingIds(): string[] {
    return this.codings.map(coding => coding.id);
  }

  getCodingById(id: string): Coding | undefined {
    return this.codings.find(coding => coding.id === id);
  }

  removeCoding(selectedCoding: Coding) {
    this.selectedCoding$.next(null);
    this.codings = this.codings.filter(c => c.id !== selectedCoding.id);
    this.codings.forEach(c => c.validate());
    this.setCodingSchemesChanged();
  }

  private checkVariableId(idToCheck: string, oldId?: string): string {
    let returnValue = '';
    const checkPattern = /^[a-zA-Z][a-zA-Z-\d_]+$/;
    if (checkPattern.exec(idToCheck)) {
      const otherIds = oldId ?
        this.codings.filter(c => c.id !== oldId).map(c => c.id.toUpperCase()) :
        this.codings.map(c => c.id.toUpperCase());
      if (otherIds.indexOf(idToCheck.toUpperCase()) >= 0) {
        returnValue = 'data-error.variable-id.double';
      }
    } else {
      returnValue = 'data-error.variable-id.character';
    }
    return returnValue;
  }

  renameCoding(oldId: string, newId: string): string {
    const errorMessage = this.checkVariableId(newId, oldId);
    if (errorMessage) return errorMessage;
    this.codings.forEach(c => {
      if (c.id === oldId) {
        c.id = newId;
        this.selectedCoding$.next(c);
      } else if (c.deriveSources.length > 0) {
        c.deriveSources = c.deriveSources.map(ds => {
          if (ds === oldId) return newId;
          return ds;
        });
      }
    });
    this.codings.forEach(c => c.validate());
    MainDataService.sortByID(this.codings);
    this.setCodingSchemesChanged();
    return '';
  }

  updateCodingsStatus() {
    const allVariableIds = this.allCodingIds();
    this.codings.forEach(c => {
      if (c.sourceType === 'BASE') {
        if (this.varIdList.indexOf(c.id) < 0) {
          c.status = 'INVALID_SOURCE';
        } else {
          c.validate();
        }
      } else if (c.deriveSources.length > 0) {
        const invalidSources = c.deriveSources.filter(cc => allVariableIds.indexOf(cc) < 0);
        if (invalidSources.length > 0) {
          c.status = 'INVALID_SOURCE';
        } else {
          c.validate();
        }
      } else {
        c.status = 'INVALID_SOURCE';
      }
    });
  }

  copyCoding(sourceId: string, targetId: string) {
    const sourceCoding = this.codings.filter(c => c.id === sourceId);
    const targetCoding = this.codings.filter(c => c.id === targetId);
    if (sourceCoding.length > 0 && targetCoding.length > 0) {
      targetCoding[0].copyFullFrom(sourceCoding[0]);
      this.updateCodingsStatus();
    }
  }
}
