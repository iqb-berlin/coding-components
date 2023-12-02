import {Component, OnInit} from '@angular/core';
import {VarCodesDirective} from "../var-codes.directive";
import {TranslateService} from "@ngx-translate/core";

@Component({
  selector: 'var-codes-value-list',
  templateUrl: './var-codes-value-list.component.html',
  styleUrls: ['./var-codes-value-list.component.scss']
})
export class VarCodesValueListComponent extends VarCodesDirective implements OnInit {
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
      newCode.rules = [{
        method: 'MATCH',
        parameters: ['']
      }];
      this.codesChanged.emit(this.codes);
    }
  }

  addCodeNoCredit() {
    const newCode = this.addCode(false);
    if (newCode) {
      newCode.score = 0;
      newCode.label = 'Falsch';
      newCode.rules = [{
        method: 'MATCH',
        parameters: ['']
      }];
      this.codesChanged.emit(this.codes);
    }
  }
}