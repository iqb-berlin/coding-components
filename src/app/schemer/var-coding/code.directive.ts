import {Directive, EventEmitter, Input, Output} from '@angular/core';
import {CodeData} from "@iqb/responses";

@Directive()
export abstract class CodeDirective {
  @Output() codeChanged = new EventEmitter<CodeData[]>();
  @Input() public code: CodeData | undefined;
  @Input() allCodes: CodeData[] | undefined;
}
