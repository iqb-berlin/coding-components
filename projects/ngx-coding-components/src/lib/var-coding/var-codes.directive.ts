import {Directive, EventEmitter, Input, Output} from '@angular/core';
import {CodeData, CodingRule, ProcessingParameterType, RuleMethod, RuleSet, VariableInfo} from "@iqb/responses";

export const singletonRules: RuleMethod[] = [
  'IS_FALSE', 'IS_TRUE', 'IS_NULL', 'IS_EMPTY'
]
export const exclusiveNumericRules: RuleMethod[] = [
  'NUMERIC_RANGE', 'NUMERIC_LESS_THAN', 'NUMERIC_MORE_THAN',
  'NUMERIC_MAX', 'NUMERIC_MIN'
]

@Directive()
export abstract class VarCodesDirective {
  @Output() codesChanged = new EventEmitter<CodeData[]>();
  @Output() processingChanged = new EventEmitter<ProcessingParameterType[]>();
  @Output() fragmentingChanged = new EventEmitter<string>();
  @Output() codeModelParametersChanged = new EventEmitter<string[]>();
  @Input() public codes: CodeData[] | undefined;
  @Input() public processing: ProcessingParameterType[] | undefined;
  @Input() public varInfo: VariableInfo | undefined;
  @Input() public fragmenting: string | undefined;
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
    this.elseCodeExists = this.codes && !!this.codes.find(c => ['RESIDUAL', 'RESIDUAL_AUTO'].includes(c.type));
    this.isEmptyCodeExists = this.hasRule('IS_EMPTY');
    this.isNullCodeExists = this.hasRule('IS_NULL');
  }

  addCode(emitChangeEvent = true): CodeData | null {
    if (this.codes) {
      const myCodeIds = this.codes.map(c => c.id || 0);
      const newCodeId = myCodeIds.length > 0 ? Math.max(...myCodeIds) + 1 : 1;
      const newCode: CodeData = {
        id: newCodeId,
        type: 'UNSET',
        label: '',
        score: 0,
        ruleSetOperatorAnd: false,
        ruleSets: [<RuleSet>{
          ruleOperatorAnd: false,
          rules: []
        }],
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
      const myRule = this.codes.find(
        c => !!c.ruleSets.find(rs => !!rs.rules.find(r => r.method === ruleCode)));
      return !!myRule;
    }
    return false;
  }

  deleteCode(codeToDeleteIndex: number) {
    if (this.codes && codeToDeleteIndex >= 0 && this.codes.length > codeToDeleteIndex) {
      // const codeToDeleteIndex = this.codes.findIndex(c => c.id === codeToDeleteId);
      this.codes.splice(codeToDeleteIndex, 1);
      this.codesChanged.emit(this.codes);
    }
  }

  addCodeSingleton(newCodeMethod: RuleMethod) {
    if (!this.hasRule(newCodeMethod)) {
      const newCode = this.addCode(false);
      if (newCode) {
        newCode.ruleSets[0].rules = [{
          method: newCodeMethod
        }];
        this.codesChanged.emit(this.codes);
      }
    }
  }

  addCodeCredit(rule?: CodingRule) {
    const newCode = this.addCode(false);
    if (newCode) {
      let maxScore = 1;
      if (this.codeModelParameters && this.codeModelParameters[0]) {
        const newValue = Number.parseInt(this.codeModelParameters[0], 10);
        maxScore = Number.isNaN(newValue) ? 1 : newValue;
      }
      newCode.score = maxScore;
      newCode.label = 'Richtig';
      newCode.ruleSets = [{
        ruleOperatorAnd: false,
        rules: []
      }];
      if (rule) newCode.ruleSets[0].rules.push(rule);
      this.codesChanged.emit(this.codes);
    }
  }

  addCodeNoCredit(rule?: CodingRule) {
    const newCode = this.addCode(false);
    if (newCode) {
      newCode.score = 0;
      newCode.label = 'Falsch';
      newCode.ruleSets = [{
        ruleOperatorAnd: false,
        rules: []
      }];
      if (rule) newCode.ruleSets[0].rules.push(rule);
      this.codesChanged.emit(this.codes);
    }
  }

  addCodeElseManual() {
    const newCode = this.addCode(false);
    if (newCode) {
      newCode.score = 0;
      newCode.label = '';
      newCode.ruleSets = [];
      newCode.manualInstruction = '<p style="padding-left: 0; text-indent: 0; margin-bottom: 0; margin-top: 0">Alle anderen Antworten</p>'
      this.codesChanged.emit(this.codes);
    }
  }

  addCodePartialCredit(rule?: CodingRule) {
    const newCode = this.addCode(false);
    if (newCode) {
      newCode.score = 0;
      newCode.label = 'Teilweise Richtig';
      newCode.ruleSets = [{
        ruleOperatorAnd: false,
        rules: []
      }];
      if (rule) newCode.ruleSets[0].rules.push(rule);
      this.codesChanged.emit(this.codes);
    }
  }

  setCodingModelParameter(parameterIndex: number, newValue: string): void {
    if (!this.codeModelParameters) this.codeModelParameters = [];
    while (this.codeModelParameters.length < parameterIndex + 1) this.codeModelParameters.push('');
    this.codeModelParameters[parameterIndex] = newValue;
    this.codeModelParametersChanged.emit(this.codeModelParameters);
  }
}
