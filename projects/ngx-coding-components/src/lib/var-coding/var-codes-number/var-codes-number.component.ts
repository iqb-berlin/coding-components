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
}
