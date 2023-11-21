import { Component } from '@angular/core';
import {CodeData} from "@iqb/responses";
import {VarCodesDirective} from "../var-codes.directive";

@Component({
  selector: 'var-codes-full',
  templateUrl: './var-codes-full.component.html',
  styleUrls: ['./var-codes-full.component.scss']
})
export class VarCodesFullComponent extends VarCodesDirective {
  addCode() {
    if (this.codes) {
      this.codes.push({
        id: 1,
        label: '',
        score: 0,
        rules: [],
        manualInstruction: ''
      });
      this.codesChanged.emit(this.codes);
    }
  }

  deleteCode(codeToDeleteId: number) {
    if (this.codes) {
      let codePos = -1;
      this.codes.forEach((c: CodeData, i: number) => {
        if (c.id === codeToDeleteId) codePos = i;
      });
      if (codePos >= 0) this.codes.splice(codePos, 1);
      this.codesChanged.emit(this.codes);
    }
  }
}
