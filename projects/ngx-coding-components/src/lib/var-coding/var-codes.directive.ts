import {Directive, EventEmitter, Input, Output} from '@angular/core';
import {CodeData, ProcessingParameterType, RuleMethod} from "@iqb/responses";
import {TranslateService} from "@ngx-translate/core";

export const singletonRules: RuleMethod[] = [
  'IS_FALSE', 'IS_TRUE', 'IS_NULL', 'IS_EMPTY', 'ELSE'
]
export const exclusiveNumericRules: RuleMethod[] = [
  'NUMERIC_RANGE', 'NUMERIC_LESS_THEN', 'NUMERIC_MORE_THEN',
  'NUMERIC_MAX', 'NUMERIC_MIN'
]

@Directive()
export abstract class VarCodesDirective {
  @Output() codesChanged = new EventEmitter<CodeData[]>();
  @Output() processingChanged = new EventEmitter<ProcessingParameterType[]>();
  @Output() codeModelParametersChanged = new EventEmitter<string[]>();
  @Input() public codes: CodeData[] | undefined;
  @Input() public allVariables: string[] = [];
  @Input() public processing: ProcessingParameterType[] | undefined;
  @Input() public codeModelParameters: string[] | undefined;
  elseCodeExists: Boolean | undefined;
  isEmptyCodeExists: Boolean | undefined;
  isNullCodeExists: Boolean | undefined;

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

  updateCodeExistences() {
    this.elseCodeExists = this.hasRule('ELSE');
    this.isEmptyCodeExists = this.hasRule('IS_EMPTY');
    this.isNullCodeExists = this.hasRule('IS_NULL');
  }

  addCode(emitChangeEvent = true): CodeData | null {
    if (this.codes) {
      let newCodeId = 1;
      if (this.codes.length === 1) {
        newCodeId = this.codes[0].id + 1;
      } else if (this.codes.length > 1) {
        const myCodeIds = this.codes.map(c => c.id);
        newCodeId = Math.max(...myCodeIds) + 1;
      }
      const newCode: CodeData = {
        id: newCodeId,
        label: '',
        score: 0,
        rules: [],
        manualInstruction: ''
      };
      this.codes.push(newCode);
      if (emitChangeEvent) this.codesChanged.emit(this.codes);
      return newCode;
    }
    return null;
  }

  hasRule(ruleCode: RuleMethod): boolean {
    if (this.codes) {
      const myRule = this.codes.find(c => !!c.rules.find(r => r.method === ruleCode));
      return !!myRule;
    }
    return false;
  }

  deleteCode(codeToDeleteId: number) {
    if (this.codes) {
      this.codes = this.codes.filter(c => c.id !== codeToDeleteId);
      this.codesChanged.emit(this.codes);
    }
  }

  addCodeSingleton(newCodeMethod: RuleMethod, translateService: TranslateService) {
    if (!this.hasRule(newCodeMethod)) {
      const newCode = this.addCode(false);
      if (newCode) {
        newCode.label = translateService.instant(`rule.${newCodeMethod}`);
        newCode.rules = [{
          method: newCodeMethod
        }];
        this.codesChanged.emit(this.codes);
      }
    }
  }

  setCodingModelParameter(parameterIndex: number, newValue: string): void {
    if (!this.codeModelParameters) this.codeModelParameters = [];
    while (this.codeModelParameters.length < parameterIndex + 1) this.codeModelParameters.push('');
    this.codeModelParameters[parameterIndex] = newValue;
    this.codeModelParametersChanged.emit(this.codeModelParameters);
  }
}
