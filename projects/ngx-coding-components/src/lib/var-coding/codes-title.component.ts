import {Component, EventEmitter, Input, Output} from '@angular/core';
import {CodeData} from '@iqb/responses';

@Component({
  selector: 'codes-title',
  template: `
    <div class="fx-row-start-center fx-gap-5 hover-icon" (click)="sortCodes()"
         matRipple [style.cursor]="'pointer'">
      <h3 [matTooltip]="'code.prompt.sort' | translate" [matTooltipShowDelay]="500">{{'code.header' | translate}}</h3>
      <mat-icon [matTooltip]="'code.prompt.sort' | translate" [matTooltipShowDelay]="500">swap_vert</mat-icon>
    </div>
  `,
  styles: [
    `
      .hover-icon mat-icon {
        visibility: hidden;
      }
      .hover-icon:hover mat-icon {
        visibility: visible;
      }
    `
  ]
})
export class CodesTitleComponent {
  @Output() codesChanged = new EventEmitter();
  @Input() public codeList: CodeData[] | undefined;

  sortCodes() {
    if (this.codeList && this.codeList.length > 1) {
      console.log(this.codeList.length, '1');
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
      console.log(this.codeList.length, '2');
      nullCodes.forEach(c => {
        if (this.codeList) this.codeList.push(c)
      });
      console.log(this.codeList.length, '3');
      this.codesChanged.emit();
    }
  }
}
