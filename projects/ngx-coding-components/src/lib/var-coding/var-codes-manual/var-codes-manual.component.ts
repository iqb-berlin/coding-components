import {Component, OnInit} from '@angular/core';
import {VarCodesDirective} from "../var-codes.directive";
import {TranslateService} from "@ngx-translate/core";

@Component({
  selector: 'var-codes-manual',
  templateUrl: './var-codes-manual.component.html',
  styleUrls: ['./var-codes-manual.component.scss']
})
export class VarCodesManualComponent extends VarCodesDirective implements OnInit {
  constructor(
    public translateService: TranslateService
  ) {
    super();
  }

  ngOnInit() {
    this.updateCodeExistences();
  }
}
