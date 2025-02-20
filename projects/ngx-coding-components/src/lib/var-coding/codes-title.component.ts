import {
  Component, EventEmitter, Input, Output
} from '@angular/core';
import { CodeData, ProcessingParameterType } from '@iqb/responses';
import { TranslateModule } from '@ngx-translate/core';
import { MatIcon } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRipple } from '@angular/material/core';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { SchemerService } from '../services/schemer.service';
import { EditProcessingDialogComponent, EditProcessingDialogData } from './dialogs/edit-processing-dialog.component';

@Component({
  selector: 'codes-title',
  template: `
    <div class="fx-row-space-between-start">
      @if (schemerService.userRole !== 'RO') {
        <div class="fx-row-center-center" style="margin-top:10px">
          <h2>{{ 'code.header' | translate }}</h2>
          <div (click)="sortCodes($event)"
               [matTooltip]="'code.prompt.sort' | translate"
               [matTooltipShowDelay]="500"
               class="sort"
               matRipple
               [style.cursor]="'pointer'">
            <mat-icon>swap_vert</mat-icon>
          </div>
        </div>
      } @else {
        <h2>{{ 'code.header' | translate }}</h2>
      }
      <div class="fx-column-start-center">
        <button mat-button [matTooltip]="'processing.prompt' | translate"
                [disabled]="schemerService.userRole === 'RO'"
                (click)="editProcessingAndFragments()">
          <mat-icon>edit</mat-icon>
          {{'processing.prompt' | translate}}
        </button>
        <div class="fx-column-start-start">
          @for (p of processing; track p) {
            <div class="fx-row-center-center" style="font-size: small">
              <mat-icon style="font-size: small; align-content: center;">check</mat-icon>
              <div>{{('processing.' + p) | translate}}</div>
            </div>
          }
          @if (fragmenting) {
            <div style="font-size: small">{{ 'fragmenting.prompt' | translate }}: "{{fragmenting}}"</div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
     .sort {
       margin-left: 20px;
     }
    `
  ],
  standalone: true,
  imports: [MatRipple, MatTooltipModule, MatIcon, TranslateModule, MatButton]
})
export class CodesTitleComponent {
  @Output() processingChanged = new EventEmitter<string[]>();
  @Output() fragmentingChanged = new EventEmitter<string>();
  @Input() codeList: CodeData[] | undefined;
  @Input() fragmenting? = '';
  @Input() processing: ProcessingParameterType[] | undefined;

  constructor(
    public schemerService: SchemerService,
    private editProcessingDialog: MatDialog
  ) {
  }

  sortCodes(event: MouseEvent) {
    if (this.codeList && this.schemerService.userRole !== 'RO') {
      this.schemerService.sortCodes(this.codeList, event.ctrlKey);
    }
  }

  editProcessingAndFragments() {
    if (this.schemerService.userRole !== 'RO') {
      const dialogRef = this.editProcessingDialog.open(EditProcessingDialogComponent, {
        data: {
          fragmenting: this.fragmenting,
          processing: this.processing
        }
      });
      dialogRef.afterClosed().subscribe(dialogResult => {
        if (dialogResult !== false) {
          const dialogResultTyped: EditProcessingDialogData = dialogResult;
          if (this.fragmenting !== dialogResultTyped.fragmenting) {
            this.fragmenting = dialogResultTyped.fragmenting;
            this.fragmentingChanged.emit(this.fragmenting);
          }
          if (this.processing) {
            this.processing.splice(0);
            dialogResultTyped.processing.forEach(p => {
              if (this.processing) this.processing.push(p);
            });
          }
          this.processingChanged.emit(this.processing);
        }
      });
    }
  }
}
