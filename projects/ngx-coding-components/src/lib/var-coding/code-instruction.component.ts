import {
  Component, EventEmitter, Input, Output
} from '@angular/core';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatIcon } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconButton } from '@angular/material/button';
import { MatCard, MatCardSubtitle, MatCardContent } from '@angular/material/card';
import { CodeData } from '@iqbspecs/coding-scheme/coding-scheme.interface';
import { RichTextEditDialogComponent } from '../rich-text-editor/rich-text-edit-dialog.component';
import { UserRoleType } from '../services/schemer.service';

@Component({
  selector: 'code-instruction',
  template: `
    @if (code) {
      <mat-card [style.padding-left.px]="12" [style.height.%]="100">
        <mat-card-subtitle class="hover-area">
          <div class="fx-row-space-between-center">
            <div class="fx-row-start-center">
              <div
                [style.color]="'grey'"
                [style.font-size]="'smaller'">
                {{'manual-instruction.code.title' | translate}}
              </div>
              <button mat-icon-button
                      [matTooltip]="'manual-instruction.code.prompt-edit' | translate"
                      [disabled]="userRole === 'RO'"
                      (click)="editTextDialog_manualInstruction()">
                <mat-icon>
                  edit
                </mat-icon>
              </button>
              @if ((hasResidualAutoCode) && code.manualInstruction) {
                <mat-icon [style.color]="'red'"
                          [matTooltip]="'manual-instruction.code.error-residual-auto' | translate">
                  error
                </mat-icon>
              }
              @if ((hasIntendedIncompleteCode) && code.manualInstruction) {
                <mat-icon [style.color]="'red'"
                          [matTooltip]="'manual-instruction.code.error-intended-incomplete' | translate">
                  error
                </mat-icon>
              }
            </div>
            @if (code.manualInstruction) {
              <button mat-icon-button
                      (click)="wipeInstructions()" class="wipe-button"
                      [disabled]="userRole === 'RO'"
                      [matTooltip]="'manual-instruction.code.wipe' | translate"
                      [matTooltipShowDelay]="500">
                <mat-icon>
                  close
                </mat-icon>
              </button>
            }
          </div>
        </mat-card-subtitle>
        <mat-card-content
          [style.overflow-x]="'auto'">
          <div [innerHTML]="code ? getSanitizedText(code.manualInstruction) : null"></div>
        </mat-card-content>
      </mat-card>
    }
    `,
  styles: [
    `
      .hover-area .wipe-button {
        visibility: hidden;
      }
      .hover-area:hover .wipe-button {
        visibility: visible;
      }
    `
  ],
  standalone: true,
  imports: [MatCard, MatCardSubtitle, MatIconButton, MatTooltipModule, MatIcon, MatCardContent, TranslateModule]
})
export class CodeInstructionComponent {
  @Output() codeDataChanged = new EventEmitter<CodeData>();
  @Input() code: CodeData | undefined;
  @Input() userRole: UserRoleType = 'RO';
  @Input() hasIntendedIncompleteCode = false;
  @Input() hasResidualAutoCode = false;

  constructor(
    private sanitizer: DomSanitizer,
    public translateService: TranslateService,
    public editTextDialog: MatDialog
  ) { }

  editTextDialog_manualInstruction(): void {
    if (this.code) {
      const dialogRef = this.editTextDialog.open(RichTextEditDialogComponent, {
        width: '1100px',
        data: {
          title: this.translateService.instant('manual-instruction.code.prompt-edit'),
          content: this.code.manualInstruction || '',
          defaultFontSize: 20,
          editorHeightPx: 400
        },
        autoFocus: false
      });
      dialogRef.afterClosed().subscribe(dialogResult => {
        if (typeof dialogResult !== 'undefined') {
          if (dialogResult !== false && this.code) {
            this.code.manualInstruction = dialogResult;
            this.codeDataChanged.emit(this.code);
          }
        }
      });
    }
  }

  wipeInstructions() {
    if (this.code) {
      this.code.manualInstruction = '';
      this.codeDataChanged.emit(this.code);
    }
  }

  getSanitizedText(text: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(text);
  }
}
