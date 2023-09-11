import {Component, Input, ViewEncapsulation} from '@angular/core';
import {Response} from "@iqb/responses";

@Component({
  selector: 'iqb-schemer',
  templateUrl: './schemer.component.html',
  styleUrls: ['./schemer.component.scss'],
  encapsulation: ViewEncapsulation.ShadowDom
})
export class SchemerComponent {
  showCode = true;
  @Input('showCode')
  set showCodeStr(value: string) {
    this.showCode = value === 'true';
  }
  showScore = true;
  @Input('showScore')
  set showScoreStr(value: string) {
    this.showScore = value === 'true';
  }
  data: Response[] = [];
  set responses (value: Response[]) {
    this.data = value || [];
  }
  @Input('data')
  set dataStr(value: string) {
    this.data = value ? JSON.parse(value) : [];
  }
}
