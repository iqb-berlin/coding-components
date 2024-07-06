import { Injectable } from '@angular/core';
import {
  CodingScheme,
  DeriveConcatDelimiter,
  RuleMethodParameterCount,
  VariableCodingData,
  VariableInfo,
  VariableValue
} from '@iqb/responses';

@Injectable({
  providedIn: 'root'
})
export class SchemerService {
  codingScheme: CodingScheme | null = null;
  varList: VariableInfo[] = [];
  allVariableIds: string[] = [];
  ruleMethodParameterCount = RuleMethodParameterCount;

  getVarInfoByCoding(varCoding: VariableCodingData): VariableInfo | undefined {
    if (varCoding.sourceType === 'BASE') {
      return this.varList.find(v => v.id === varCoding.id);
    } if (varCoding.sourceType === 'COPY_VALUE') {
      if (varCoding.deriveSources && varCoding.deriveSources.length > 0) {
        return this.varList.find(v => v.id === varCoding.deriveSources[0]);
      }
    } else if (varCoding.sourceType === 'CONCAT_CODE') {
      if (varCoding.deriveSources && varCoding.deriveSources.length > 0) {
        const codes: (number | null)[][] = [];
        varCoding.deriveSources.forEach(s => {
          if (this.codingScheme) {
            const coding = this.codingScheme.variableCodings.find(v => v.id === s);
            codes.push(coding ? coding.codes.map(c => c.id) : []);
          }
        });
        let resultArray: string[] = [];
        codes.forEach(c => {
          if (resultArray.length > 0) {
            const newArray: string[] = [];
            resultArray.forEach(oldEntry => {
              c.forEach(cEntry => {
                if (cEntry) newArray.push(`${oldEntry}${DeriveConcatDelimiter}${cEntry}`);
              });
            });
            resultArray = newArray;
          } else {
            c.forEach(cEntry => {
              if (cEntry) resultArray.push(cEntry.toString(10));
            });
          }
        });
        console.log(resultArray);
        return <VariableInfo>{
          id: varCoding.id,
          type: 'string',
          format: '',
          multiple: false,
          nullable: false,
          values: resultArray.map(r => <VariableValue>{
            value: r, label: ''
          }),
          valuePositionLabels: [],
          valuesComplete: true,
          page: ''
        };
      }
    } else if (varCoding.deriveSources && varCoding.deriveSources.length > 0) {
      return <VariableInfo>{
        id: varCoding.id,
        type: 'integer',
        format: '',
        multiple: false,
        nullable: false,
        values: [],
        valuePositionLabels: [],
        valuesComplete: false,
        page: ''
      };
    }
    return undefined;
  }

  variableIdExists(checkId: string, oldId?: string): boolean {
    const modifiedVariableIds = this.allVariableIds.filter(v => !oldId || v !== oldId);
    const normalisedId = checkId.toUpperCase();
    return !!modifiedVariableIds.find(v => v.toUpperCase() === normalisedId);
  }
}
