import {Component, EventEmitter, Input, Output} from '@angular/core';
import {CodeData} from '@iqb/responses';

@Component({
  selector: 'code-header',
  template: `
    <div  *ngIf="code" class="code-main-data fx-row-start-center">
      <ng-container *ngIf="code.id === null">
        <div class="fx-flex-fill" [style.padding-left.px]="8">
          <p>{{'code.is-null' | translate}}</p>
        </div>
        <button mat-icon-button [style.width.px]="50" *ngIf="enableSwitchNull"
                (click)="setCodeValid()"
                [matTooltip]="'code.make-not-null' | translate">
          <mat-icon>do_not_disturb_off</mat-icon></button>
      </ng-container>
      <ng-container *ngIf="code.id !== null">
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
        <button mat-icon-button [style.width.px]="50" *ngIf="enableSwitchNull"
                (click)="setCodeInvalid()"
                [matTooltip]="'code.make-null' | translate">
          <mat-icon>do_not_disturb_on</mat-icon></button>
      </ng-container>
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
