import { Component, Input } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatInput } from '@angular/material/input';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { CodingScheme } from '@iqbspecs/coding-scheme/coding-scheme.interface';
import { Response } from '@iqbspecs/response/response.interface';
import { CodingSchemeFactory } from '@iqb/responses';
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
  set codingScheme(value: CodingScheme | null) {
    this.values = {};
    this._codingScheme = value;
    if (this._codingScheme) {
      this._codingScheme.variableCodings
        .filter(v => v.sourceType === 'BASE')
        .map(v => v.alias || v.id)
        .sort()
        // eslint-disable-next-line no-return-assign
        .forEach(v => (this.values[v] = ''));
    }
  }

  constructor(private showCodingResultsDialog: MatDialog) {}

  private static parseInputValue(raw: string): string | unknown[] {
    const trimmed = (raw || '').trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        // fall back to string
      }
    }
    return trimmed;
  }

  updateInputValue(sourceElement: EventTarget | null, targetVariable: string) {
    if (sourceElement) this.values[targetVariable] = (sourceElement as HTMLInputElement).value;
  }

  startEvaluation() {
    if (this._codingScheme) {
      const myValues: Response[] = [];
      this._codingScheme.variableCodings.forEach(cs => {
        if (this.values[cs.alias || cs.id]) {
          myValues.push(<Response>{
            id: cs.id,
            value: SchemeCheckerComponent.parseInputValue(
              this.values[cs.alias || cs.id]
            ),
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
      const varsWithCodes: string[] = this._codingScheme.variableCodings
        .filter(v => v.codes.length > 0)
        .map(v => v.id);
      this.showCodingResultsDialog.open(ShowCodingResultsComponent, {
        width: '800px',
        height: '600px',
        data: {
          responses: CodingSchemeFactory.code(
            myValues,
            this._codingScheme.variableCodings
          ),
          varsWithCodes: varsWithCodes,
          variableCodings: this._codingScheme.variableCodings
        }
      });
    }
  }

  protected readonly Object = Object;
  protected readonly JSON = JSON;
}
