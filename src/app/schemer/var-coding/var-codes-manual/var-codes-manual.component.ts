import { Component } from '@angular/core';
import {VarCodesDirective} from "../var-codes.directive";

@Component({
  selector: 'var-codes-manual',
  templateUrl: './var-codes-manual.component.html',
  styleUrls: ['./var-codes-manual.component.scss']
})
export class VarCodesManualComponent extends VarCodesDirective {}
