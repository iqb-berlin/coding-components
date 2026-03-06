import {
  AfterViewInit,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  Inject,
  ViewChild
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogContent,
  MatDialogTitle,
  MatDialogActions,
  MatDialogClose
} from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import '@iqb/mathlive';
import katex from 'katex';

type MathfieldElementLike = HTMLElement & {
  value: string;
  focus: () => void;
};

export interface FormulaEditDialogData {
  title: string;
  latex: string;
}

@Component({
  template: `
    <h1 mat-dialog-title>{{ data.title }}</h1>
    <mat-dialog-content class="dialog-content">
      <math-field #mathField (input)="onMathInput($event)"></math-field>
      @if (renderedFormula) {
      <div class="preview" [innerHTML]="renderedFormula"></div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-raised-button [mat-dialog-close]="false">
        {{ 'dialog-cancel' | translate }}
      </button>
      <button
        mat-raised-button
        color="primary"
        [disabled]="!latex.trim()"
        [mat-dialog-close]="latex.trim()"
      >
        {{ 'dialog-save' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .dialog-content {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      math-field {
        min-height: 48px;
        width: 100%;
      }

      .preview {
        border: 1px solid #ccc;
        border-radius: 4px;
        min-height: 48px;
        padding: 8px;
      }
    `
  ],
  standalone: true,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatButton,
    TranslateModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class FormulaEditDialogComponent implements AfterViewInit {
  @ViewChild('mathField') mathFieldRef?: ElementRef<MathfieldElementLike>;
  latex = '';
  renderedFormula: SafeHtml | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: FormulaEditDialogData,
    private sanitizer: DomSanitizer
  ) {
    this.latex = data.latex || '';
    this.updatePreview();
  }

  ngAfterViewInit(): void {
    if (this.mathFieldRef) {
      this.mathFieldRef.nativeElement.value = this.latex;
      this.mathFieldRef.nativeElement.focus();
    }
  }

  onMathInput(event: Event): void {
    const source = event.target as MathfieldElementLike;
    this.latex = source.value || '';
    this.updatePreview();
  }

  private updatePreview(): void {
    if (!this.latex.trim()) {
      this.renderedFormula = null;
      return;
    }

    this.renderedFormula = this.sanitizer.bypassSecurityTrustHtml(
      katex.renderToString(this.latex, {
        output: 'mathml',
        throwOnError: false,
        strict: 'ignore'
      })
    );
  }
}
