import {Component, Input, ViewEncapsulation} from '@angular/core';
import {Response} from "@iqb/responses";

@Component({
  selector: 'iqb-schemer',
  templateUrl: './schemer.component.html',
  styleUrls: ['./schemer.component.scss'],
  encapsulation: ViewEncapsulation.ShadowDom
})
export class SchemerComponent {
  @Input() showCode = true;
  @Input() showScore = true;
  @Input() data: Response[] = [];
}
