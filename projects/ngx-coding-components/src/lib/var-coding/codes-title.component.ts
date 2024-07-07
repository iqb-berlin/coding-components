import {
  Component, EventEmitter, Input, Output
} from '@angular/core';
import { CodeData, ProcessingParameterType } from '@iqb/responses';
import { TranslateModule } from '@ngx-translate/core';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatRipple } from '@angular/material/core';
import { MatLabel } from '@angular/material/form-field';
import { MatIconButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { SchemerService } from '../services/schemer.service';
import { EditProcessingDialogComponent, EditProcessingDialogData } from './dialogs/edit-processing-dialog.component';

@Component({
  selector: 'codes-title',
  template: `
    <div class="fx-row-space-between-start">
      <div (click)="sortCodes()"
           [matTooltip]="'code.prompt.sort' | translate"
           [matTooltipShowDelay]="500"
           class="fx-row-start-center fx-gap-5"
           matRipple
           [style.cursor]="'pointer'">
        <h2>{{ 'code.header' | translate }}</h2>
        <mat-icon>swap_vert</mat-icon>
      </div>
      <div class="fx-row-start-start">
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
        <button mat-icon-button [matTooltip]="'processing.prompt' | translate"
                [disabled]="schemerService.userRole !== 'RW_MAXIMAL'"
                (click)="editProcessingAndFragments()">
          <mat-icon>edit</mat-icon>
        </button>
      </div>
    </div>
  `,
  standalone: true,
  imports: [MatRipple, MatTooltip, MatIcon, TranslateModule, MatLabel, MatIconButton]
})
export class CodesTitleComponent {
  @Output() codesChanged = new EventEmitter();
  @Input() codeList: CodeData[] | undefined;
  @Input() fragmenting? = '';
  @Input() processing: ProcessingParameterType[] | undefined;

  constructor(
    public schemerService: SchemerService,
    private editProcessingDialog: MatDialog
  ) {
  }

  sortCodes() {
    if (this.codeList && this.codeList.length > 1) {
      let allCodeIds: number[] = [];
      this.codeList.forEach(c => {
        if (c.id !== null && allCodeIds.indexOf(c.id) < 0) allCodeIds.push(c.id);
      });
      const nullCodes = this.codeList.filter(c => c.id === null);
      const newCodeList: CodeData[] = [];
      allCodeIds = allCodeIds.sort();
      allCodeIds.forEach(cId => {
        const codes = this.codeList ? this.codeList.filter(c => c.id === cId) : [];
        codes.forEach(c => newCodeList.push(c));
      });
      this.codeList.splice(0, this.codeList.length);
      newCodeList.forEach(c => {
        if (this.codeList) this.codeList.push(c);
      });
      nullCodes.forEach(c => {
        if (this.codeList) this.codeList.push(c);
      });
      this.codesChanged.emit();
    }
  }

  editProcessingAndFragments() {
    if (this.schemerService.userRole === 'RW_MAXIMAL') {
      const dialogRef = this.editProcessingDialog.open(EditProcessingDialogComponent, {
        data: {
          fragmenting: this.fragmenting,
          processing: this.processing
        }
      });
      dialogRef.afterClosed().subscribe(dialogResult => {
        if (dialogResult !== false) {
          const dialogResultTyped: EditProcessingDialogData = dialogResult;
          this.fragmenting = dialogResultTyped.fragmenting;
          if (this.processing) {
            this.processing.splice(0);
            dialogResultTyped.processing.forEach(p => {
              if (this.processing) this.processing.push(p);
            });
          }
          this.codesChanged.emit();
        }
      });
    }
  }
}
