import {
  Component, ElementRef, Inject, SecurityContext, ViewChild
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle
} from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { ToTextFactory } from '@iqb/responses';
import {
  OrphanCodingConflict,
  OrphanCodingDecision
} from '../services/orphan-coding-resolution';
import { renderManualInstructionMath } from '../rich-text-editor/manual-instruction-math';

export interface ResolveOrphanCodingsDialogData {
  conflicts: OrphanCodingConflict[];
  canEdit: () => boolean;
}

@Component({
  standalone: true,
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatButton],
  template: `
    <h1 #title mat-dialog-title tabindex="-1">Alte Kodierung übernehmen?</h1>
    <mat-dialog-content #content>
      <p>Konflikt {{ index + 1 }} von {{ data.conflicts.length }}:
        <b>{{ conflict.current.alias || conflict.current.id }}</b></p>
      <p>Zur alten Basisvariable gibt es kein Element mehr.
        Ein aktuelles Element verwendet denselben Namen.</p>
      <dl>
        <dt>Alte technische ID</dt><dd>{{ conflict.previous.id }}</dd>
        <dt>Aktuelle technische ID</dt><dd>{{ conflict.current.id }}</dd>
      </dl>
      <p>Bitte prüfe, ob die bisherige Kodierung zum aktuellen Element passt.</p>
      <p>{{ summary }}</p>
      <ul>
        @for (code of codeSummaries; track $index) { <li>{{ code }}</li> }
      </ul>
      <details>
        <summary>Vollständige Kodierung ansehen</summary>
        <h2>Allgemeine Hinweise</h2>
        <div class="instruction" [innerHTML]="instruction(conflict.previous.manualInstruction)"></div>
        <p>Verarbeitung: {{ processing }}</p>
        <p>Kodiermodus: {{ conflict.previous.codeModel }}</p>
        @for (code of conflict.previous.codes || []; track $index) {
          <section class="code-preview">
            <h2>Code {{ code.id }} · Score {{ code.score ?? '–' }} · {{ code.label }}</h2>
            @for (rule of codeDescription(code); track $index) { <p>{{ rule }}</p> }
            <div class="instruction" [innerHTML]="instruction(code.manualInstruction)"></div>
          </section>
        }
        <details>
          <summary>Vollständige Originaldaten</summary>
          <pre>{{ originalData }}</pre>
        </details>
      </details>
      @if (conflict.dependents.length) {
        <aside role="note">
          <b>Abhängige Kodierungen:</b> {{ dependentNames }}.
          Beim Übernehmen werden ihre Quellverweise auf die aktuelle Variable umgestellt.
          Bei „Neu beginnen“ bleiben die Kodierungen mit ihren alten Quellverweisen erhalten.
          Die fehlenden Quellen müssen anschließend im Kodierreiter korrigiert werden.
        </aside>
      }
      <p>Nach beiden Entscheidungen wird die alte Basiskodierung gelöscht.
        Bei „Neu beginnen“ erhält das aktuelle Element eine leere Kodierung.</p>
      @if (!data.canEdit()) {
        <p role="status">Du hast nur Leserechte. Die Kodierungen können nicht verändert werden.</p>
      }
      <p>Alle Entscheidungen werden erst nach dem letzten Konflikt angewendet.
        Abbrechen verwirft die bisherige Auswahl.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Abbrechen</button>
      <button mat-stroked-button [disabled]="!data.canEdit()" (click)="decide('START_EMPTY', $event.detail)">
        Neu beginnen und alte Kodierung löschen
      </button>
      <button mat-raised-button color="primary" [disabled]="!data.canEdit()"
        (click)="decide('TRANSFER', $event.detail)">
        Kodierung übernehmen
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    dl { display: grid; grid-template-columns: auto 1fr; gap: 6px 16px; }
    dd { margin: 0; overflow-wrap: anywhere; }
    h2 { font-size: 16px; margin: 16px 0 8px; }
    aside { background: #fff4d5; padding: 12px; margin: 16px 0; }
    details { margin: 12px 0; }
    summary { cursor: pointer; }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; }
    .instruction { overflow: auto; max-width: 100%; }
    .code-preview { border-top: 1px solid #ddd; margin-top: 12px; }
    mat-dialog-actions { gap: 8px; flex-wrap: wrap; }
    mat-dialog-actions button { height: auto; min-height: 40px; white-space: normal; }
    @media (max-width: 500px) { dl { grid-template-columns: 1fr; } }
  `]
})
export class ResolveOrphanCodingsDialogComponent {
  @ViewChild('title', { read: ElementRef }) private title?: ElementRef<HTMLElement>;
  @ViewChild('content', { read: ElementRef }) private content?: ElementRef<HTMLElement>;
  index = 0;
  private decisions: OrphanCodingDecision[] = [];
  private instructions = new Map<string, string>();
  private completed = false;

  constructor(
    private dialogRef: MatDialogRef<ResolveOrphanCodingsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ResolveOrphanCodingsDialogData,
    private sanitizer: DomSanitizer
  ) {}

  get conflict(): OrphanCodingConflict {
    return this.data.conflicts[this.index];
  }

  get summary(): string {
    const container = document.createElement('template');
    container.innerHTML = this.conflict.previous.manualInstruction || '';
    const text = container.content.textContent?.replace(/\s+/g, ' ').trim() || 'Keine allgemeinen Hinweise';
    return `${text.length > 180 ? `${text.slice(0, 180)}…` : text} · ` +
      `${this.conflict.previous.codes?.length || 0} Codes`;
  }

  get processing(): string {
    return ToTextFactory.processingAsText(
      this.conflict.previous.processing || [], this.conflict.previous.fragmenting
    ) || 'keine';
  }

  get codeSummaries(): string[] {
    return (this.conflict.previous.codes || []).slice(0, 5).map(code => {
      const text = ToTextFactory.codeAsText(code, 'EXTENDED');
      const rules = (text.ruleSetDescriptions || []).join('; ');
      return `Code ${code.id}, Score ${code.score ?? '–'}: ${rules.slice(0, 120)}${rules.length > 120 ? '…' : ''}`;
    });
  }

  get originalData(): string {
    return JSON.stringify(this.conflict.previous, null, 2);
  }

  get dependentNames(): string {
    return this.conflict.dependents.map(coding => coding.alias || coding.id).join(', ');
  }

  // eslint-disable-next-line class-methods-use-this
  codeDescription(code: NonNullable<OrphanCodingConflict['previous']['codes']>[number]): string[] {
    return ToTextFactory.codeAsText(code, 'EXTENDED').ruleSetDescriptions || [];
  }

  instruction(html = ''): string {
    if (!this.instructions.has(html)) {
      const sanitized = this.sanitizer.sanitize(SecurityContext.HTML, html) || '';
      this.instructions.set(html, renderManualInstructionMath(sanitized));
    }
    return this.instructions.get(html) || '';
  }

  decide(decision: OrphanCodingDecision, clickCount = 1): void {
    if (this.completed || clickCount > 1 || !this.data.canEdit()) return;
    this.decisions.push(decision);
    if (this.index + 1 === this.data.conflicts.length) {
      this.completed = true;
      this.dialogRef.close([...this.decisions]);
    } else {
      this.index += 1;
      this.title?.nativeElement.focus();
      if (this.content) this.content.nativeElement.scrollTop = 0;
    }
  }

  cancel(): void {
    if (this.completed) return;
    this.completed = true;
    this.dialogRef.close();
  }
}
