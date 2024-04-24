import {Component, EventEmitter, Input, Output} from '@angular/core';
import {CodeData} from '@iqb/responses';
import { TranslateModule } from '@ngx-translate/core';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatRipple } from '@angular/material/core';

@Component({
    selector: 'codes-title',
    template: `
    <div (click)="sortCodes()"
         [matTooltip]="'code.prompt.sort' | translate"
         [matTooltipShowDelay]="500"
         class="fx-row-start-center fx-gap-5"
         matRipple
         [style.cursor]="'pointer'"
         style="display: flex; align-items: center;">
      <h2>{{'code.header' | translate}}</h2>
      <mat-icon>swap_vert</mat-icon>
    </div>
  `,
    standalone: true,
    imports: [MatRipple, MatTooltip, MatIcon, TranslateModule]
})
export class CodesTitleComponent {
  @Output() codesChanged = new EventEmitter();
  @Input() public codeList: CodeData[] | undefined;

  sortCodes() {
    if (this.codeList && this.codeList.length > 1) {
      let allCodeIds: number[] = [];
      this.codeList.forEach(c => {
        if (c.id !== null && allCodeIds.indexOf(c.id) < 0) allCodeIds.push(c.id);
      });
      const nullCodes = this.codeList.filter(c => c.id === null);
      const newCodeList: CodeData[] = [];
      allCodeIds = allCodeIds.sort();
      allCodeIds.forEach(cId => {
        const codes = this.codeList ? this.codeList.filter(c => c.id === cId) : [];
        codes.forEach(c => newCodeList.push(c));
      });
      this.codeList.splice(0, this.codeList.length);
      newCodeList.forEach(c => {
        if (this.codeList) this.codeList.push(c)
      });
      nullCodes.forEach(c => {
        if (this.codeList) this.codeList.push(c)
      });
      this.codesChanged.emit();
    }
  }
}
