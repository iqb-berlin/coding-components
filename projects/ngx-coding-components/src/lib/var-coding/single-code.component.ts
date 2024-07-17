import {
  Component, EventEmitter, Input, Output
} from '@angular/core';
import { CodeData, VariableInfo } from '@iqb/responses';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatInput } from '@angular/material/input';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatDivider } from '@angular/material/divider';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { CodeModelType } from '@iqb/responses/coding-interfaces';
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
  `,
  standalone: true,
  imports: [MatIconButton, MatTooltip, MatIcon, MatFormField, MatLabel, MatInput,
    ReactiveFormsModule, FormsModule, TranslateModule, CodeRulesComponent, CodeInstructionComponent,
    MatDivider, MatMenu, MatMenuItem, MatMenuTrigger, MatButton]
})
export class SingleCodeComponent {
  @Output() codeDataChanged = new EventEmitter<CodeData>();
  @Input() code: CodeData | undefined;
  @Input() allCodes: CodeData[] | undefined;
  @Input() varInfo: VariableInfo | undefined;
  @Input() fragmentMode: boolean | undefined;
  @Input() codeIndex: number | undefined;
  @Input() codeModel: CodeModelType | undefined;

  constructor(
    public schemerService: SchemerService
  ) { }

  codeIdIsUnique(codeToValidate: number | null, codeIndex?: number): boolean {
    if (!this.allCodes || codeToValidate === null) return true;
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
      this.code.id = null;
      this.setCodeChanged();
    }
  }

  setCodeValid() {
    if (this.code && this.allCodes) {
      const hasNullCode = this.allCodes.length > 0 ? !!this.allCodes.find(c => c.id === 0) : false;
      if (hasNullCode) {
        this.code.id = this.allCodes.length > 0 ? Math.max(...this.allCodes.map(c => c.id || 0)) + 1 : 0;
      } else {
        this.code.id = 0;
      }
      this.setCodeChanged();
    }
  }
}
