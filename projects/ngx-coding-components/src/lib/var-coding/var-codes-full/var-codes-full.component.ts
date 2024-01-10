import {Component, OnInit} from '@angular/core';
import {VarCodesDirective} from "../var-codes.directive";

@Component({
  selector: 'var-codes-full',
  templateUrl: './var-codes-full.component.html',
  styleUrls: ['./var-codes-full.component.scss']
})
export class VarCodesFullComponent extends VarCodesDirective implements OnInit {
  ngOnInit() {
    this.updateCodeExistences();
  }
}
