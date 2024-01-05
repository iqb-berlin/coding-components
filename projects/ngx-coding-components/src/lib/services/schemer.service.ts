import { Injectable } from '@angular/core';
import {CodingScheme, DeriveConcatDelimiter, VariableCodingData, VariableInfo} from "@iqb/responses";

@Injectable({
  providedIn: 'root'
})
export class SchemerService {
  public codingScheme: CodingScheme | null = null;
  public varList: VariableInfo[] = [];
  public allVariableIds: string[] = [];

  getVarInfoByCoding(varCoding: VariableCodingData): VariableInfo | undefined {
    if (varCoding.sourceType === 'BASE') {
      return this.varList.find(v => v.id === varCoding.id);
    } else if (varCoding.sourceType === 'COPY_VALUE') {
      if (varCoding.deriveSources && varCoding.deriveSources.length > 0) {
        return this.varList.find(v => v.id === varCoding.deriveSources[0]);
      }
    } else if (varCoding.sourceType === 'CONCAT_CODE') {
      if (varCoding.deriveSources && varCoding.deriveSources.length > 0) {
        const codes: (number | null)[][] = [];
        let newPage: string | null = '';
        varCoding.deriveSources.forEach(s => {
          if (this.codingScheme) {
            const coding = this.codingScheme.variableCodings.find(v => v.id === s);
            if (coding) {
              codes.push(coding.codes.map(c => c.id));
              if (newPage !== null && coding.page) {
                if (newPage) {
                  if (newPage !== coding.page) newPage = null;
                } else {
                  newPage = coding.page;
                }
              }
            }
          }
        })
        let resultArray: string[] = [];
        codes.forEach(c => {
          if (resultArray.length > 0) {
            const newArray: string[] = [];
            resultArray.forEach(oldEntry => {
              c.forEach(cEntry => {
                if (cEntry) resultArray.push(`${oldEntry}${DeriveConcatDelimiter}${cEntry}`);
              })
            })
            resultArray = newArray;
          } else {
            c.forEach(cEntry => {
              if (cEntry) resultArray.push(cEntry.toString(10))
            })
          }
        })
        return <VariableInfo>{
          id: varCoding.id,
          type: 'string',
          format: '',
          multiple: false,
          nullable: false,
          values: resultArray as [],
          valuePositionLabels: [],
          valuesComplete: true,
          page: newPage || ''
        }
      }
    } else {
      if (varCoding.deriveSources && varCoding.deriveSources.length > 0) {
        let newPage: string | null = '';
        varCoding.deriveSources.forEach(s => {
          if (this.codingScheme) {
            const coding = this.codingScheme.variableCodings.find(v => v.id === s);
            if (coding) {
              if (newPage !== null && coding.page) {
                if (newPage) {
                  if (newPage !== coding.page) newPage = null;
                } else {
                  newPage = coding.page;
                }
              }
            }
          }
        })
        return <VariableInfo>{
          id: varCoding.id,
          type: 'integer',
          format: '',
          multiple: false,
          nullable: false,
          values: [],
          valuePositionLabels: [],
          valuesComplete: false,
          page: newPage || ''
        }
      }
    }
    return undefined;
  }

  variableIdExists(checkId: string, oldId?: string): boolean {
    const modifiedVariableIds = this.allVariableIds.filter(v => !oldId || v !== oldId);
    const normalisedId = checkId.toUpperCase();
    return !!modifiedVariableIds.find(v => v.toUpperCase() === normalisedId);
  }
}
