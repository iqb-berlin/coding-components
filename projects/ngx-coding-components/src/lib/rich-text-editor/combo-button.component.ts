import {
  Component, EventEmitter, Input, Output
} from '@angular/core';
import { MatActionList, MatListItem } from '@angular/material/list';
import { CdkOverlayOrigin, CdkConnectedOverlay } from '@angular/cdk/overlay';
import { MatInput } from '@angular/material/input';

import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIconButton } from '@angular/material/button';

@Component({
  selector: 'aspect-combo-button',
  template: `
    <div class="root-panel"
      [style.background-color]="inputType === 'color' ? selectedValue : isActive ? 'lightgrey' : 'unset'">
      <button class="apply-button" mat-icon-button [matTooltip]="tooltip"
        (click)="applySelection.emit()">
        <mat-icon>{{icon}}</mat-icon>
      </button>

      @if (inputType == 'color') {
        <button class="select-trigger-button" type="button" (click)="input.click()">
          <svg viewBox="0 0 24 24" width="24px" height="24px" focusable="false" aria-hidden="true">
            <path d="M7 10l5 5 5-5z"></path>
          </svg>
        </button>
        <input matInput type="color" #input hidden
          (input)="selectionChanged.emit($any($event.target).value); applySelection.emit()">
      }

      @if (inputType == 'list') {
        <button class="select-trigger-button" type="button" cdkOverlayOrigin #trigger="cdkOverlayOrigin"
          (click)="isOpen = !isOpen">
          <svg viewBox="0 0 24 24" width="24px" height="24px" focusable="false" aria-hidden="true">
            <path d="M7 10l5 5 5-5z"></path>
          </svg>
        </button>
        <ng-template cdkConnectedOverlay
          [cdkConnectedOverlayOrigin]="trigger"
          [cdkConnectedOverlayOpen]="isOpen"
          (overlayOutsideClick)="isOpen = false">
          <mat-action-list class="list-box">
            @for (value of availableValues; track value) {
              <button
              mat-list-item (click)="selectValue(value)">{{value}}</button>
            }
          </mat-action-list>
        </ng-template>
      }
    </div>
    `,
  styles: [`
    .root-panel {
      display: flex;
      flex-direction: row;
      border: 1px solid;
      border-radius: 5px;
    }
    mat-select {
      margin-top: 20%;
    }
    .list-box {
      background-color: white;
    }
    .select-trigger-button {
      width: 24px;
      border: unset;
      background-color: unset;
      padding: unset;
    }
    .apply-button {
      height: 42px;
      padding-top: 9px;
    }
  `
  ],
  standalone: true,
  imports: [
    MatIconButton, MatTooltip, MatIcon, MatInput, CdkOverlayOrigin, CdkConnectedOverlay, MatActionList, MatListItem]
})
export class ComboButtonComponent {
  @Input() inputType!: 'color' | 'list';
  @Input() selectedValue!: string;
  @Input() availableValues: string[] | undefined;
  @Input() tooltip!: string;
  @Input() icon!: string;
  @Input() isActive: boolean = false;
  @Output() applySelection = new EventEmitter<void>();
  @Output() selectionChanged = new EventEmitter<string>();
  isOpen: boolean = false;

  selectValue(value: string) {
    this.selectionChanged.emit(value);
    this.isOpen = false;
  }
}
