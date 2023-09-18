import {Component, Inject} from '@angular/core';
import {Response, ResponseScheme} from '@iqb/responses';
import {MAT_DIALOG_DATA, MatDialog} from '@angular/material/dialog';
import { ShowCodingResultsComponent } from './show-coding-results.component';

@Component({
  selector: 'schema-checker',
  templateUrl: './scheme-checker.component.html',
  styleUrls: ['./scheme-checker.component.scss']
})
export class SchemeCheckerComponent {
  values: { [Key in string]: string } = {};

  constructor(
    private showCodingResultsDialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: ResponseScheme
  ) { }

  getBaseVariableIds(): string[] {
    return this.data.variableCodings.filter(v => v.sourceType === 'BASE')
        .map(v => v.id)
        .sort()
  }
  updateInputValue(sourceElement: EventTarget | null, targetVariable: string) {
    if (sourceElement) this.values[targetVariable] = (sourceElement as HTMLInputElement).value;
  }

  startEvaluation() {
    const myValues: Response[] = [];
    this.data.variableCodings.forEach((cs: { id: string | number; }) => {
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
      data: this.data.codeAndScore(myValues)
    });
  }
}
