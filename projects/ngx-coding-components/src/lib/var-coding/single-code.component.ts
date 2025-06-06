import {
  Component, EventEmitter, Input, Output
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatInput } from '@angular/material/input';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconButton } from '@angular/material/button';
import { MatDivider } from '@angular/material/divider';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { CodeData, CodeModelType } from '@iqbspecs/coding-scheme/coding-scheme.interface';
import { VariableInfo } from '@iqbspecs/variable-info/variable-info.interface';
import { SchemerService } from '../services/schemer.service';
import { CodeRulesComponent } from './code-rules/code-rules.component';
import { CodeInstructionComponent } from './code-instruction.component';

@Component({
  selector: 'single-code',
  templateUrl: 'single-code.component.html',
  styles: `
    .code-main-data {
      background-color: whitesmoke;
    }
    .not-unique-id {
      border: orange solid 2px;
    }
    .correct {
      border: limegreen solid 2px;
    }
    .unique-id, .not-correct {
      border: transparent solid 2px;
    }
    .type-residual-auto {
      background: bisque;
      padding: 10px 4px;
    }
    .type-no-residual-auto {
      padding-left: 8px;
    }
    .type-intended-incomplete {
      background: bisque;
      padding: 15px 4px;
    }
  `,
  standalone: true,
  imports: [MatIconButton, MatTooltipModule, MatIcon, MatFormField, MatLabel, MatInput,
    ReactiveFormsModule, FormsModule, TranslateModule, CodeRulesComponent, CodeInstructionComponent,
    MatDivider, MatMenu, MatMenuItem, MatMenuTrigger]
})
export class SingleCodeComponent {
  @Output() codeDataChanged = new EventEmitter<CodeData>();
  @Input() code: CodeData | undefined;
  @Input() allCodes: CodeData[] | undefined;
  @Input() varInfo: VariableInfo | undefined;
  @Input() fragmentMode: boolean | undefined;
  @Input() codeIndex: number | undefined;
  @Input() codeModel: CodeModelType | undefined;
  @Input() hasResidualAutoCode = false;
  @Input() hasIntendedIncompleteAutoCode = false;

  constructor(
    public schemerService: SchemerService
  ) { }

  codeIdIsUnique(codeToValidate: number | 'INTENDED_INCOMPLETE' | 'INVALID', codeIndex?: number): boolean {
    if (!this.allCodes || codeToValidate === 'INVALID' || codeToValidate === 'INTENDED_INCOMPLETE') return true;
    const firstEqualCode = this.allCodes
      .find((c: CodeData, index: number) => index !== codeIndex && c.id === codeToValidate);
    return !firstEqualCode;
  }

  deleteCode(codeIndex?: number) {
    if (this.allCodes && typeof codeIndex !== 'undefined') {
      this.schemerService.deleteCode(this.allCodes, codeIndex);
      this.setCodeChanged();
    }
  }

  setCodeChanged() {
    this.codeDataChanged.emit(this.code);
  }

  setCodeInvalid() {
    if (this.code) {
      this.code.id = 'INVALID';
      this.setCodeChanged();
    }
  }

  setCodeValid() {
    if (this.code && this.allCodes) {
      const hasNullCode = this.allCodes.length > 0 ? !!this.allCodes.find(c => c.id === 0) : false;
      if (hasNullCode) {
        this.code.id = this.allCodes.length > 0 ? Math.max(...this.allCodes
          .filter(c => typeof c.id === 'number').map(c => Number(c.id) || 0)) + 1 : 0;
      } else {
        this.code.id = 0;
      }
      this.setCodeChanged();
    }
  }
}
