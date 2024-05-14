import {Component, Input} from '@angular/core';
import {Response, CodingScheme} from '@iqb/responses';
import {MatDialog} from '@angular/material/dialog';
import { ShowCodingResultsComponent } from './show-coding-results.component';
import { MatButton } from '@angular/material/button';
import { MatInput } from '@angular/material/input';
import { MatFormField, MatLabel } from '@angular/material/form-field';


@Component({
    selector: 'schema-checker',
    templateUrl: './scheme-checker.component.html',
    styleUrls: ['./scheme-checker.component.scss'],
    standalone: true,
    imports: [MatFormField, MatLabel, MatInput, MatButton]
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
      this._codingScheme.variableCodings.forEach(cs => {
        if (this.values[cs.id]) {
          myValues.push(<Response>{
            id: cs.id,
            value: this.values[cs.id],
            state: 'VALUE_CHANGED'
          });
        } else if (cs.sourceType === 'BASE') {
          myValues.push(<Response>{
            id: cs.id,
            value: '',
            state: 'DISPLAYED'
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
