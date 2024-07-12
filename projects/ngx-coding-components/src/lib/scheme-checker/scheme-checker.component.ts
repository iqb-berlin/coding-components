import { Component, Input } from '@angular/core';
import { Response, CodingScheme } from '@iqb/responses';
import { MatDialog } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatInput } from '@angular/material/input';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { ShowCodingResultsComponent } from './show-coding-results.component';

@Component({
  selector: 'scheme-checker',
  templateUrl: './scheme-checker.component.html',
  styleUrls: ['./scheme-checker.component.scss'],
  standalone: true,
  imports: [MatFormField, MatLabel, MatInput, MatButton]
})
export class SchemeCheckerComponent {
  values: { [Key in string]: string } = {};
  _codingScheme: CodingScheme | null = null;
  @Input()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set codingScheme(value: CodingScheme | null) {
    this.values = {};
    this._codingScheme = value;
    if (this._codingScheme) {
      this._codingScheme.variableCodings.filter(v => v.sourceType === 'BASE')
        .map(v => v.id)
        .sort()
        // eslint-disable-next-line no-return-assign
        .forEach(v => this.values[v] = '');
    }
  }

  constructor(
    private showCodingResultsDialog: MatDialog
  ) {}

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
            status: 'VALUE_CHANGED'
          });
        } else if (cs.sourceType === 'BASE') {
          myValues.push(<Response>{
            id: cs.id,
            value: '',
            status: 'DISPLAYED'
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
