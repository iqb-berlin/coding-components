import {Component, Input} from '@angular/core';
import {Response, ResponseScheme} from '@iqb/responses';
import {MatDialog} from '@angular/material/dialog';
import { ShowCodingResultsComponent } from './show-coding-results.component';

@Component({
  selector: 'schema-checker',
  templateUrl: './scheme-checker.component.html',
  styleUrls: ['./scheme-checker.component.scss']
})
export class SchemeCheckerComponent {
  values: { [Key in string]: string } = {};
  _responseScheme: ResponseScheme | null = null;
  @Input()
  set responseScheme(value: any) {
    this.values = {};
    this._responseScheme = null;
    if (value) {
      if (typeof value === 'string') {
        this._responseScheme = JSON.parse(value);
      } else {
        this._responseScheme = value;
      }
      if (this._responseScheme) {
        this._responseScheme.variableCodings.filter(v => v.sourceType === 'BASE')
          .map(v => v.id)
          .sort()
          .forEach(v => this.values[v] = '')
      }
    }
  }

  constructor(
    private showCodingResultsDialog: MatDialog
  ){}

  updateInputValue(sourceElement: EventTarget | null, targetVariable: string) {
    if (sourceElement) this.values[targetVariable] = (sourceElement as HTMLInputElement).value;
  }

  startEvaluation() {
    if (this._responseScheme) {
      const myValues: Response[] = [];
      this._responseScheme.variableCodings.forEach((cs: { id: string | number; }) => {
        if (this.values[cs.id]) {
          myValues.push(<Response>{
            id: cs.id,
            value: this.values[cs.id],
            status: 'VALUE_CHANGED'
          });
        } else {
          myValues.push(<Response>{
            id: cs.id,
            value: null,
            status: 'UNSET'
          });
        }
      });
      this.showCodingResultsDialog.open(ShowCodingResultsComponent, {
        width: '800px',
        data: this._responseScheme.codeAndScore(myValues)
      });
    }
  }

  protected readonly Object = Object;
}
