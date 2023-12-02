import { Component, Input } from '@angular/core';
import { ResponseData } from '@iqb/responses';

@Component({
  selector: 'iqb-response-list',
  template: `
    <div class="response-list">
      <div class="response-row" [style.grid-template-columns]="'2fr 5fr 2fr' + (showCode ? ' 1fr' : '') + (showScore ? ' 1fr' : '')">
        <div>Variable</div>
        <div>Wert</div>
        <div>Status</div>
        <div *ngIf="showCode" class="centered-column">Code</div>
        <div *ngIf="showScore" class="centered-column">Bew.</div>
      </div>
      <div class="response-row"
           [style.grid-template-columns]="'2fr 5fr 2fr' + (showCode ? ' 1fr' : '') + (showScore ? ' 1fr' : '')"
           *ngFor="let rd of data">
        <div>{{rd.id}}</div>
        <div>{{rd.value}}</div>
        <div>{{rd.status}}: {{rd.status}}</div>
        <div *ngIf="showCode" class="centered-column">{{rd.code || rd.code === 0 ? rd.code : '-'}}</div>
        <div *ngIf="showScore" class="centered-column">{{rd.score || rd.score === 0 ? rd.score : '-'}}</div>
      </div>
    </div>`,
  styles: [
    '.response-list .response-row {display: grid; grid-template-rows: auto; column-gap: 10px}',
    '.response-list .result-entry:nth-child(even) {background-color: #f1f1f1;}',
    '.centered-column {text-align: center}'
  ]
})
export class ResponseListComponent {
  @Input() showCode = true;
  @Input() showScore = true;
  @Input() data: ResponseData[] = [];
}
