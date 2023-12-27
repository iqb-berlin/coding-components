import {Component, OnInit} from '@angular/core';
import {VarCodesDirective} from "../var-codes.directive";
import {TranslateService} from "@ngx-translate/core";
import {CodeData, CodingRule, RuleSet} from "@iqb/responses";

@Component({
  selector: 'var-codes-choice',
  templateUrl: './var-codes-choice.component.html',
  styleUrls: ['./var-codes-choice.component.scss']
})
export class VarCodesChoiceComponent extends VarCodesDirective implements OnInit {
  constructor(
    public translateService: TranslateService
  ) {
    super();
  }

  ngOnInit() {
    this.updateCodeExistences();
  }

  addCodeChoice(): CodeData | null {
    if (this.codes) {
      const myCodeIds = this.codes.map(c => c.id || 0);
      const newCodeId = myCodeIds.length > 0 ? Math.max(...myCodeIds) + 1 : 1;
      let newCode: CodeData | undefined = undefined;
      const trueCodeExists = !!this.codes.find(c => c.score > 0);
      if (!trueCodeExists) {
        newCode = <CodeData>{
          id: newCodeId,
          label: '',
          score: 1,
          ruleSetOperatorAnd: false,
          ruleSets: [<RuleSet>{
            ruleOperatorAnd: true,
            rules: [<CodingRule>{
              method: 'MATCH',
              parameters: ['']
            }]
          }],
          manualInstruction: ''
        };
      } else if (!this.elseCodeExists) {
        newCode = <CodeData>{
          id: newCodeId,
          label: '',
          score: 0,
          ruleSetOperatorAnd: false,
          ruleSets: [<RuleSet>{
            ruleOperatorAnd: false,
            rules: [<CodingRule>{
              method: 'ELSE'
            }]
          }],
          manualInstruction: ''
        };
      }
      if (newCode) {
        this.codes.push(newCode);
        this.codesChanged.emit(this.codes);
        this.updateCodeExistences();
        return newCode;
      }
    }
    return null;
  }
}
