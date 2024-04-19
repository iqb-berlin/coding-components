import {Component, EventEmitter, Input, Output} from '@angular/core';
import {CodeData} from '@iqb/responses';
import { TranslateModule } from '@ngx-translate/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatInput } from '@angular/material/input';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIconButton } from '@angular/material/button';


@Component({
    selector: 'code-header',
    template: `
    @if (code) {
      <div  class="code-main-data fx-row-start-center">
        @if (code.id === null) {
          <div class="fx-flex-fill" [style.padding-left.px]="8">
            <p>{{'code.is-null' | translate}}</p>
          </div>
          @if (enableSwitchNull) {
            <button mat-icon-button [style.width.px]="50"
              (click)="setCodeValid()"
              [matTooltip]="'code.make-not-null' | translate">
              <mat-icon>do_not_disturb_off</mat-icon></button>
            }
          }
          @if (code.id !== null) {
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
            @if (enableSwitchNull) {
              <button mat-icon-button [style.width.px]="50"
                (click)="setCodeInvalid()"
                [matTooltip]="'code.make-null' | translate">
                <mat-icon>do_not_disturb_on</mat-icon></button>
              }
            }
          </div>
        }
    `,
    styles: [
        `
      .code-main-data {
        background-color: whitesmoke;
      }
    `
    ],
    standalone: true,
    imports: [MatIconButton, MatTooltip, MatIcon, MatFormField, MatLabel, MatInput, ReactiveFormsModule, FormsModule, TranslateModule]
})
export class CodeHeaderComponent {
  @Output() codeDataChanged = new EventEmitter<CodeData>();
  @Input() public code: CodeData | undefined;
  @Input() allCodes: CodeData[] | undefined;
  @Input() enableSwitchNull: boolean = true;

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
