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
}
