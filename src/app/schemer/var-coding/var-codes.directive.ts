import {Directive, EventEmitter, Input, Output} from '@angular/core';
import {CodeData, CodingRule, ProcessingParameterType} from "@iqb/responses";

@Directive()
export abstract class VarCodesDirective {
  @Output() codesChanged = new EventEmitter<CodeData[]>();
  @Output() processingChanged = new EventEmitter<ProcessingParameterType[]>();
  @Output() codeModelParametersChanged = new EventEmitter<string[]>();
  @Input() public codes: CodeData[] | undefined;
  @Input() public allVariables: string[] = [];
  @Input() public processing: ProcessingParameterType[] | undefined;
  @Input() public codeModelParameters: string[] | undefined;

  alterProcessing(processingId: ProcessingParameterType, checked: boolean) {
    if (this.processing) {
      const processPos = this.processing.indexOf(processingId);
      if (checked && processPos < 0) {
        this.processing.push(processingId);
      } else if (!checked && processPos >= 0) {
        this.processing.splice(processPos, 1);
      }
      this.processingChanged.emit(this.processing);
    }
  }

  addCode(newRules: CodingRule[] = []): number | null {
    if (this.codes) {
      const myCodeIds = this.codes.map(c => c.id);
      const newId = Math.max(...myCodeIds) + 1;
      this.codes.push({
        id: newId,
        label: '',
        score: 0,
        rules: newRules,
        manualInstruction: ''
      });
      this.codesChanged.emit(this.codes);
      return newId;
    }
    return null;
  }

  deleteCode(codeToDeleteId: number) {
    if (this.codes) {
      this.codes = this.codes.filter(c => c.id !== codeToDeleteId);
      this.codesChanged.emit(this.codes);
    }
  }
}
