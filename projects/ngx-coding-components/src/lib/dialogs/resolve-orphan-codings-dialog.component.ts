import {
  Component, ElementRef, Inject, ViewChild
} from '@angular/core';
import {
  MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle
} from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { ToTextFactory } from '@iqb/responses';
import { VariableCodingData } from '@iqbspecs/coding-scheme/coding-scheme.interface';
import {
  canTransferOrphanCoding, OrphanCodingConflict, OrphanCodingDecision, OrphanCodingResolution
} from '../services/orphan-coding-resolution';

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
      <p>Aktuelle technische ID: {{ conflict.current.id }}</p>
      @if (candidates.length > 1) {
        <p>Es gibt mehrere alte Kodierungen. Prüfe sie einzeln und merke nicht mehr benötigte
          Kodierungen zum Löschen vor. Die letzte kannst du anschließend übernehmen oder ebenfalls verwerfen.</p>
      }
      @for (candidate of conflict.candidates; track candidate.id) {
        <section class="coding-summary">
          <b>Alte technische ID: {{ candidate.id }}</b>
          @if (discardedIds.includes(candidate.id)) {
            <p>Zum Löschen vorgemerkt.</p>
            <button mat-button [disabled]="!data.canEdit()" (click)="restore(candidate.id)">Rückgängig</button>
          } @else {
            <p>{{ summary(candidate) }}</p>
            <ul>
              @for (code of codeSummaries(candidate); track $index) { <li>{{ code }}</li> }
            </ul>
            @if (candidates.length > 1) {
              <button mat-button [disabled]="!data.canEdit()" (click)="discard(candidate.id)">
                Alte Kodierung zum Löschen vormerken
              </button>
            }
          }
        </section>
      }
      @if (conflict.dependents.length) {
        <aside role="note">
          <b>Abhängige Kodierungen:</b> {{ dependentNames }}.
          Beim Übernehmen werden die Quellen der verbleibenden alten Kodierung umgestellt.
          Quellen gelöschter Kodierungen müssen anschließend im Kodierreiter korrigiert werden.
          Prüfe bei Formeln auch die Variablenverweise im Formelausdruck.
        </aside>
      }
      @if (canTransfer) {
        <p>„Kodierung übernehmen“ überträgt die verbleibende alte Kodierung auf das aktuelle Element.</p>
      } @else if (candidates.length === 1) {
        <p>Diese alte Kodierung kann nicht auf das aktuelle Element übertragen werden.
          Textelemente ohne Antwortwert bleiben deaktiviert.</p>
      }
      <p>„Neu beginnen“ setzt den Schemaeintrag des aktuellen Elements auf seine Standardwerte zurück
        und löscht die alten Basiskodierungen.</p>
      @if (!data.canEdit()) {
        <p role="status">Du hast nur Leserechte. Die Kodierungen können nicht verändert werden.</p>
      }
      <p>Alle Entscheidungen und vorgemerkten Löschungen werden erst nach dem letzten Konflikt angewendet.
        Abbrechen verwirft die bisherige Auswahl.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Abbrechen</button>
      <button mat-stroked-button [disabled]="!data.canEdit() || candidates.length !== 1"
        (click)="decide('START_EMPTY', $event.detail)">Neu beginnen und alte Kodierung löschen</button>
      <button mat-raised-button color="primary" [disabled]="!data.canEdit() || !canTransfer"
        (click)="decide('TRANSFER', $event.detail)">Kodierung übernehmen</button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; max-height: 95vh; }
    mat-dialog-content { min-height: 0; flex: 1 1 auto; }
    .coding-summary { border-top: 1px solid #ddd; padding-top: 12px; overflow-wrap: anywhere; }
    aside { background: #fff4d5; padding: 12px; margin: 16px 0; }
    mat-dialog-actions { gap: 8px; flex-wrap: wrap; flex-shrink: 0; }
    mat-dialog-actions button { height: auto; min-height: 40px; white-space: normal; }
  `]
})
export class ResolveOrphanCodingsDialogComponent {
  @ViewChild('title', { read: ElementRef }) private title?: ElementRef<HTMLElement>;
  @ViewChild('content', { read: ElementRef }) private content?: ElementRef<HTMLElement>;
  index = 0;
  discardedIds: string[] = [];
  private decisions: OrphanCodingDecision[] = [];
  private completed = false;

  constructor(
    private dialogRef: MatDialogRef<ResolveOrphanCodingsDialogComponent, OrphanCodingResolution>,
    @Inject(MAT_DIALOG_DATA) public data: ResolveOrphanCodingsDialogData
  ) {}

  get conflict(): OrphanCodingConflict {
    return this.data.conflicts[this.index];
  }

  get candidates(): VariableCodingData[] {
    return this.conflict.candidates.filter(candidate => !this.discardedIds.includes(candidate.id));
  }

  get canTransfer(): boolean {
    return this.candidates.length === 1 && canTransferOrphanCoding(this.candidates[0], this.conflict.current);
  }

  // eslint-disable-next-line class-methods-use-this
  summary(coding: VariableCodingData): string {
    const container = document.createElement('template');
    container.innerHTML = coding.manualInstruction || '';
    const text = container.content.textContent?.replace(/\s+/g, ' ').trim() || 'Keine allgemeinen Hinweise';
    return `${text.length > 180 ? `${text.slice(0, 180)}…` : text} · ${coding.codes?.length || 0} Codes`;
  }

  // eslint-disable-next-line class-methods-use-this
  codeSummaries(coding: VariableCodingData): string[] {
    return (coding.codes || []).slice(0, 5).map(code => {
      const text = ToTextFactory.codeAsText(code, 'EXTENDED');
      const rules = (text.ruleSetDescriptions || []).join('; ');
      const container = document.createElement('template');
      container.innerHTML = code.manualInstruction || '';
      const instruction = container.content.textContent?.replace(/\s+/g, ' ').trim() || '';
      const description = [rules, instruction].filter(Boolean).join(' · ');
      return `Code ${code.id}, Score ${code.score ?? '–'}: ` +
        `${description.slice(0, 120)}${description.length > 120 ? '…' : ''}`;
    });
  }

  get dependentNames(): string {
    return this.conflict.dependents.map(coding => coding.alias || coding.id).join(', ');
  }

  discard(id: string): void {
    if (!this.completed && this.data.canEdit() && this.candidates.length > 1 &&
      this.candidates.some(candidate => candidate.id === id)) this.discardedIds.push(id);
  }

  restore(id: string): void {
    if (!this.completed && this.data.canEdit()) {
      this.discardedIds = this.discardedIds.filter(candidate => candidate !== id);
    }
  }

  decide(decision: OrphanCodingDecision, clickCount = 1): void {
    if (this.completed || clickCount > 1 || !this.data.canEdit() || this.candidates.length !== 1) return;
    if (decision === 'TRANSFER' && !this.canTransfer) return;
    this.decisions.push(decision);
    if (this.index + 1 === this.data.conflicts.length) {
      this.completed = true;
      this.dialogRef.close({ decisions: [...this.decisions], discardedIds: [...this.discardedIds] });
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
