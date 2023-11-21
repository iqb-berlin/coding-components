import {Directive, EventEmitter, Input, Output} from '@angular/core';
import {CodeData, ProcessingParameterType} from "@iqb/responses";

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
}
