import {Component, EventEmitter, Input, Output} from '@angular/core';
import {CodeData} from '@iqb/responses';

@Component({
  selector: 'code-header',
  template: `
    <div  *ngIf="code" class="code-main-data fx-row-start-center">
      <mat-form-field [class]="uniqueNumberValidator(code.id) ? 'unique-id' : 'not-unique-id'" [style.width.px]="80">
        <mat-label>{{'code.id' | translate}}</mat-label>
        <input matInput
               required
               [(ngModel)]="code.id"
               (ngModelChange)="setCodeChanged()"
               type="number">
      </mat-form-field>
      <mat-form-field
        [class]="code.score > 0 ? 'correct' : 'not-correct'"
        [style.width.px]="100">
        <mat-label>{{'code.score' | translate}}</mat-label>
        <input matInput
               type="number"
               required
               [(ngModel)]="code.score"
               (ngModelChange)="setCodeChanged()">
      </mat-form-field>
      <mat-form-field class="fx-flex-fill">
        <mat-label>{{'code.description' | translate}}</mat-label>
        <input matInput
               [placeholder]="'code.description' | translate"
               [(ngModel)]="code.label"
               (ngModelChange)="setCodeChanged()">
      </mat-form-field>
    </div>
  `,
  styles: [
    `
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
    `
  ]
})
export class CodeHeaderComponent {
  @Output() codeDataChanged = new EventEmitter<CodeData>();
  @Input() public code: CodeData | undefined;
  @Input() allCodes: CodeData[] | undefined;

  uniqueNumberValidator(codeToValidate: number | null): boolean {
    if (codeToValidate === null) return false;
    const allCodeIds = this.allCodes ? this.allCodes.map(c => c.id) : [];
    const newArray: number[] = [];
    const notUnique: number[] = [];
    allCodeIds.forEach(u => {
      if (u !== null) {
        if (newArray.indexOf(u) >= 0) {
          notUnique.push(u);
        } else {
          newArray.push(u);
        }
      }
    });
    return notUnique.indexOf(codeToValidate) < 0;
  }

  setCodeChanged() {
    this.codeDataChanged.emit(this.code);
  }

  setCodeInvalid() {
    if (this.code) {
      this.code.id = null;
      this.codeDataChanged.emit(this.code);
    }
  }

  setCodeValid() {
    if (this.code) {
      this.code.id = 1;
      this.codeDataChanged.emit(this.code);
    }
  }
}
