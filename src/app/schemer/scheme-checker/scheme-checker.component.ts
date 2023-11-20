import {Component, Input} from '@angular/core';
import {Response, CodingScheme} from '@iqb/responses';
import {MatDialog} from '@angular/material/dialog';
import { ShowCodingResultsComponent } from './show-coding-results.component';

@Component({
  selector: 'schema-checker',
  templateUrl: './scheme-checker.component.html',
  styleUrls: ['./scheme-checker.component.scss']
})
export class SchemeCheckerComponent {
  values: { [Key in string]: string } = {};
  _codingScheme: CodingScheme | null = null;
  @Input()
  set codingScheme(value: any) {
    this.values = {};
    this._codingScheme = null;
    if (value) {
      if (typeof value === 'string') {
        this._codingScheme = JSON.parse(value);
      } else {
        this._codingScheme = value;
      }
      if (this._codingScheme) {
        this._codingScheme.variableCodings.filter(v => v.sourceType === 'BASE')
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
    if (this._codingScheme) {
      const myValues: Response[] = [];
      this._codingScheme.variableCodings.forEach((cs: { id: string | number; }) => {
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
        data: this._codingScheme.code(myValues)
      });
    }
  }

  protected readonly Object = Object;
}
