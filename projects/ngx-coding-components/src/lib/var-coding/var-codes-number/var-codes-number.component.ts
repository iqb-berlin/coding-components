import {Component, OnInit} from '@angular/core';
import {VarCodesDirective} from "../var-codes.directive";
import {TranslateService} from "@ngx-translate/core";

@Component({
  selector: 'var-codes-number',
  templateUrl: './var-codes-number.component.html',
  styleUrls: ['./var-codes-number.component.scss']
})
export class VarCodesNumberComponent extends VarCodesDirective implements OnInit {
  constructor(
    public translateService: TranslateService
  ) {
    super();
  }

  ngOnInit() {
    this.updateCodeExistences();
  }

  addCodeCredit() {
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
      this.codesChanged.emit(this.codes);
    }
  }

  addCodeNoCredit() {
    const newCode = this.addCode(false);
    if (newCode) {
      newCode.score = 0;
      newCode.label = 'Falsch';
      newCode.ruleSets = [{
        ruleOperatorAnd: false,
        rules: []
      }];
      this.codesChanged.emit(this.codes);
    }
  }
}
